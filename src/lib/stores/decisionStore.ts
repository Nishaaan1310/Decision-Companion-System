// src/lib/stores/decisionStore.ts
import { writable } from 'svelte/store';

// 1. NEW: Define a flexible type that can handle both exact numbers and uncertain ranges
export type ScoreValue = number | { min: number; max: number };


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

// 2. UPDATED: Apply the new type to the Option interface
export interface Option {
    id: string;
    name: string;
    scores: Record<string, ScoreValue>; // Changed from strictly 'number'
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
            // NEW: Clean up the corrupted data so it doesn't linger
            localStorage.removeItem(key);
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

    // 5. The Sync Phase: Listen for changes made by other tabs/windows
    if (isBrowser) {
        window.addEventListener('storage', (event) => {
            // Only react if the exact localStorage key we care about was changed
            if (event.key === key) {
                try {
                    // If the other tab deleted the data, fall back to initialValue
                    // Otherwise, parse the brand new JSON string sent by the browser
                    const syncedValue = event.newValue ? JSON.parse(event.newValue) : initialValue;
                    
                    // Force this tab's Svelte store to immediately adopt the new data
                    store.set(syncedValue);
                } catch (error) {
                    console.error(`Error syncing ${key} from another tab:`, error);
                }
            }
        });
    }

    // 6. Return the exact same API as a standard Svelte store so the rest of the app doesn't break
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

// Action: Update an existing criterion's name AND polarity
export function updateCriterion(id: string, newName: string, newIsCost: boolean) {
    criteriaStore.update(criteria => 
        criteria.map(c => {
            if (c.id === id) {
                // NEW: We now overwrite both 'name' and 'isCost'
                return { ...c, name: newName, isCost: newIsCost };
            }
            return c;
        })
    );
}

// --- OPTION CRUD ACTIONS ---

// Action: Add a custom option
export function addOption(name: string) {
    optionsStore.update(options => {
        const newId = crypto.randomUUID(); // Generate a unique ID
        return [...options, { id: newId, name: name, scores: {} }];
    });
}

// Action: Remove a specific option by its ID
export function removeOption(id: string) {
    optionsStore.update(options => options.filter(opt => opt.id !== id));
}

export function updateOptionName(id: string, newName: string) {
    optionsStore.update(options => {
        return options.map(opt => {
            // Find the exact option by ID
            if (opt.id === id) {
                // Return a new object with the updated name, keeping the existing scores intact
                return { ...opt, name: newName };
            }
            return opt;
        });
    });
}

// Action: Update a specific raw score for an option

// UPDATED: 'newValue' now accepts our flexible ScoreValue type
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
