<script lang="ts">
    import { criteriaStore } from '$lib/stores/decisionStore';
    import { calculateItemizedContributions, findDecidingFactor } from '$lib/engine/wsm';
    import type { RankedOption } from '$lib/engine/wsm';

    // Props passed down from the main page
    export let rankings: RankedOption[] = [];
    export let normalizedData: Record<string, Record<string, number>> = {};
    export let weights: number[] = [];

    // Local state for the generated text
    let winnerName = '';
    let runnerUpName = '';
    let mvpCriterionName = '';
    let decidingCriterionName = '';

    // NEW: State to track if this is the Last Man Standing
    let isSoleSurvivor = false;

    // The Reactive Analysis Engine
    $: {
        if (rankings.length > 0 && $criteriaStore.length > 0 && weights.length > 0) {
            const winner = rankings[0];
            winnerName = winner.name;

            // NEW: True if there is only 1 option OR if the 2nd place option is disqualified
            isSoleSurvivor = rankings.length < 2 || !!rankings[1]?.isDisqualified;
            
            const criteriaIds = $criteriaStore.map(c => c.id);

            // 1. Find the Winner's MVP (Most Valuable Criterion)
            const contributions = calculateItemizedContributions(winner.id, criteriaIds, normalizedData, weights);
            if (contributions.length > 0) {
                const mvpId = contributions[0].criterionId;
                mvpCriterionName = $criteriaStore.find(c => c.id === mvpId)?.name || 'Unknown';
            }

            // 2. Find the Deciding Factor (if there is a runner-up)
            if (!isSoleSurvivor &&rankings.length > 1) {
                const runnerUp = rankings[1];
                runnerUpName = runnerUp.name;

                const insight = findDecidingFactor(winner.id, runnerUp.id, criteriaIds, normalizedData, weights);
                if (insight) {
                    decidingCriterionName = $criteriaStore.find(c => c.id === insight.decidingCriterionId)?.name || '';
                } else {
                    decidingCriterionName = ''; // It was a perfect mathematical tie
                }
            } else {
                runnerUpName = '';
                decidingCriterionName = '';
            }
        }
    }
</script>

{#if rankings.length > 0}
    <div class="insight-card">
        <h3>💡 Decision Insight</h3>

        {#if isSoleSurvivor}
            <p class="primary-insight sole-survivor-text">
                <strong>{winnerName}</strong> is your recommended choice by default. 
                It is the <em>only</em> option that successfully met all of your hard constraints and dealbreakers!
            </p>
            <p class="secondary-insight">
                Even though it won by elimination, its strongest contributing factor based on your priorities is still its performance in <strong>{mvpCriterionName}</strong>.
            </p>

            {:else}
            
            <p class="primary-insight">
                Based on your priorities, <strong>{winnerName}</strong> is your top recommendation. 
                Its strongest contributing factor is its performance in <strong>{mvpCriterionName}</strong>.
            </p>

            {#if runnerUpName && decidingCriterionName}
                <p class="secondary-insight">
                    While <strong>{runnerUpName}</strong> was a strong alternative, <strong>{winnerName}</strong> secured the win primarily because it outperformed the runner-up significantly in <strong>{decidingCriterionName}</strong>.
                </p>
            {:else if runnerUpName && !decidingCriterionName}
                <p class="secondary-insight">
                    Fascinatingly, <strong>{winnerName}</strong> and <strong>{runnerUpName}</strong> are a perfect mathematical tie across all your criteria!
                </p>
            {/if}
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

    /* Add a subtle green highlight to celebrate finding a valid option */
    .sole-survivor-text strong {
        color: #16a34a; 
    }
</style>