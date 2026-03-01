<script lang="ts">
    import { criteriaStore, comparisonsStore, optionsStore, resetAllData, updateOptionScore } from '$lib/stores/decisionStore';
    import AhpSlider from '$lib/components/AhpSlider.svelte';
    import DataCell from '$lib/components/DataCell.svelte';
    // NEW: Import our dynamic builder component
    import CriteriaBuilder from '$lib/components/CriteriaBuilder.svelte';

    // 1. NEW: Import our decoupled math engine
    import { buildAhpMatrix, calculateWeights, calculateConsistencyRatio } from '$lib/engine/ahp';
    
    // 2. NEW: Import the WSM engine and our strictly typed interface
    import { normalizeScores, calculateWsmScores, type RankedOption } from '$lib/engine/wsm';

    // NEW: Import the decoupled Options Builder
    import OptionsBuilder from '$lib/components/OptionsBuilder.svelte';

    // NEW: Import the insight engine
    import RecommendationInsight from '$lib/components/RecommendationInsight.svelte'

    // Define an array to hold our unique pairwise combinations
    let pairs: Array<{idA: string, idB: string, nameA: string, nameB: string}> = [];


    // Svelte Reactive Statement: Generate pairs automatically
    $: {
        const criteria = $criteriaStore;
        pairs = [];
        // Standard algorithm to generate unique pairs without duplicates or self-comparisons
        for (let i = 0; i < criteria.length; i++) {
            for (let j = i + 1; j < criteria.length; j++) {
                pairs.push({
                    idA: criteria[i].id,
                    nameA: criteria[i].name,
                    idB: criteria[j].id,
                    nameB: criteria[j].name
                });
            }
        }
    }

    // Catch the event from the child component and save to the global store
    function handleSliderChange(event: CustomEvent) {
        // Extract the cleaned data that the slider broadcasted
        const { idA, idB, favored, value } = event.detail;

        // If Criterion A won, save the whole number (e.g., 5). 
        // If Criterion B won, save the mathematical fraction (e.g., 1/5).
        const finalMathValue = (favored === idA) ? value : (1 / value);

        // Save it directly to the global memory store
        $comparisonsStore[`${idA}_${idB}`] = finalMathValue;
    }

    // NEW: Helper to reverse-engineer the stored fraction back into Slider format
    function getSavedSliderProps(idA: string, idB: string) {
        // Look up the raw math in your global memory store
        const storedMath = $comparisonsStore[`${idA}_${idB}`];

        // If it's missing or dead center
        if (!storedMath || storedMath === 1) {
            return { value: 1, favored: null };
        } 
        
        // If Criterion A won, it's a clean whole number > 1
        if (storedMath > 1) {
            return { value: storedMath, favored: idA };
        } 
        
        // If Criterion B won, it's a decimal < 1. 
        // We flip it and use Math.round to fix JavaScript floating-point errors!
        return { value: Math.round(1 / storedMath), favored: idB };
    }


    // ==========================================
    // NEW LOGIC ADDITIONS BELOW
    // ==========================================

    // Variables to hold the live math results
    let matrix: number[][] = [];
    let weights: number[] = [];
    let consistencyRatio: number = 0;
    
    // 3. NEW: Variable to hold the final sorted leaderboard
    let finalRankings: RankedOption[] = [];

    // 1. NEW: A variable to hold the raw normalized grid data for the insight engine
    let currentNormalizedData: Record<string, Record<string, number>> = {};

    // The Reactive Math Pipeline
    $: {
        // Extract an ordered list of IDs so the matrix knows which row is which
        const criteriaIds = $criteriaStore.map(c => c.id);

        if (criteriaIds.length > 0) {
            // Step A: Convert the raw dictionary into a strict 2D array
            matrix = buildAhpMatrix(criteriaIds, $comparisonsStore);
            
            // Step B: Calculate the final percentage weights
            weights = calculateWeights(matrix);
            
            // Step C: Validate the user's logic
            consistencyRatio = calculateConsistencyRatio(matrix, weights);
        }
    }

    // 4. NEW: The Reactive WSM Pipeline
    $: {
        // Only run the math if we actually have options, criteria, and calculated weights
        if ($optionsStore.length > 0 && $criteriaStore.length > 0 && weights.length > 0) {
            
            // 2. UPDATED: Save to our new component-level variable instead of a local 'const'
            currentNormalizedData = normalizeScores($optionsStore, $criteriaStore);
            
            // Step B: Multiply by AHP weights and sort from best to worst
            finalRankings = calculateWsmScores($optionsStore, $criteriaStore, currentNormalizedData, weights);            
        } else {
            // Failsafe: Clear the board if data is deleted
            finalRankings = []; 
            currentNormalizedData = {}; // Clear failsafe
        }
    }


    // NEW: Reactive counter for missing data
    let missingDataCount = 0;

    $: {
        let actualFilledCount = 0;
        
        // Loop through every option and every criterion to check for existing numbers
        $optionsStore.forEach(opt => {
            $criteriaStore.forEach(crit => {
                if (opt.scores[crit.id] !== undefined && opt.scores[crit.id] !== null) {
                    actualFilledCount++;
                }
            });
        });
        
        // Total expected cells minus the ones actually filled
        missingDataCount = ($optionsStore.length * $criteriaStore.length) - actualFilledCount;
    }


    // safety wrapper function
    function handleFactoryReset() {
        const isConfirmed = confirm("Are you sure you want to completely clear all criteria, comparisons, and options? This action cannot be undone.");
        
        if (isConfirmed) {
            resetAllData();
        }
    }

