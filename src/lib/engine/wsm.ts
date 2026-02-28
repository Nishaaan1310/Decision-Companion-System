// src/lib/engine/wsm.ts
import type { Option, Criterion } from '../stores/decisionStore';

/**
 * Normalizes raw option scores to a standard 0-1 scale.
 * * @param options - The array of options containing raw scores.
 * @param criteria - The array of criteria to check the isCost polarity flag.
 * @returns A dictionary mapping option IDs to their new normalized score dictionaries.
 */
export function normalizeScores(options: Option[], criteria: Criterion[]): Record<string, Record<string, number>> {
    const normalizedData: Record<string, Record<string, number>> = {};

    // Initialize the empty data structure
    options.forEach(opt => {
        normalizedData[opt.id] = {};
    });

    criteria.forEach(crit => {
        // Step 1: Extract ONLY the valid numbers typed by the user
        const validScores = options
            .map(opt => opt.scores[crit.id])
            .filter(val => val !== undefined && val !== null) as number[];

        // Step 2: Safely calculate min and max from valid data only
        let maxScore = 0;
        let minScore = 0;
        if (validScores.length > 0) {
            maxScore = Math.max(...validScores);
            minScore = Math.min(...validScores);
        }

        // Step 3: Apply normalization rules
        options.forEach(opt => {
            const rawValue = opt.scores[crit.id];
            let normalizedValue = 0;

            if (rawValue === undefined || rawValue === null) {
                // THE FAILSAFE: Missing data gets an automatic 0 (worst possible outcome)
                normalizedValue = 0;
            } else if (maxScore === minScore) {
                // Failsafe: If all valid entries are identical, they all tie perfectly
                normalizedValue = 1;
            } else if (crit.isCost) {
                // Cost metric (Lower is better)
                normalizedValue = (maxScore - rawValue) / (maxScore - minScore);
            } else {
                // Benefit metric (Higher is better)
                normalizedValue = (rawValue - minScore) / (maxScore - minScore);
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
    
    // Step 1: Calculate the composite score for each option
    const results: RankedOption[] = options.map(opt => {
        let finalScore = 0;

        // Iterate through each criterion to perform the WSM math
        criteria.forEach((crit, index) => {
            const normalizedValue = normalizedData[opt.id][crit.id] || 0;
            
            // The core WSM equation
            finalScore += (normalizedValue * weights[index]);
        });

        return {
            id: opt.id,
            name: opt.name,
            score: finalScore
        };
    });

    // Step 2: Sort the final array descending (highest score is index 0)
    return results.sort((a, b) => b.score - a.score);
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

    // Loop through every criterion to calculate its exact slice of the pie
    criteriaIds.forEach((critId, index) => {
        const rawNormalized = normalizedData[optionId][critId] || 0;
        const weight = weights[index] || 0;
        
        contributions.push({
            criterionId: critId,
            weightedScore: rawNormalized * weight
        });
    });

    // Sort from highest contribution to lowest, so index 0 is always the "MVP" criterion
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
    // 1. Get the forensic breakdown for both options using our previous function
    const winnerMath = calculateItemizedContributions(winnerId, criteriaIds, normalizedData, weights);
    const runnerUpMath = calculateItemizedContributions(runnerUpId, criteriaIds, normalizedData, weights);

    if (winnerMath.length === 0 || runnerUpMath.length === 0) return null;

    let biggestAdvantage = -Infinity;
    let winningCriterion = '';

    // 2. Loop through every criterion to find the biggest gap
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

    // 3. Failsafe: If for some reason the math is perfectly tied across the board
    if (!winningCriterion || biggestAdvantage <= 0) return null;

    return {
        decidingCriterionId: winningCriterion,
        scoreDelta: biggestAdvantage
    };
}