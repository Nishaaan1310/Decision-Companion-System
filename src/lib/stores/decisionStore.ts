// src/lib/stores/decisionStore.ts
import { writable } from 'svelte/store';

// --- Interfaces (The Data Contracts) ---

export interface Criterion {
    id: string;
    name: string;
    isCost: boolean;
}

export interface ComparisonMap {
    // Key format: "idA_idB", Value: 1 to 9 (AHP scale)
    [key: string]: number;
}

export interface Option {
    id: string;
    name: string;
    // A dictionary mapping a criterion ID to a raw number
    scores: Record<string, number>; 
}

// --- State Stores ---

export const criteriaStore = writable<Criterion[]>([]);
export const comparisonsStore = writable<ComparisonMap>({});
export const optionsStore = writable<Option[]>([]);

// --- ACTIONS: Phase 2 Dynamic Framework Logic ---

// Utility to generate a safe, unique ID for new criteria
function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

// Action: Safely inject a new criterion into the global memory
export function addCriterion(name: string, isCost: boolean) {
    criteriaStore.update(currentCriteria => {
        const newCriterion: Criterion = {
            id: `crit_${generateId()}`,
            name: name.trim(),
            isCost: isCost
        };
        // Return a brand new array to trigger Svelte's reactivity
        return [...currentCriteria, newCriterion];
    });
}

// Action: The Cascading Deletion Engine
export function removeCriterion(targetId: string) {
    // 1. Remove the physical column/row from the Criteria framework
    criteriaStore.update(criteria => criteria.filter(c => c.id !== targetId));

    // 2. Cascade Delete: Sweep the AHP matrix memory
    comparisonsStore.update(comparisons => {
        const cleanedComparisons = { ...comparisons };
        for (const key in cleanedComparisons) {
            // Our AHP keys look like "crit_123_crit_456". 
            // If the deleted ID is anywhere in this string, destroy the slider data.
            if (key.includes(targetId)) {
                delete cleanedComparisons[key];
            }
        }
        return cleanedComparisons;
    });

    // 3. Cascade Delete: Sweep the WSM grid memory
    optionsStore.update(options => {
        return options.map(option => {
            const cleanedScores = { ...option.scores };
            // Delete the exact math cell associated with this criterion column
            delete cleanedScores[targetId];
            
            // Rebuild the option object with the cleaned dictionary
            return { ...option, scores: cleanedScores };
        });
    });
}