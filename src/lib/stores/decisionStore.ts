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

// --- GLOBAL MEMORY STORES ---

// 1. Store for the criteria framework
export const criteriaStore = createPersistentStore<Criterion[]>(
    'decision_criteria', 
    []
);

// 2. Store for the AHP pairwise slider values
export const comparisonsStore = createPersistentStore<Record<string, number>>(
    'decision_comparisons', 
    {}
);

// 3. Store for the raw WSM data matrix
export const optionsStore = createPersistentStore<Option[]>(
    'decision_options', 
    []
);

// --- UTILITIES: LocalStorage Factory ---

function createPersistentStore<T>(key: string, initialValue: T) {
    // 1. Handle SSR Gotcha: Check if we are actually in the browser
    const isBrowser = typeof window !== 'undefined';
    
    // 2. The Load Phase: Try to get existing data from the browser's memory
    let storedValue = initialValue;
    if (isBrowser) {
        try {
            const item = localStorage.getItem(key);
            if (item) {
                storedValue = JSON.parse(item);
            }
        } catch (error) {
            console.error(`Error reading ${key} from localStorage:`, error);
        }
    }

    // 3. Create a standard Svelte store with whatever data we found (or the empty default)
    const store = writable<T>(storedValue);

    // 4. The Save Phase: Listen to every single change and silently write to disk
    if (isBrowser) {
        store.subscribe((value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error(`Error saving ${key} to localStorage:`, error);
            }
        });
    }

    // 5. Return the exact same API as a standard Svelte store so the rest of the app doesn't break
    return {
        subscribe: store.subscribe,
        set: store.set,
        update: store.update
    };
}

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

// Action: Factory Reset (Clear all user data)
export function resetAllData() {
    criteriaStore.set([]);
    comparisonsStore.set({});
    optionsStore.set([]);
}
