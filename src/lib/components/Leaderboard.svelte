<script lang="ts">
    import { criteriaStore, optionsStore, leaderboardStore, normalizedDataStore, ahpWeightsStore } from '$lib/stores/decisionStore';
    import RecommendationInsight from '$lib/components/RecommendationInsight.svelte';

    // Local missing data calculation
    $: missingDataCount = (() => {
        if ($optionsStore.length === 0 || $criteriaStore.length === 0) return 0;
        
        let actualFilledCount = 0;
        
        $optionsStore.forEach(opt => {
            $criteriaStore.forEach(crit => {
                // Check for strict missing values
                if (opt.scores[crit.id] !== undefined && opt.scores[crit.id] !== null) {
                    actualFilledCount++;
                }
            });
        });
        
        return ($optionsStore.length * $criteriaStore.length) - actualFilledCount;
    })();

    // Value Ratio (Pareto) Tracking
    
    // Verify presence of cost criteria
    $: hasCostCriteria = $criteriaStore.some(c => c.isCost);
    
    // Filter out disqualified options
    $: validRankings = $leaderboardStore.filter(r => !r.isDisqualified);

    // Identify the highest scores across all metrics
    $: topScore = validRankings.length > 0 
        ? Math.max(...validRankings.map(r => r.score)) 
        : 0;

    $: topValueRatio = (hasCostCriteria && validRankings.length > 0) 
        ? Math.max(...validRankings.map(r => r.valueRatio)) 
        : 0;

    // Identify top performers (supports multi-way ties)
    $: winners = validRankings.filter(r => r.score === topScore && topScore > 0);
    
    $: bestValueOptions = validRankings.filter(r => 
        r.valueRatio === topValueRatio && topValueRatio > 0
    );

    // Empty state logic
    $: totalCells = $optionsStore.length * $criteriaStore.length;
    $: isGridCompletelyEmpty = totalCells > 0 && missingDataCount === totalCells;

</script>

{#if $leaderboardStore.length > 0}
    <section class="leaderboard-section">
        <h2>Final Recommendation</h2>
        
        {#if isGridCompletelyEmpty}
            <div class="empty-state-banner">
                <strong>📊 Awaiting Data:</strong> Please enter data for your options in the grid above to generate your analysis and rankings.
            </div>
        {:else}
            {#if !$leaderboardStore[0].isDisqualified}
                <RecommendationInsight 
                    rankings={$leaderboardStore} 
                    normalizedData={$normalizedDataStore} 
                    weights={$ahpWeightsStore} 
                    {winners} 
                    {bestValueOptions} 
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
                        {winners.some(w => w.id === result.id) ? 'winner' : ''} 
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
                            <div class="rank-name-wrapper">
                                <span class="rank-name">{result.name}</span>
                                
                                {#if winners.some(w => w.id === result.id)}
                                    {#if winners.length > 1}
                                        <span class="badge tie-badge" title="Exactly tied for first place">
                                            🤝 Tied for #1
                                        </span>
                                    {:else}
                                        <span class="badge winner-badge" title="Highest overall score">
                                            🏆 Top Choice
                                        </span>
                                    {/if}
                                {/if}
                                
                                {#if hasCostCriteria && bestValueOptions.some(bv => bv.id === result.id) && !result.isDisqualified}
                                    <span class="badge best-value-badge" title="Highest Benefit-to-Cost Ratio">
                                        💎 Best Value
                                    </span>
                                {/if}
                            </div>
                            
                            {#if result.isDisqualified}
                                <span class="disqualified-reason">
                                    🚫 Eliminated: {result.disqualificationReason}
                                </span>
                            {:else if hasCostCriteria}
                                <div class="pareto-metrics">
                                    <span class="metric benefit" title="Points earned from Benefit criteria">
                                        ↑ Value: {(result.benefitScore * 100).toFixed(1)}
                                    </span>
                                    <span class="metric cost" title="Cost efficiency (Higher means cheaper/better)">
                                        ↓ Efficiency: {(result.costScore * 100).toFixed(1)}
                                    </span>
                                    <span class="metric ratio" title="Bang for Buck (Benefit multiplied by Cost)">
                                        ⚖️ Ratio: {result.valueRatio.toFixed(2)}
                                    </span>
                                </div>
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
        {/if}
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


    /* Pareto metrics styles */
    .rank-name-wrapper {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .best-value-badge {
        background-color: #fef08a; /* Soft yellow */
        color: #854d0e;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
        border: 1px solid #fde047;
    }

    .pareto-metrics {
        display: flex;
        gap: 1rem;
        margin-top: 0.4rem;
        font-size: 0.8rem;
        color: #64748b;
        flex-wrap: wrap;
    }

    .metric {
        display: flex;
        align-items: center;
        background-color: #f1f5f9;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        border: 1px solid #e2e8f0;
    }

    .metric.benefit {
        color: #047857; /* Emerald green */
        background-color: #ecfdf5;
        border-color: #d1fae5;
    }

    .metric.cost {
        color: #b91c1c; /* Red */
        background-color: #fef2f2;
        border-color: #fee2e2;
    }

    .metric.ratio {
        color: #4338ca; /* Indigo */
        background-color: #e0e7ff;
        border-color: #c7d2fe;
        font-weight: 600;
    }
    /* Empty state styles */
    .empty-state-banner {
        background-color: #f8fafc;
        color: #475569;
        padding: 2rem;
        border-radius: 8px;
        text-align: center;
        border: 2px dashed #cbd5e1;
        margin-bottom: 1.5rem;
        font-size: 1.1rem;
    }

    .badge {
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
        display: inline-flex;
        align-items: center;
    }

    .tie-badge {
        background-color: #e0e7ff;
        color: #4338ca;
        border: 1px solid #c7d2fe;
    }

    .winner-badge {
        background-color: #dcfce7;
        color: #166534;
        border: 1px solid #bbf7d0;
    }
</style>