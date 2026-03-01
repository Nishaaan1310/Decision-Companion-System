<script lang="ts">
    // 1. Import the store to read the current list, and the actions to modify it
    import { criteriaStore, addCriterion, removeCriterion, updateCriterion, updateCriterionDealbreaker } from '$lib/stores/decisionStore';
    import type { Criterion } from '$lib/stores/decisionStore';

    // 2. Local state to track what the user is currently typing
    let newCriterionName = '';
    let editIsCost: boolean = false;
    // --- NEW: Local State for Inline Editing ---
    let editingId: string | null = null;
    let editName: string = '';

    // NEW: Local state for displaying validation errors
    let errorMessage = '';

// --- NEW: Local State for Dealbreaker Editing ---
    let editHasDealbreaker: boolean = false;
    let editDealbreakerType: 'min' | 'max' = 'max';
    let editDealbreakerValue: number | string = ''; // string allows the input box to be completely empty

    // NEW: The core validation engine (case-insensitive)
    function isDuplicate(nameToCheck: string, ignoreId: string | null = null): boolean {
        const normalized = nameToCheck.trim().toLowerCase();
        return $criteriaStore.some(
            c => c.name.toLowerCase() === normalized && c.id !== ignoreId
        );
    }
    
    // 3. Local state to track the polarity toggle (defaults to Benefit/false)
    let isCost = false;
    

    // 4. The function triggered when the user clicks the "Add" button
    function handleAdd() {
            errorMessage = ''; // Clear previous errors
            const trimmed = newCriterionName.trim();
            
            if (trimmed !== '') {
                // Check the gate
                if (isDuplicate(trimmed)) {
                    errorMessage = `A criterion named "${trimmed}" already exists.`;
                    return; // Stop execution, do not add to store
                }

                addCriterion(trimmed, isCost);
                newCriterionName = '';
                isCost = false;
            }
        }

    // --- NEW: Edit Handlers ---
    function startEdit(criterion: Criterion) {
        editingId = criterion.id; // Lock the UI into edit mode for this specific row
        editName = criterion.name; // Pre-fill the input box with the current name
        editIsCost = criterion.isCost; // Grab the existing Cost/Benefit status
        // Load dealbreaker data (with safe fallbacks if it's undefined)
        editHasDealbreaker = criterion.hasDealbreaker || false;
        // Smart default: If it's a Cost, they probably want a 'max' limit. If Benefit, a 'min' limit.
        editDealbreakerType = criterion.dealbreakerType || (criterion.isCost ? 'max' : 'min');
        editDealbreakerValue = criterion.dealbreakerValue ?? '';
    }

    function saveEdit() {
        errorMessage = ''; // Clear previous errors
        const trimmed = editName.trim();

        if (trimmed && editingId) {
            // Check the gate (ignoring its own ID so saving without changes works)
            if (isDuplicate(trimmed, editingId)) {
                errorMessage = `Name "${trimmed}" is already taken.`;
                return; // Keep them in edit mode until they fix it
            }

            updateCriterion(editingId, trimmed, editIsCost);
            // 2. Parse and save the dealbreaker info safely
            const parsedVal = editDealbreakerValue === '' ? undefined : Number(editDealbreakerValue);
            updateCriterionDealbreaker(editingId, editHasDealbreaker, editDealbreakerType, parsedVal);
        }
        editingId = null; 
    }

    function cancelEdit() {
        errorMessage = ''; // Clear any errors generated while editing
        editingId = null; 
    }
    
</script>

