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