// src/lib/engine/ahp.ts

/**
 * Builds an NxN pairwise comparison matrix for the AHP calculation.
 * @param criteriaIds - An array of the criterion IDs in a fixed order.
 * @param comparisons - The dictionary of slider values from the store.
 * @returns A 2D array of numbers representing the mathematical matrix.
 */
export function buildAhpMatrix(criteriaIds: string[], comparisons: Record<string, number>): number[][] {
    const n = criteriaIds.length;
    // Initialize an empty NxN matrix filled with 1s
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                // Diagonal is always 1 (a criterion compared to itself)
                matrix[i][j] = 1;
            } else {
                const idA = criteriaIds[i];
                const idB = criteriaIds[j];
                
                // Check if the user compared A to B
                if (comparisons[`${idA}_${idB}`] !== undefined) {
                    matrix[i][j] = comparisons[`${idA}_${idB}`];
                } 
                // Otherwise, check if they compared B to A, and invert it
                else if (comparisons[`${idB}_${idA}`] !== undefined) {
                    matrix[i][j] = 1 / comparisons[`${idB}_${idA}`];
                }
            }
        }
    }

    return matrix;
}

/**
 * Calculates the normalized criteria weights from the AHP matrix.
 * @param matrix - The NxN matrix generated from user inputs.
 * @returns An array of decimal weights that sum exactly to 1.0.
 */
export function calculateWeights(matrix: number[][]): number[] {
    const n = matrix.length;
    const columnSums = new Array(n).fill(0);

    // Calculate the sum of each column
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            columnSums[j] += matrix[i][j];
        }
    }

    // Normalize the matrix (divide each cell by its column sum)
    const normalizedMatrix = matrix.map((row) => 
        row.map((val, j) => val / columnSums[j])
    );

    // Calculate the final weight (average of each normalized row)
    const weights = normalizedMatrix.map(row => {
        const rowSum = row.reduce((sum, val) => sum + val, 0);
        return rowSum / n;
    });

    return weights;
}

// Standard AHP Random Index (RI) values for n = 0 through 10
// n=1 and n=2 are 0 because consistency is perfectly guaranteed with only 1 or 2 criteria
const RI = [0, 0, 0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];

/**
 * Calculates the Consistency Ratio (CR) to validate user logic.
 * @param matrix - The original NxN matrix from buildAhpMatrix.
 * @param weights - The calculated normalized weights from calculateWeights.
 * @returns The CR decimal (values < 0.10 are considered highly consistent).
 */
export function calculateConsistencyRatio(matrix: number[][], weights: number[]): number {
    const n = matrix.length;

    // CR is mathematically irrelevant for less than 3 criteria
    if (n < 3) return 0;

    // Calculate the weighted sum vector (Matrix * Weights)
    const weightedSumVector = matrix.map(row => {
        return row.reduce((sum, val, j) => sum + (val * weights[j]), 0);
    });

    // Calculate Lambda Max (Average of weighted sum / weight)
    let lambdaMax = 0;
    for (let i = 0; i < n; i++) {
        lambdaMax += (weightedSumVector[i] / weights[i]);
    }
    lambdaMax = lambdaMax / n;

    // Calculate Consistency Index (CI)
    const CI = (lambdaMax - n) / (n - 1);

    // Calculate Consistency Ratio (CR)
    const CR = CI / RI[n];

    return CR;
}