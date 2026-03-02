// src/lib/engine/wsm.ts
import type { Option, Criterion } from '../stores/decisionStore';

/**
 * Normalizes raw option scores to a standard 0-1 scale.
 * * @param options - The array of options containing raw scores.
 * @param criteria - The array of criteria to check the isCost polarity flag.
 * @returns A dictionary mapping option IDs to their new normalized score dictionaries.
 */

// Helper type to match the store structure
type ScoreValue = number | { min: number; max: number };

/**
 * Translates a flexible ScoreValue (number or range) into a single 
 * mathematical expected value for the WSM engine.
 */
export function getExpectedValue(val: ScoreValue | undefined): number | undefined {
    if (val === undefined || val === null) {
        return undefined;
    }
    
    // If it's already a standard number, just return it
    if (typeof val === 'number') {
        return val;
    }
    
    // If it's a range object, calculate the expected value (the average)
    return (val.min + val.max) / 2;
}


export function normalizeScores(options: Option[], criteria: Criterion[]): Record<string, Record<string, number>> {
    const normalizedData: Record<string, Record<string, number>> = {};

    // Initialize the empty data structure
    options.forEach(opt => {
        normalizedData[opt.id] = {};
    });

    criteria.forEach(crit => {
        // Safely extract valid expected values for normalization
        const validExpectedValues: number[] = [];

        // Calculate values using the expected value representations
        options.forEach(opt => {
            const expectedValue = getExpectedValue(opt.scores[crit.id]);
            // Ensure we only include actual numbers, skipping undefined or missing data
            if (expectedValue !== undefined && expectedValue !== null && !isNaN(expectedValue)) {
                validExpectedValues.push(expectedValue);
            }
        });

        // Calculate the absolute max for this specific column
        const maxScore = validExpectedValues.length > 0 ? Math.max(...validExpectedValues) : 0;

        // Apply normalization rules
        options.forEach(opt => {
            const expectedValue = getExpectedValue(opt.scores[crit.id]);

            let normalizedValue = 0;

            if (expectedValue === undefined || expectedValue === null || isNaN(expectedValue)) {
                // Failsafe: Missing data receives an automatic 0
                normalizedValue = 0;
            } else if (maxScore === 0) {
                // Failsafe: Prevent division by zero if all options are 0
                normalizedValue = 0; 
            } else if (crit.isCost) {
                // Cost criteria emphasize lower values yielding higher normalized scores
                normalizedValue = (maxScore - expectedValue) / maxScore;
            } else {
                // Benefit math: Value / Max
                normalizedValue = expectedValue / maxScore;
            }

            normalizedData[opt.id][crit.id] = normalizedValue;
        });
    });

    return normalizedData;
}

export interface RankedOption {
    id: string;
    name: string;
    score: number;
    // Disqualification tracking properties
    isDisqualified?: boolean;
    disqualificationReason?: string;
    benefitScore: number; 
    costScore: number;
    valueRatio: number; // Efficiency ratio (Benefit / Cost)
}

/**
 * Calculates the final composite scores using the Weighted Sum Model.
 * @param options - The original options array (to get IDs and names).
 * @param criteria - The original criteria array (to align with the weights array).
 * @param normalizedData - The 0-1 scaled dictionary from normalizeScores.
 * @param weights - The calculated AHP percentage weights.
 * @returns A sorted array of options from best (highest score) to worst.
 */
export function calculateWsmScores(
    options: Option[],
    criteria: Criterion[],
    normalizedData: Record<string, Record<string, number>>,
    weights: number[]
): RankedOption[] {
    
    // Calculate the composite score for each option
    const results: RankedOption[] = options.map(opt => {
        let finalScore = 0;
        let isDisqualified = false;
        let disqualificationReason = '';
        let benefitScore = 0; 
        let costScore = 0;

        // Iterate through each criterion to perform the WSM math
        criteria.forEach((crit, index) => {
            // Evaluate hard constraints and dealbreakers
            if (!isDisqualified && crit.hasDealbreaker && crit.dealbreakerValue !== undefined && crit.dealbreakerValue !== null) {
                // Safely extract the expected numeric value
                const expectedValue = getExpectedValue(opt.scores[crit.id]);

                if (expectedValue === undefined || expectedValue === null || isNaN(expectedValue)) {
                    // Failsafe: Missing data instantly fails a hard constraint
                    isDisqualified = true;
                    disqualificationReason = `Missing data for ${crit.name}`;
                } else if (crit.dealbreakerType === 'max' && expectedValue > crit.dealbreakerValue) {
                    isDisqualified = true;
                    disqualificationReason = `Exceeded max limit for ${crit.name} (Value: ${expectedValue})`;
                } else if (crit.dealbreakerType === 'min' && expectedValue < crit.dealbreakerValue) {
                    isDisqualified = true;
                    disqualificationReason = `Failed min requirement for ${crit.name} (Value: ${expectedValue})`;
                }
            }
            const normalizedValue = normalizedData[opt.id]?.[crit.id] || 0;
            const weightedValue = normalizedValue * weights[index];
            // The core WSM equation
            finalScore += weightedValue;
            // Categorize scores for value ratio calculations
            if (crit.isCost) {
                // Higher normalized cost indicates lower actual cost (greater efficiency)
                costScore += weightedValue; 
            } else {
                benefitScore += weightedValue;
            }
            
        });

        const valueRatio = (benefitScore + 0.1) * (costScore + 0.1);
        return {
            id: opt.id,
            name: opt.name,
            score: finalScore,
            isDisqualified,
            disqualificationReason,
            // Assign calculated efficiency metric parameters
            benefitScore,
            costScore,
            valueRatio
        };
    });

    // Sort the final array descending, pushing disqualified options to the bottom
    return results.sort((a, b) => {
        // If 'a' is disqualified but 'b' is not, 'b' wins automatically
        if (a.isDisqualified && !b.isDisqualified) return 1;
        // If 'b' is disqualified but 'a' is not, 'a' wins automatically
        if (!a.isDisqualified && b.isDisqualified) return -1;
        
        // Otherwise, sort normally by the WSM math score (highest first)
        return b.score - a.score;
    });
}

