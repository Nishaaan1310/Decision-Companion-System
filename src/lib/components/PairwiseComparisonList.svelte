<script lang="ts">
    import { criteriaStore, comparisonsStore, consistencyRatioStore, ahpWeightsStore } from '$lib/stores/decisionStore';
    import AhpSlider from './AhpSlider.svelte';

    // Generate unique A vs B criterion pairs
    let pairs: { idA: string; idB: string; nameA: string; nameB: string }[] = [];
    
    $: {
        pairs = [];
        for (let i = 0; i < $criteriaStore.length; i++) {
            for (let j = i + 1; j < $criteriaStore.length; j++) {
                pairs.push({
                    idA: $criteriaStore[i].id,
                    nameA: $criteriaStore[i].name,
                    idB: $criteriaStore[j].id,
                    nameB: $criteriaStore[j].name
                });
            }
        }
    }

    // Parse saved slider state or initialize default
    function getSavedSliderProps(idA: string, idB: string) {
        const storedMath = $comparisonsStore[`${idA}_${idB}`];

        if (!storedMath || storedMath === 1) {
            return { value: 1, favored: null };
        } 
        
        if (storedMath > 1) {
            return { value: storedMath, favored: idA };
        } 
        
        return { value: Math.round(1 / storedMath), favored: idB };
    }

    // Handle slider changes and update store
    function handleSliderChange(detail: { idA: string, idB: string, favored: string, value: number }) {
        const { idA, idB, favored, value } = detail;
        const finalMathValue = (favored === idA) ? value : (1 / value);
        
        // Update persistent store
        comparisonsStore.update(store => {
            store[`${idA}_${idB}`] = finalMathValue;
            return store;
        });
    }
</script>

<div class="pairwise-section">
    <h3>Step 2: Weigh Your Priorities</h3>
    <p class="instructions">
        Compare each pair of criteria. Which one is more important to your decision, and by how much?
    </p>

    <div class="sliders-container">
        {#each pairs as pair (pair.idA + '_' + pair.idB)}
            {@const savedProps = getSavedSliderProps(pair.idA, pair.idB)}
            
            <AhpSlider 
                criterionA={pair.nameA} 
                criterionB={pair.nameB} 
                idA={pair.idA} 
                idB={pair.idB} 
                savedValue={savedProps.value}
                savedFavored={savedProps.favored}
                onChange={handleSliderChange} 
            />
        {/each}
    </div>

    <section class="results-panel">
        <h2>Criteria Weights</h2>
        <div class="weights-grid">
            {#each $criteriaStore as criterion, index}
                <div class="weight-card">
                    <span class="criterion-name">{criterion.name}</span>
                    <span class="weight-value">{($ahpWeightsStore[index] && ($ahpWeightsStore[index] * 100).toFixed(1)) || '0.0'}%</span>
                </div>
            {/each}
        </div>

        {#if $consistencyRatioStore > 0.1}
            <div class="cr-warning">
                <strong>Warning:</strong> Your logic is inconsistent (CR: {($consistencyRatioStore * 100).toFixed(1)}%). 
                Try adjusting the sliders to be more logically aligned.
            </div>
        {:else if pairs.length > 0}
            <div class="cr-success">
                <strong>Great!</strong> Your logic is highly consistent (CR: {($consistencyRatioStore * 100).toFixed(1)}%).
            </div>
        {/if}
    </section>
</div>
<style>
    .pairwise-section {
        margin-top: 2rem;
        padding: 1.5rem;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    h3 {
        margin-top: 0;
        color: #111827;
    }

    .instructions {
        color: #4b5563;
        margin-bottom: 1.5rem;
    }

    .sliders-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    /* Results panel styling */
    .results-panel {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
    }

    .results-panel h2 {
        font-size: 1.25rem;
        margin-bottom: 1rem;
        color: #374151;
    }

    .weights-grid {
        display: grid;
        /* Responsive auto-fit grid */
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .weight-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.5rem;
    }

    .criterion-name {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
    }

    .weight-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #2563eb; /* Primary highlight color */
    }

    /* Validation Banners */
    .cr-warning {
        background-color: #fef2f2;
        color: #991b1b;
        padding: 1rem;
        border-radius: 6px;
        border-left: 4px solid #ef4444;
    }

    .cr-success {
        background-color: #f0fdf4;
        color: #166534;
        padding: 1rem;
        border-radius: 6px;
        border-left: 4px solid #22c55e;
    }
</style>