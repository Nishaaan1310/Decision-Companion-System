<script lang="ts">
    import { criteriaStore, optionsStore, updateOptionScore } from '$lib/stores/decisionStore';
    import DataCell from '$lib/components/DataCell.svelte';
</script>
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
                            <span class="polarity-badge {criterion.isCost ? 'cost' : 'benefit'}">
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
                                    qualitativeScale={criterion.qualitativeScale}
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

<style>
    .data-grid-section {
        margin-top: 2rem;
        padding: 1.5rem;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .grid-header {
        margin-bottom: 1.5rem;
    }

    .grid-header h2 {
        margin: 0;
        font-size: 1.25rem;
        color: #111827;
    }

    .table-container {
        overflow-x: auto; /* Enable horizontal scrolling for responsive layout */
    }

    .data-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 600px; /* Minimum width to preserve column legibility */
    }

    .data-table th, .data-table td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
    }

    .data-table th {
        background-color: #f9fafb;
        font-weight: 600;
        color: #374151;
        white-space: nowrap;
    }

    .polarity-badge {
        font-size: 0.75rem;
        font-weight: 500;
        margin-left: 0.25rem;
    }

    .polarity-badge.cost {
        color: #dc2626;
    }

    .polarity-badge.benefit {
        color: #16a34a;
    }

    .option-name-cell {
        background-color: #f9fafb;
        border-right: 1px solid #e5e7eb;
        min-width: 150px;
        color: #111827;
    }
</style>