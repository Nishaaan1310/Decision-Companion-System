<script lang="ts">
    import { comparisonsStore, resetAllData } from '$lib/stores/decisionStore';
   

    // NEW: Import the decoupled Options Builder
    import CriteriaBuilder from '$lib/components/CriteriaBuilder.svelte';
    import PairwiseComparisonList from '$lib/components/PairwiseComparisonList.svelte';
    import OptionsBuilder from '$lib/components/OptionsBuilder.svelte';
    import DataEntryGrid from '$lib/components/DataEntryGrid.svelte';
    import Leaderboard from '$lib/components/Leaderboard.svelte';

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


</style>
