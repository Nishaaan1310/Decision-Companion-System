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

    // Initialize the empty result object for each option
    options.forEach(opt => {
        normalizedData[opt.id] = {};
    });

    // Process the math one criterion at a time
    criteria.forEach(crit => {
        // Step 1: Gather all raw numbers for this specific column
        const rawScores = options.map(opt => opt.scores[crit.id] || 0);
        const maxScore = Math.max(...rawScores);
        const minScore = Math.min(...rawScores);

        // Step 2: Apply Min-Max normalization for every option
        options.forEach(opt => {
            const rawValue = opt.scores[crit.id] || 0;
            let normalizedValue = 0;

            if (maxScore === minScore) {
                // Failsafe: If every option costs $100, they all tie perfectly (score of 1)
                normalizedValue = 1;
            } else if (crit.isCost) {
                // Cost metric (Lower is better): Invert the standard formula
                normalizedValue = (maxScore - rawValue) / (maxScore - minScore);
            } else {
                // Benefit metric (Higher is better): Standard formula
                normalizedValue = (rawValue - minScore) / (maxScore - minScore);
            }

            // Save the clean, normalized 0-1 number
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