</script>


<main class="app-container">
    <header class="top-bar">
        <h1>Decision Companion</h1>
        <p>Define your priorities by comparing criteria below.</p>
        <button on:click={handleFactoryReset} class="danger-btn">
            Start Over
        </button>
    </header>

    <CriteriaBuilder />

    <section class="sliders-section">
        {#each pairs as pair}
            {@const savedProps = getSavedSliderProps(pair.idA, pair.idB)}

            <AhpSlider 
                criterionA={pair.nameA} 
                criterionB={pair.nameB} 
                idA={pair.idA} 
                idB={pair.idB} 
                
                savedValue={savedProps.value}
                savedFavored={savedProps.favored}
                
                on:change={handleSliderChange} 
            />
        {/each}
    </section>

    <section class="results-panel">
        <h2>Criteria Weights</h2>
        <div class="weights-grid">
            {#each $criteriaStore as criterion, index}
                <div class="weight-card">
                    <span class="criterion-name">{criterion.name}</span>
                    <span class="weight-value">{(weights[index] * 100).toFixed(1)}%</span>
                </div>
            {/each}
        </div>

        {#if consistencyRatio > 0.1}
            <div class="cr-warning">
                <strong>Warning:</strong> Your logic is inconsistent (CR: {(consistencyRatio * 100).toFixed(1)}%). 
                Try adjusting the sliders to be more logically aligned.
            </div>
        {:else}
            <div class="cr-success">
                <strong>Great!</strong> Your logic is highly consistent (CR: {(consistencyRatio * 100).toFixed(1)}%).
            </div>
        {/if}
    </section>



    <OptionsBuilder />

    <section class="data-grid-section">
        <div class="grid-header">
            <h2>Options Data Entry</h2>
            </div>

        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Option Name</th>
                        {#each $criteriaStore as criterion}
                            <th>
                                {criterion.name} 
                                <span class="polarity-badge">
                                    {criterion.isCost ? '(Cost)' : '(Benefit)'}
                                </span>
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#each $optionsStore as option (option.id)}
                        <tr>
                            <td class="option-name-cell">
                                <strong>{option.name}</strong>
                            </td>
                            {#each $criteriaStore as criterion}
                                <td>
                                    <DataCell 
                                        value={option.scores[criterion.id]} 
                                        criterionName={criterion.name} 
                                        optionName={option.name}
                                        onUpdate={(detail) => updateOptionScore(option.id, criterion.id, detail.value)} 
                                    />
                                </td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </section>
    {#if finalRankings.length > 0}
        <section class="leaderboard-section">
            <h2>Final Recommendation</h2>
        
            <RecommendationInsight 
                rankings={finalRankings} 
                normalizedData={currentNormalizedData} 
                weights={weights} 
            />
            
            {#if missingDataCount > 0 && $optionsStore.length > 0 && $criteriaStore.length > 0}
                <div class="warning-banner">
                    <strong>⚠️ Missing Data:</strong> You have {missingDataCount} empty cell(s). 
                    Missing values are automatically scored as the worst possible outcome (0 points).
                </div>
            {/if}

            <div class="rankings-list">
                {#each finalRankings as result, index}
                    <div class="ranking-card {index === 0 ? 'winner' : ''}">
                        <div class="rank-number">#{index + 1}</div>
                        <div class="rank-details">
                            <span class="rank-name">{result.name}</span>
                        </div>
                        <div class="rank-score">
                            {(result.score * 100).toFixed(1)} 
                            <span class="score-label">pts</span>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    <section class="debug-panel">
        <h3>Live Memory State</h3>
        <pre>{JSON.stringify($comparisonsStore, null, 2)}</pre>
    </section>

    

</main>

<style>
    /* Global layout styling for the app container */
    :global(body) {
        font-family: system-ui, -apple-system, sans-serif;
        background-color: #f3f4f6;
        color: #1f2937;
        margin: 0;
        padding: 0;
    }
    .app-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        background: white;
        min-height: 100vh;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    header {
        text-align: center;
        margin-bottom: 3rem;
    }
    header h1 {
        font-size: 2.5rem;
        color: #111827;
        margin-bottom: 0.5rem;
    }
    header p {
        color: #6b7280;
    }
    .sliders-section {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    .debug-panel {
        margin-top: 4rem;
        padding: 1rem;
        background: #1f2937;
        color: #10b981;
        border-radius: 8px;
        overflow-x: auto;
    }
    .debug-panel h3 {
        margin-top: 0;
        color: white;
    }


    .results-panel {
        margin-top: 3rem;
        padding: 2rem;
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .results-panel h2 {
        margin-top: 0;
        color: #111827;
        text-align: center;
    }
    .weights-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-top: 1.5rem;
    }
    .weight-card {
        background: #f3f4f6;
        padding: 1.5rem 1rem;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }
    .criterion-name {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .weight-value {
        font-size: 2rem;
        font-weight: 700;
        color: #3b82f6;
    }
    .cr-warning {
        margin-top: 2rem;
        padding: 1rem;
        background: #fef2f2;
        color: #b91c1c;
        border-left: 4px solid #ef4444;
        border-radius: 4px;
    }
    .cr-success {
        margin-top: 2rem;
        padding: 1rem;
        background: #f0fdf4;
        color: #15803d;
        border-left: 4px solid #22c55e;
        border-radius: 4px;
    }

    .data-grid-section {
        margin-top: 3rem;
        padding: 2rem;
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .grid-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
    .grid-header h2 {
        margin: 0;
        color: #111827;
    }
    .table-container {
        overflow-x: auto; /* Allows horizontal scrolling if there are many columns */
    }
    .data-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
    }
    .data-table th, .data-table td {
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;
    }
    .data-table th {
        background-color: #f9fafb;
        font-weight: 600;
        color: #4b5563;
        white-space: nowrap;
    }
    .polarity-badge {
        font-size: 0.75rem;
        color: #9ca3af;
        font-weight: normal;
        margin-left: 0.25rem;
    }

    .leaderboard-section {
        margin-top: 3rem;
        padding: 2rem;
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .leaderboard-section h2 {
        margin-top: 0;
        color: #111827;
        text-align: center;
        margin-bottom: 1.5rem;
    }
    .rankings-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .ranking-card {
        display: flex;
        align-items: center;
        padding: 1rem 1.5rem;
        background: #f9fafb;
        border-radius: 8px;
        border-left: 4px solid #d1d5db;
        transition: transform 0.2s ease;
    }
    .ranking-card:hover {
        transform: translateX(4px);
    }
    /* Special styling for the mathematical winner to make it stand out */
    .ranking-card.winner {
        background: #f0fdf4;
        border-left-color: #10b981;
        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
    }
    .rank-number {
        font-size: 1.5rem;
        font-weight: 700;
        color: #6b7280;
        width: 3rem;
    }
    .winner .rank-number {
        color: #10b981;
    }
    .rank-details {
        flex-grow: 1;
    }
    .rank-name {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
    }
    .winner .rank-name {
        color: #065f46;
    }
    .rank-score {
        font-size: 1.5rem;
        font-weight: 700;
        color: #374151;
        text-align: right;
    }
    .score-label {
        font-size: 0.875rem;
        font-weight: normal;
        color: #6b7280;
    }

    .top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background-color: #f8f9fa;
        border-bottom: 1px solid #e9ecef;
        margin-bottom: 2rem;
    }

    .top-bar h1 {
        margin: 0;
        font-size: 1.5rem;
        color: #333;
    }

    .danger-btn {
        background-color: #dc3545;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    }

    .danger-btn:hover {
        background-color: #c82333;
    }

    .option-name-cell {
        display: flex;
        align-items: center;
    }
    
    .warning-banner {
        background-color: #fff3cd;
        color: #856404;
        padding: 1rem;
        border: 1px solid #ffeeba;
        border-radius: 4px;
        margin-bottom: 1.5rem;
        font-size: 0.95rem;
    }
</style>
