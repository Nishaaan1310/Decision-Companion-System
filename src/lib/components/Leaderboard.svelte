<script lang="ts">
    import { criteriaStore, optionsStore, leaderboardStore, normalizedDataStore, ahpWeightsStore } from '$lib/stores/decisionStore';
    import RecommendationInsight from '$lib/components/RecommendationInsight.svelte';

    // Calculate missing data locally so the God Component doesn't have to
    // Using your original subtraction math, wrapped in a cleaner Svelte reactive block
    $: missingDataCount = (() => {
        if ($optionsStore.length === 0 || $criteriaStore.length === 0) return 0;
        
        let actualFilledCount = 0;
        
        $optionsStore.forEach(opt => {
            $criteriaStore.forEach(crit => {
                // Checking for undefined, null, AND empty strings just to be perfectly safe
                if (opt.scores[crit.id] !== undefined && opt.scores[crit.id] !== null) {
                    actualFilledCount++;
                }
            });
        });
        
        return ($optionsStore.length * $criteriaStore.length) - actualFilledCount;
    })();
    
</script>

{#if $leaderboardStore.length > 0}
    <section class="leaderboard-section">
        <h2>Final Recommendation</h2>
    
        {#if !$leaderboardStore[0].isDisqualified}
            <RecommendationInsight 
                rankings={$leaderboardStore} 
                normalizedData={$normalizedDataStore} 
                weights={$ahpWeightsStore} 
            />
        {:else}
            <div class="catastrophic-failure-banner">
                <strong>🚨 No Valid Options:</strong> Every single option failed your hard constraints (Dealbreakers). 
                You must either relax your rules or find new options.
            </div>
        {/if}
        
        {#if missingDataCount > 0 && $optionsStore.length > 0 && $criteriaStore.length > 0}
            <div class="warning-banner">
                <strong>⚠️ Missing Data:</strong> You have {missingDataCount} empty cell(s). 
                Missing values are automatically scored as the worst possible outcome (0 points).
            </div>
        {/if}

        <div class="rankings-list">
            {#each $leaderboardStore as result, index}
                <div class="ranking-card 
                    {index === 0 && !result.isDisqualified ? 'winner' : ''} 
                    {result.isDisqualified ? 'disqualified' : ''}"
                >
                    
                    <div class="rank-number">
                        {#if result.isDisqualified}
                            ❌
                        {:else}
                            #{index + 1}
                        {/if}
                    </div>
                    
                    <div class="rank-details">
                        <span class="rank-name">{result.name}</span>
                        
                        {#if result.isDisqualified}
                            <span class="disqualified-reason">
                                🚫 Eliminated: {result.disqualificationReason}
                            </span>
                        {/if}
                    </div>
                    
                    <div class="rank-score">
                        {#if result.isDisqualified}
                            <span class="score-label">N/A</span>
                        {:else}
                            {(result.score * 100).toFixed(1)} 
                            <span class="score-label">pts</span>
                        {/if}
                    </div>
                    
                </div>
            {/each}
        </div>
    </section>
{/if}

<style>
    .leaderboard-section {
        margin-top: 2rem;
        padding: 1.5rem;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    h2 {
        margin-top: 0;
        color: #111827;
        margin-bottom: 1.5rem;
    }

    .warning-banner {
        background-color: #fffbeb;
        color: #b45309;
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
        border-left: 4px solid #f59e0b;
    }

    .catastrophic-failure-banner {
        background-color: #fee2e2;
        color: #991b1b;
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1.5rem;
        border-left: 4px solid #ef4444;
    }

    .rankings-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .ranking-card {
        display: flex;
        align-items: center;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem 1.5rem;
        transition: transform 0.2s;
    }

    .ranking-card.winner {
        background: #f0fdf4;
        border-color: #22c55e;
        box-shadow: 0 4px 6px -1px rgba(34, 197, 94, 0.1);
        transform: scale(1.02);
    }

    .ranking-card.disqualified {
        opacity: 0.6;
        background-color: #f3f4f6;
        border-color: #d1d5db;
        filter: grayscale(100%); 
    }

    .rank-number {
        font-size: 1.5rem;
        font-weight: 700;
        color: #9ca3af;
        width: 3rem;
    }

    .winner .rank-number {
        color: #16a34a;
    }

    .rank-details {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    .rank-name {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
    }

    .disqualified-reason {
        display: block;
        margin-top: 0.25rem;
        font-size: 0.8rem;
        color: #dc2626;
        font-weight: 500;
    }

    .rank-score {
        font-size: 1.5rem;
        font-weight: 700;
        color: #111827;
        text-align: right;
    }

    .score-label {
        font-size: 0.875rem;
        font-weight: 400;
        color: #6b7280;
    }
</style>