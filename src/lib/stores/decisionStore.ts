// src/lib/stores/decisionStore.ts

import { writable, derived } from 'svelte/store';

// Core mathematical engines
import { buildAhpMatrix, calculateWeights, calculateConsistencyRatio } from '$lib/engine/ahp';
import { normalizeScores } from '$lib/engine/wsm';
import { calculateWsmScores } from '$lib/engine/wsm';

// Flexible scoring type supporting exact numbers and uncertainty ranges
export type ScoreValue = number | { min: number; max: number };

// --- Data Contracts ---


export interface QualitativeLabel {
    label: string;
    value: number;
}

export interface Criterion {
    id: string;
    name: string;
    isCost: boolean;
    
    // Hard Constraints (Dealbreakers)
    hasDealbreaker?: boolean; 
    dealbreakerType?: 'min' | 'max'; 
    dealbreakerValue?: number;
    // Optional text-to-math scale for subjective criteria
    qualitativeScale?: QualitativeLabel[];
}

export interface ComparisonMap {
    // Key format: "idA_idB", Value: 1 to 9 (AHP scale)
    [key: string]: number;
}

// Option Definition
export interface Option {
    id: string;
    name: string;
    scores: Record<string, ScoreValue>;
}

// --- Persistent Data Stores ---

// Criteria configuration framework
export const criteriaStore = createPersistentStore<Criterion[]>(
    'decision_criteria', 
    []
);

// AHP pairwise comparison matrix
export const comparisonsStore = createPersistentStore<Record<string, number>>(
    'decision_comparisons', 
    {}
);

// Raw option evaluations
export const optionsStore = createPersistentStore<Option[]>(
    'decision_options', 
    []
);

// --- UTILITIES: LocalStorage Factory ---

function createPersistentStore<T>(key: string, initialValue: T) {
    // Validate browser environment
    const isBrowser = typeof window !== 'undefined';
    
    // Load state from local storage
    let storedValue = initialValue;
    if (isBrowser) {
        try {
            const item = localStorage.getItem(key);
            if (item) {
                storedValue = JSON.parse(item);
            }
        } catch (error) {
            console.error(`Error reading ${key} from localStorage:`, error);
            // Remove corrupted data
            localStorage.removeItem(key);
        }
    }

    // Initialize writable store
    const store = writable<T>(storedValue);

    // Persist state changes
    if (isBrowser) {
        store.subscribe((value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error(`Error saving ${key} to localStorage:`, error);
            }
        });
    }

    // Synchronize state across tabs
    if (isBrowser) {
        window.addEventListener('storage', (event) => {
            if (event.key === key) {
                try {
                    const syncedValue = event.newValue ? JSON.parse(event.newValue) : initialValue;
                    store.set(syncedValue);
                } catch (error) {
                    console.error(`Error syncing ${key} from another tab:`, error);
                }
            }
        });
    }

    // Expose standard store API
    return {
        subscribe: store.subscribe,
        set: store.set,
        update: store.update
    };
}

// --- Store Actions ---

// Safely generate a unique identifier
function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

// Add a new criterion to the store
export function addCriterion(
    name: string, 
    isCost: boolean, 
    hasDealbreaker: boolean = false,
    dealbreakerType?: 'min' | 'max',
    dealbreakerValue?: number,
    qualitativeScale?: QualitativeLabel[]
) {
    criteriaStore.update(currentCriteria => {
        const newCriterion: Criterion = {
            id: `crit_${generateId()}`,
            name: name.trim(),
            isCost: isCost,
            hasDealbreaker: hasDealbreaker,
            dealbreakerType: dealbreakerType,
            dealbreakerValue: dealbreakerValue,
            qualitativeScale: qualitativeScale
        };
        // Return a brand new array to trigger Svelte's reactivity
        return [...currentCriteria, newCriterion];
    });
}

// Cascading deletion of a criterion
export function removeCriterion(targetId: string) {
    // Remove the physical column/row from the Criteria framework
    criteriaStore.update(criteria => criteria.filter(c => c.id !== targetId));

    // Clean up pairwise comparison data
    comparisonsStore.update(comparisons => {
        const cleanedComparisons = { ...comparisons };
        for (const key in cleanedComparisons) {
            // Remove associated AHP slider keys (format: "idA_idB")
            if (key.includes(targetId)) {
                delete cleanedComparisons[key];
            }
        }
        return cleanedComparisons;
    });

    // Clean up option score arrays
    optionsStore.update(options => {
        return options.map(option => {
            const cleanedScores = { ...option.scores };
            delete cleanedScores[targetId];
            return { ...option, scores: cleanedScores };
        });
    });
}

