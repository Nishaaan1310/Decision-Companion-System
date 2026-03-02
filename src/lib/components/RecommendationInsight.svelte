<script lang="ts">
    import { criteriaStore } from '$lib/stores/decisionStore';
    import { calculateItemizedContributions, findDecidingFactor } from '$lib/engine/wsm';
    import type { RankedOption } from '$lib/engine/wsm';

    // Component Properties
    export let rankings: RankedOption[] = [];
    export let normalizedData: Record<string, Record<string, number>> = {};
    export let weights: number[] = [];
    export let winners: RankedOption[] = [];
    export let bestValueOptions: RankedOption[] = [];

    // UI State
    let runnerUpName = '';
    let mvpCriterionName = '';
    let decidingCriterionName = '';
    let isSoleSurvivor = false;

    // Derived Display Strings
    $: winnerNames = winners.map(w => w.name).join(' and ');
    $: bestValueNames = bestValueOptions.map(v => v.name).join(' and ');

    $: isTie = winners.length > 1;
    $: isValueTie = bestValueOptions.length > 1;

    // Check for presence of cost criteria
    $: hasCostCriteria = $criteriaStore.some(c => c.isCost);

    // Derived Flags for Recommendation Logic
    
    // Check if a single overall winner is also the single best value option
    $: isSingleWinnerAlsoBestValue = !isTie && !isValueTie && winners[0]?.id === bestValueOptions[0]?.id;
    
    // Check if a tie is mathematically resolved by one option having superior value
    $: isTieBrokenByValue = isTie && !isValueTie && winners.some(w => w.id === bestValueOptions[0]?.id);

    // Core Recommendation Logic Engine
    $: {
        // Calculate MVP and deciding factors exclusively for singular winners
        if (!isTie && winners.length === 1 && $criteriaStore.length > 0 && weights.length > 0) {
            const winner = winners[0];
            const criteriaIds = $criteriaStore.map(c => c.id);

            isSoleSurvivor = rankings.length < 2 || !!rankings[1]?.isDisqualified;

            // Determine the Most Valuable Criterion (MVP)
            const contributions = calculateItemizedContributions(winner.id, criteriaIds, normalizedData, weights);
            if (contributions.length > 0) {
                const mvpId = contributions[0].criterionId;
                mvpCriterionName = $criteriaStore.find(c => c.id === mvpId)?.name || 'Unknown';
            }

            // Determine the deciding factor between 1st and 2nd place
            if (!isSoleSurvivor && rankings.length > 1) {
                const runnerUp = rankings[1];
                runnerUpName = runnerUp.name; 
                const insight = findDecidingFactor(winner.id, runnerUp.id, criteriaIds, normalizedData, weights);
                if (insight) {
                    decidingCriterionName = $criteriaStore.find(c => c.id === insight.decidingCriterionId)?.name || '';
                } else {
                    decidingCriterionName = '';
                }
            } else {
                runnerUpName = '';
                decidingCriterionName = '';
            }
        } else {
            // Clear state for ties or empty data
            runnerUpName = '';
            mvpCriterionName = '';
            decidingCriterionName = '';
        }
    }
</script>

{#if rankings.length > 0}
    <div class="insight-card">
        <h3>💡 Decision Insight</h3>

        {#if isTie}
            <p class="primary-insight tie-text">
                ⚖️ <strong>Tie Detected:</strong> <strong>{winnerNames}</strong> received identical overall scores based on your current priorities. 
                Consider adjusting your criteria weights or adding a secondary constraint to narrow down the selection.
            </p>

        {:else if isSoleSurvivor}
            <p class="primary-insight sole-survivor-text">
                <strong>{winners[0].name}</strong> is your recommended choice by default. 
                It is the <em>only</em> option that successfully met all of your hard constraints and dealbreakers!
            </p>
            <p class="secondary-insight">
                Even though it won by elimination, its strongest contributing factor based on your priorities is still its performance in <strong>{mvpCriterionName}</strong>.
            </p>

        {:else}
            <p class="primary-insight">
                Based on your weighted priorities, <strong>{winners[0].name}</strong> is the optimal recommendation. 
                Its strongest mathematical contributing factor is its performance in <strong>{mvpCriterionName}</strong>.
            </p>

            {#if runnerUpName && decidingCriterionName}
                <p class="secondary-insight">
                    While <strong>{runnerUpName}</strong> was a competitive alternative, <strong>{winners[0].name}</strong> secured the highest rank primarily by outperforming the runner-up in <strong>{decidingCriterionName}</strong>.
                </p>
            {/if}
        {/if}

        {#if hasCostCriteria && !isSoleSurvivor}
            <div class="value-insight-box">
                
                {#if isTieBrokenByValue}
                    <p class="value-insight">
                        💡 <strong>Tie-Breaker Recommendation:</strong> While the overall scores are tied, <strong>{bestValueOptions[0].name}</strong> serves as the mathematical tie-breaker due to yielding a strictly superior benefit-to-cost ratio.
                    </p>

                {:else if isValueTie}
                    <p class="value-insight alt-value">
                        📊 <strong>Efficiency Leaders:</strong> For maximum resource efficiency, <strong>{bestValueNames}</strong> offer the highest proportional benefit-to-cost ratios among all evaluated options.
                    </p>

                {:else if isSingleWinnerAlsoBestValue}
                    <p class="value-insight">
                        🎯 <strong>Optimal Choice:</strong> Not only is <strong>{winners[0].name}</strong> the highest-scoring option overall, but it also provides the greatest resource efficiency with the highest benefit-to-cost ratio.
                    </p>

                {:else}
                    <p class="value-insight alt-value">
                        💰 <strong>Value Alternative:</strong> While {winnerNames} achieved the highest overall score, if cost-efficiency is your primary constraint, <strong>{bestValueNames}</strong> yields a superior benefit-to-cost ratio.
                    </p>
                {/if}
            </div>
        {/if}

    </div>
{/if}

<style>
    .insight-card {
        background: linear-gradient(135deg, #f6f8fd 0%, #f1f5f9 100%);
        border-left: 5px solid #3b82f6;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    h3 {
        margin-top: 0;
        color: #1e293b;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    p {
        color: #334155;
        line-height: 1.6;
        font-size: 1.05rem;
    }

    .primary-insight {
        margin-bottom: 0.75rem;
    }

    .secondary-insight {
        margin: 0;
        font-size: 0.95rem;
        color: #475569;
        border-top: 1px solid #e2e8f0;
        padding-top: 0.75rem;
    }

    strong {
        color: #0f172a;
        background-color: #e2e8f0;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
    }

    /* Highlight for sole survivor option */
    .sole-survivor-text strong {
        color: #16a34a; 
    }

    /* Styles for value-based insights */
    .value-insight-box {
        margin-top: 1.25rem;
        padding-top: 1rem;
        border-top: 1px dashed #cbd5e1;
    }
    .value-insight {
        font-size: 0.95rem;
        color: #15803d; /* Green for value/money */
        margin: 0;
        line-height: 1.5;
    }

    .alt-value {
        color: #6d28d9; /* Purple for the alternative option */
    }
    
    /* Styles for tie states */
    .tie-text strong {
        color: #b45309; /* Deep amber to indicate a warning/unresolved state */
        background-color: #fef3c7;
    }

</style>