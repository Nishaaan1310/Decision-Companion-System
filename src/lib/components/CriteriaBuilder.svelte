<script lang="ts">
    // 1. Import the store to read the current list, and the actions to modify it
    import { criteriaStore } from '$lib/stores/decisionStore';
    import { addCriterion, removeCriterion, updateCriterion } from '$lib/stores/decisionStore';

    // 2. Local state to track what the user is currently typing
    let newCriterionName = '';
    let editIsCost: boolean = false;
    // --- NEW: Local State for Inline Editing ---
    let editingId: string | null = null;
    let editName: string = '';
    
    // 3. Local state to track the polarity toggle (defaults to Benefit/false)
    let isCost = false;

    // 4. The function triggered when the user clicks the "Add" button
    function handleAdd() {
        // Prevent empty or whitespace-only criteria from entering the math engine
        if (newCriterionName.trim() !== '') {
            addCriterion(newCriterionName, isCost);
            
            // Clean up: Reset the input fields so the user can easily type the next one
            newCriterionName = '';
            isCost = false;
        }
    }

    // --- NEW: Edit Handlers ---
    function startEdit(criterion: { id: string, name: string, isCost: boolean }) {
        editingId = criterion.id; // Lock the UI into edit mode for this specific row
        editName = criterion.name; // Pre-fill the input box with the current name
        editIsCost = criterion.isCost; // Grab the existing Cost/Benefit status
    }

    function saveEdit() {
        if (editName.trim() && editingId) {
            // Pass the editIsCost variable into the global function
            updateCriterion(editingId, editName.trim(), editIsCost);
        }
        editingId = null; // Exit edit mode
    }

    function cancelEdit() {
        editingId = null; // Abort and hide the input box
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
            />
        </div>

        <div class="input-wrapper">
            <label for="criterion-type" class="sr-only">Criterion Type</label>
            <select id="criterion-type" bind:value={isCost} class="type-select">
                <option value={false}>Benefit (Higher is Better)</option>
                <option value={true}>Cost (Lower is Better)</option>
            </select>
        </div>

        <button 
            class="add-btn" 
            on:click={handleAdd} 
            disabled={newCriterionName.trim() === ''}
            title={newCriterionName.trim() === '' ? 'Enter a name to unlock' : 'Add Criterion'}
        >
            {newCriterionName.trim() === '' ? '🔒 Locked' : '+ Add'}
        </button>
    </div>

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
</style>