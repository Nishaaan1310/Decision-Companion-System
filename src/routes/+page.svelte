<script lang="ts">
    import { comparisonsStore, resetAllData } from '$lib/stores/decisionStore';
   

    // Component imports
    import CriteriaBuilder from '$lib/components/CriteriaBuilder.svelte';
    import PairwiseComparisonList from '$lib/components/PairwiseComparisonList.svelte';
    import OptionsBuilder from '$lib/components/OptionsBuilder.svelte';
    import DataEntryGrid from '$lib/components/DataEntryGrid.svelte';
    import Leaderboard from '$lib/components/Leaderboard.svelte';

    // Factory reset handler
    function handleFactoryReset() {
        const isConfirmed = confirm("Are you sure you want to completely clear all criteria, comparisons, and options? This action cannot be undone.");
        
        if (isConfirmed) {
            resetAllData();
        }
    }

</script>


<main class="app-container">
    <header class="app-header">
        <div class="header-titles">
            <h1>Decision Companion</h1>
            <p>Define your priorities and evaluate your options.</p>
        </div>
        
        <button on:click={handleFactoryReset} class="danger-btn" title="Reset all data">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
            Start Over
        </button>
    </header>

    <CriteriaBuilder />

    <PairwiseComparisonList />


    <OptionsBuilder />

    <DataEntryGrid />

    <Leaderboard />

    <section class="debug-panel">
        <h3>Live Memory State</h3>
        <pre>{JSON.stringify($comparisonsStore, null, 2)}</pre>
    </section>

    

</main>

<style>
    /* Global layout styling */
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
    .app-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 2rem;
        background-color: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        /* Flush header alignment */
        margin: -2rem -2rem 2.5rem -2rem; 
        border-radius: 8px 8px 0 0;
    }

    .header-titles h1 {
        margin: 0 0 0.25rem 0;
        font-size: 1.75rem;
        color: #0f172a;
        font-weight: 700;
        letter-spacing: -0.025em;
    }

    .header-titles p {
        margin: 0;
        color: #64748b;
        font-size: 0.95rem;
    }

    .danger-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem; /* Icon text spacing */
        background-color: #fef2f2; /* Danger background */
        color: #ef4444; /* Danger text */
        border: 1px solid #fecaca;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s ease;
    }

    .danger-btn:hover {
        background-color: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
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

</style>
