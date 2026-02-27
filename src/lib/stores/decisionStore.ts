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