// Update an existing criterion's name and polarity
export function updateCriterion(id: string, newName: string, newIsCost: boolean) {
    criteriaStore.update(criteria => 
        criteria.map(c => {
            if (c.id === id) {
                return { ...c, name: newName, isCost: newIsCost };
            }
            return c;
        })
    );
}
// Action: Save hard constraints/dealbreakers to a specific criterion
export function updateCriterionDealbreaker(
    id: string, 
    hasDealbreaker: boolean, 
    dealbreakerType?: 'min' | 'max', 
    dealbreakerValue?: number
) {
    criteriaStore.update(criteria => 
        criteria.map(c => {
            if (c.id === id) {
                return { 
                    ...c, 
                    hasDealbreaker, 
                    dealbreakerType, 
                    dealbreakerValue 
                };
            }
            return c;
        })
    );
}

// Action: Update the subjective scale of an existing criterion
export function updateCriterionScale(id: string, qualitativeScale?: QualitativeLabel[]) {
    criteriaStore.update(criteria =>
        criteria.map(c => 
            c.id === id 
                ? { ...c, qualitativeScale: qualitativeScale } 
                : c
        )
    );
}

// --- Option Store Actions ---

export function addOption(name: string) {
    optionsStore.update(options => {
        const newId = crypto.randomUUID();
        return [...options, { id: newId, name: name, scores: {} }];
    });
}

export function removeOption(id: string) {
    optionsStore.update(options => options.filter(opt => opt.id !== id));
}

export function updateOptionName(id: string, newName: string) {
    optionsStore.update(options => {
        return options.map(opt => {
            if (opt.id === id) {
                return { ...opt, name: newName };
            }
            return opt;
        });
    });
}

// Update an option's specific criterion score (supports ranges and scalars)
export function updateOptionScore(optionId: string, criterionId: string, newValue: ScoreValue | undefined) {
    optionsStore.update(options => {
        // Map over the array and only modify the specific option that matches the ID
        return options.map(opt => {
            if (opt.id === optionId) {
                // Create a shallow copy of the existing dictionary
                const newScores = { ...opt.scores };
                
                // Add or remove the dictionary key
                if (newValue === undefined) {
                    delete newScores[criterionId];
                } else {
                    newScores[criterionId] = newValue;
                }
                
                // Return the newly constructed option object
                return { ...opt, scores: newScores };
            }
            // If it's not the target option, return it completely untouched
            return opt;
        });
    });
}

// Action: Factory Reset (Clear all user data)
export function resetAllData() {
    criteriaStore.set([]);
    comparisonsStore.set({});
    optionsStore.set([]);
}


// ============================================================================
// --- DERIVED STORES: THE AUTOMATED MATH PIPELINES ---
// ============================================================================

// AHP Weight Calculation Pipeline

// Pairwise comparison matrix derived from user ratings
export const ahpMatrixStore = derived(
    [criteriaStore, comparisonsStore],
    ([$criteria, $comparisons]) => {
        if ($criteria.length === 0) return [];
        const criteriaIds = $criteria.map(c => c.id);
        return buildAhpMatrix(criteriaIds, $comparisons);
    }
);

// Normalized weights generated from the AHP matrix
export const ahpWeightsStore = derived(
    [ahpMatrixStore],
    ([$ahpMatrix]) => {
        if ($ahpMatrix.length === 0) return [];
        return calculateWeights($ahpMatrix);
    }
);

// Consistency ratio validator
export const consistencyRatioStore = derived(
    [ahpMatrixStore, ahpWeightsStore],
    ([$ahpMatrix, $ahpWeights]) => {
        if ($ahpMatrix.length === 0 || $ahpWeights.length === 0) return 0;
        return calculateConsistencyRatio($ahpMatrix, $ahpWeights);
    }
);

// Data Normalization Pipeline
export const normalizedDataStore = derived(
    [optionsStore, criteriaStore],
    ([$options, $criteria]) => {
        if ($options.length === 0 || $criteria.length === 0) return {};
        return normalizeScores($options, $criteria);
    }
);

// Final WSM Leaderboard Pipeline
export const leaderboardStore = derived(
    [optionsStore, criteriaStore, normalizedDataStore, ahpWeightsStore],
    ([$options, $criteria, $normalizedData, $ahpWeights]) => {
        // Prevent evaluation if the framework or weight calculations are incomplete
        if ($options.length === 0 || $criteria.length === 0 || $ahpWeights.length === 0) {
            return [];
        }
        
        // Output the final RankedOption array
        return calculateWsmScores($options, $criteria, $normalizedData, $ahpWeights);
    }
);