// Define the structure for our score breakdown
export interface ScoreContribution {
    criterionId: string;
    weightedScore: number;
}

/**
 * Analyzes a specific option to determine exactly how much each criterion 
 * contributed to its final WSM score.
 */
export function calculateItemizedContributions(
    optionId: string,
    criteriaIds: string[],
    normalizedData: Record<string, Record<string, number>>,
    weights: number[]
): ScoreContribution[] {
    const contributions: ScoreContribution[] = [];

    // Safety check: ensure the option exists in our normalized data
    if (!normalizedData[optionId]) {
        return contributions;
    }

    // Retrieve all option IDs for variance checking
    const allOptionIds = Object.keys(normalizedData);

    // Loop through every criterion to calculate its exact slice of the pie
    criteriaIds.forEach((critId, index) => {
        const rawNormalized = normalizedData[optionId][critId] || 0;
        const weight = weights[index] || 0;
        
        // Apply zero-variance filter
        // Extract all scores across options for the current criterion
        const allScoresForCrit = allOptionIds.map(id => normalizedData[id][critId] || 0);
        
        // Determine the score range
        const maxScore = allScoresForCrit.length > 0 ? Math.max(...allScoresForCrit) : 0;
        const minScore = allScoresForCrit.length > 0 ? Math.min(...allScoresForCrit) : 0;
        
        // If all scores are identical, the criterion provides no competitive advantage.
        const isTieAcrossBoard = (maxScore === minScore);
        const effectiveWeightedScore = isTieAcrossBoard ? 0 : (rawNormalized * weight);

        contributions.push({
            criterionId: critId,
            weightedScore: effectiveWeightedScore
        });
    });

    // Sort from highest contribution to lowest, so index 0 is always the true "MVP" differentiator
    return contributions.sort((a, b) => b.weightedScore - a.weightedScore);
}

// Define the structure for the "Why Option A beat Option B" insight
export interface ComparisonInsight {
    decidingCriterionId: string;
    scoreDelta: number; // How much MORE the winner scored in this specific criterion
}

/**
 * Compares the #1 option against the #2 option to find the specific 
 * criterion where the winner outperformed the runner-up the most.
 */
export function findDecidingFactor(
    winnerId: string,
    runnerUpId: string,
    criteriaIds: string[],
    normalizedData: Record<string, Record<string, number>>,
    weights: number[]
): ComparisonInsight | null {
    // Retrieve the itemized score contributions for both options
    const winnerMath = calculateItemizedContributions(winnerId, criteriaIds, normalizedData, weights);
    const runnerUpMath = calculateItemizedContributions(runnerUpId, criteriaIds, normalizedData, weights);

    if (winnerMath.length === 0 || runnerUpMath.length === 0) return null;

    let biggestAdvantage = -Infinity;
    let winningCriterion = '';

    // Identify the criterion with the largest positive score delta
    criteriaIds.forEach(critId => {
        const winnerScore = winnerMath.find(c => c.criterionId === critId)?.weightedScore || 0;
        const runnerUpScore = runnerUpMath.find(c => c.criterionId === critId)?.weightedScore || 0;
        
        // Calculate the advantage (Delta)
        const advantage = winnerScore - runnerUpScore;

        // If this advantage is the biggest one we've seen so far, save it
        if (advantage > biggestAdvantage) {
            biggestAdvantage = advantage;
            winningCriterion = critId;
        }
    });

    // Failsafe if no clear advantage is found
    if (!winningCriterion || biggestAdvantage <= 0) return null;

    return {
        decidingCriterionId: winningCriterion,
        scoreDelta: biggestAdvantage
    };
}