<div class="builder-container">
    <h3>Define Decision Criteria</h3>
    
    <div class="input-group">
        <div class="input-wrapper">
            <label for="criterion-name" class="sr-only">Criterion Name</label>
            <input 
                id="criterion-name"
                type="text" 
                placeholder="e.g., Cost, Performance, Risk..." 
                bind:value={newCriterionName}
                class="name-input"
                disabled={$criteriaStore.length >= 10}
                on:keydown={(e) => e.key === 'Enter' && newCriterionName.trim() !== '' && $criteriaStore.length < 10 && handleAdd()}
            />
        </div>

        <div class="input-wrapper">
            <label for="criterion-type" class="sr-only">Criterion Type</label>
            <select id="criterion-type" bind:value={isCost} class="type-select" disabled={$criteriaStore.length >= 10}>
                <option value={false}>Benefit (Higher is Better)</option>
                <option value={true}>Cost (Lower is Better)</option>
            </select>
        </div>

        <button 
            class="add-btn" 
            on:click={handleAdd} 
            disabled={newCriterionName.trim() === '' || $criteriaStore.length >= 10}
            title={$criteriaStore.length >= 10 ? 'Maximum criteria reached' : (newCriterionName.trim() === '' ? 'Enter a name to unlock' : 'Add Criterion')}
        >
            {$criteriaStore.length >= 10 ? 'MAXIMUM REACHED' : (newCriterionName.trim() === '' ? '🔒 Locked' : '+ Add')}
        </button>
    </div>
    
    {#if $criteriaStore.length >= 10}
        <div class="limit-warning">
            ⚠️ Maximum limit reached (10). AHP mathematics are most accurate with 9 or fewer criteria.
        </div>
    {/if}

    {#if errorMessage}
        <p class="error-message">
            🚨 {errorMessage}
        </p>
    {/if}
    

    {#if $criteriaStore.length > 0}
        <ul class="criteria-list">
            {#each $criteriaStore as criterion (criterion.id)}
                <li class="criterion-item">
                    
                    {#if editingId === criterion.id}
                        
                        <div class="edit-mode">
                            <input 
                                type="text" 
                                bind:value={editName} 
                                class="edit-input"
                                on:keydown={(e) => e.key === 'Enter' && saveEdit()}
                            />
                            <button 
                                class="toggle-btn {editIsCost ? 'cost' : 'benefit'}" 
                                on:click={() => editIsCost = !editIsCost}
                            >
                                {editIsCost ? 'Cost' : 'Benefit'}
                            </button>

                            <div class="dealbreaker-config">
                                <label class="dealbreaker-toggle">
                                    <input type="checkbox" bind:checked={editHasDealbreaker} />
                                    Set Hard Constraint (Dealbreaker)
                                </label>

                                {#if editHasDealbreaker}
                                    <div class="dealbreaker-inputs">
                                        <select bind:value={editDealbreakerType} class="type-select-mini">
                                            <option value="min">Must be at least</option>
                                            <option value="max">Must be less than</option>
                                        </select>
                                        <input 
                                            type="number" 
                                            placeholder="e.g., 1500" 
                                            bind:value={editDealbreakerValue} 
                                            class="value-input-mini"
                                        />
                                    </div>
                                {/if}
                            </div>

                            <div class="actions">
                                <button class="save-btn" on:click={saveEdit}>Save</button>
                                <button class="cancel-btn" on:click={cancelEdit}>Cancel</button>
                            </div>
                        </div>

                    {:else}
                        
                        <div class="read-mode">
                            <div class="item-info">
                                <span class="criterion-name">{criterion.name}</span>
                                
                                <span class="item-badge {criterion.isCost ? 'badge-cost' : 'badge-benefit'}">
                                    {criterion.isCost ? 'Cost' : 'Benefit'}
                                </span>
                                {#if criterion.hasDealbreaker && criterion.dealbreakerValue !== undefined}
                                    <span class="dealbreaker-badge">
                                        ⚠️ {criterion.dealbreakerType === 'max' ? '<=' : '>='} {criterion.dealbreakerValue}
                                    </span>
                                {/if}
                            </div>
                            
                            <div class="actions">
                                <button class="edit-btn" on:click={() => startEdit(criterion)}>
                                    Edit
                                </button>
                                
                                <button class="remove-btn" on:click={() => removeCriterion(criterion.id)}>
                                    Delete
                                </button>
                            </div>
                        </div>

                    {/if}
                    
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .builder-container {
        background: #ffffff;
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        margin-bottom: 2rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    h3 {
        margin-top: 0;
        margin-bottom: 1rem;
        color: #111827;
        font-size: 1.25rem;
    }
    .input-group {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
    }
    .input-wrapper {
        flex: 1;
        min-width: 200px;
    }
    /* Standard utility for clean accessibility */
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0,0,0,0);
        border: 0;
    }
    .name-input, .type-select {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-family: inherit;
        background-color: #f9fafb;
        transition: all 0.2s;
    }
    .name-input:focus, .type-select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        background-color: #ffffff;
    }
    .add-btn {
        padding: 0 1.5rem;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        background-color: #3b82f6;
        color: white;
    }
    .add-btn:hover:not(:disabled) {
        background-color: #2563eb;
    }
    /* Explicit locked/greyed out state to prevent redundant actions */
    .add-btn:disabled {
        background-color: #e5e7eb;
        color: #9ca3af;
        cursor: not-allowed;
    }
    .criteria-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .criterion-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
    }
    .item-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .item-badge {
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        border-radius: 999px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .badge-cost {
        background: #fef2f2;
        color: #ef4444;
    }
    .badge-benefit {
        background: #f0fdf4;
        color: #22c55e;
    }
    .remove-btn {
        background: transparent;
        border: none;
        color: #ef4444;
        font-size: 0.875rem;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        transition: background 0.2s;
    }
    .remove-btn:hover {
        background: #fef2f2;
    }

    /* --- NEW EDIT MODE STYLES --- */
    .read-mode, .edit-mode {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    }
    .edit-mode {
        gap: 1rem;
    }
    .edit-input {
        flex: 1;
        padding: 0.5rem;
        border: 2px solid #3b82f6;
        border-radius: 4px;
        font-family: inherit;
        font-size: 1rem;
        outline: none;
    }
    .actions {
        display: flex;
        gap: 0.5rem;
    }
    .edit-btn {
        background: transparent;
        border: 1px solid #d1d5db;
        color: #4b5563;
        font-size: 0.875rem;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        transition: all 0.2s;
    }
    .edit-btn:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
    }
    .save-btn {
        background: #10b981;
        border: none;
        color: white;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        padding: 0.35rem 0.75rem;
        border-radius: 4px;
        transition: background 0.2s;
    }
    .save-btn:hover {
        background: #059669;
    }
    .cancel-btn {
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        color: #4b5563;
        font-size: 0.875rem;
        cursor: pointer;
        padding: 0.35rem 0.75rem;
        border-radius: 4px;
        transition: background 0.2s;
    }
    .cancel-btn:hover {
        background: #e5e7eb;
    }

    .limit-warning {
        color: #b45309; /* Deep orange */
        background-color: #fffbeb;
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.875rem;
        border: 1px solid #fde68a;
        text-align: center;
        font-weight: 500;
    }

    .error-message {
    color: #dc3545; /* Standard error red */
    font-size: 0.85rem;
    margin-top: 0.5rem;
    font-weight: bold;
    }
</style>