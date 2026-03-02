<script lang="ts">
    // Store imports and actions
    import { criteriaStore, addCriterion, removeCriterion, updateCriterion, updateCriterionDealbreaker, updateCriterionScale } from '$lib/stores/decisionStore';
    import type { Criterion } from '$lib/stores/decisionStore';

    // Local input state
    let newCriterionName = '';
    // Polarity toggle state (default: Benefit)
    let isCost = false;

    // Dealbreaker creation state
    let newHasDealbreaker: boolean = false;
    let newDealbreakerType: 'min' | 'max' = 'max';
    let newDealbreakerValue: number | string = '';

    // Inline editing state
    let editingId: string | null = null;
    let editName: string = '';
    
    // Dealbreaker editing state
    let editHasDealbreaker: boolean = false;
    let editDealbreakerType: 'min' | 'max' = 'max';
    let editDealbreakerValue: number | string = ''; // Allows empty input box
    let editIsCost: boolean = false;
    let editIsSubjective: boolean = false;

    // Subjective scale creation state
    let newIsSubjective: boolean = false;
    let defaultScale = [
        { label: 'Poor', value: 1 },
        { label: 'Fair', value: 2 },
        { label: 'Average', value: 3 },
        { label: 'Good', value: 4 },
        { label: 'Excellent', value: 5 }
    ];

    // Validation error state
    let errorMessage = '';

    // Duplicate validation (case-insensitive)
    function isDuplicate(nameToCheck: string, ignoreId: string | null = null): boolean {
        const normalized = nameToCheck.trim().toLowerCase();
        return $criteriaStore.some(
            c => c.name.toLowerCase() === normalized && c.id !== ignoreId
        );
    }
    

    // Add criterion handler
    function handleAdd() {
        errorMessage = ''; // Reset error state
        const trimmed = newCriterionName.trim();
        
        if (trimmed !== '') {
            // Validate duplicate entry
            if (isDuplicate(trimmed)) {
                errorMessage = `A criterion named "${trimmed}" already exists.`;
                return; // Cancel save operation
            }

            // Parse dealbreaker value
            const parsedVal = newDealbreakerValue === '' ? undefined : Number(newDealbreakerValue);
            // Determine subjective scale
            const scaleToSave = newIsSubjective ? defaultScale : undefined;

            // Persist new criterion
            addCriterion(trimmed, isCost, newHasDealbreaker, newDealbreakerType, parsedVal, scaleToSave);
            
            // Reset form state
            newCriterionName = '';
            isCost = false;
            newHasDealbreaker = false;
            newDealbreakerType = 'max';
            newDealbreakerValue = '';
            // Reset subjective toggle
            newIsSubjective = false;
        }
    }

    // Edit mode handlers
    function startEdit(criterion: Criterion) {
        editingId = criterion.id; // Lock UI for editing
        editName = criterion.name; // Pre-fill input
        editIsCost = criterion.isCost; // Load polarity status
        
        // Load existing dealbreaker data
        editHasDealbreaker = criterion.hasDealbreaker || false;
        // Intelligent dealbreaker type default based on polarity
        editDealbreakerType = criterion.dealbreakerType || (criterion.isCost ? 'max' : 'min');
        editDealbreakerValue = criterion.dealbreakerValue ?? '';
        
        // Load subjective scale state
        editIsSubjective = !!(criterion.qualitativeScale && criterion.qualitativeScale.length > 0);
    }

    function saveEdit() {
        errorMessage = ''; // Reset error state
        const trimmed = editName.trim();

        if (trimmed && editingId) {
            // Validate against duplicates excluding self
            if (isDuplicate(trimmed, editingId)) {
                errorMessage = `Name "${trimmed}" is already taken.`;
                return; // Keep edit mode active on invalid input
            }

            updateCriterion(editingId, trimmed, editIsCost);
            
            // Parse and save dealbreaker config
            const parsedVal = editDealbreakerValue === '' ? undefined : Number(editDealbreakerValue);
            updateCriterionDealbreaker(editingId, editHasDealbreaker, editDealbreakerType, parsedVal);
            
            // Save subjective scale config
            const scaleToSave = editIsSubjective ? defaultScale : undefined;
            updateCriterionScale(editingId, scaleToSave);
        }
        editingId = null; 
    }

    function cancelEdit() {
        errorMessage = ''; // Clear errors on cancel
        editingId = null; 
    }
    
</script>

<div class="builder-container">
    <h3>Define Decision Criteria</h3>
    
    <div class="builder-form">
        <div class="input-row">
            <div class="input-wrapper">
                <label for="criterion-name" class="sr-only">Criterion Name</label>
                <input 
                    id="criterion-name"
                    type="text" 
                    placeholder="e.g., Cost, Performance..." 
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
        </div>

        <div class="dealbreaker-row">
            <label class="dealbreaker-checkbox-label">
                <input 
                    type="checkbox" 
                    bind:checked={newHasDealbreaker}
                    disabled={$criteriaStore.length >= 10}
                />
                <span>Add a Hard Constraint (Dealbreaker)</span>
            </label>

            {#if newHasDealbreaker}
                <div class="dealbreaker-inline-fields">
                    <span class="db-text">Must be</span>
                    <select bind:value={newDealbreakerType} class="db-select">
                        <option value="max">Less than or equal to (≤)</option>
                        <option value="min">Greater than or equal to (≥)</option>
                    </select>
                    <input 
                        type="number" 
                        placeholder="e.g., 1500" 
                        bind:value={newDealbreakerValue} 
                        class="db-input"
                        on:keydown={(e) => e.key === 'Enter' && newCriterionName.trim() !== '' && $criteriaStore.length < 10 && handleAdd()}
                    />
                </div>
            {/if}
        </div>

        <div class="subjective-row">
            <label class="subjective-checkbox-label">
                <input 
                    type="checkbox" 
                    bind:checked={newIsSubjective}
                    disabled={$criteriaStore.length >= 10}
                />
                <span>Use Subjective Scale (Text instead of Numbers)</span>
            </label>

            {#if newIsSubjective}
                <div class="subjective-preview">
                    <span class="preview-text">
                        <strong>Preview:</strong> You will select from: Poor (1), Fair (2), Average (3), Good (4), Excellent (5).
                    </span>
                </div>
            {/if}
        </div>

        <button 
            class="add-btn form-submit-btn" 
            on:click={handleAdd} 
            disabled={newCriterionName.trim() === '' || $criteriaStore.length >= 10}
            title={$criteriaStore.length >= 10 ? 'Maximum criteria reached' : (newCriterionName.trim() === '' ? 'Enter a name to unlock' : 'Add Criterion')}
        >
            {$criteriaStore.length >= 10 ? 'MAXIMUM REACHED' : (newCriterionName.trim() === '' ? '🔒 Locked' : '+ Add Criterion')}
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

                            <div class="subjective-config">
                                <label class="subjective-toggle">
                                    <input type="checkbox" bind:checked={editIsSubjective} />
                                    Use Subjective Scale (Text instead of Numbers)
                                </label>
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

                                {#if criterion.qualitativeScale && criterion.qualitativeScale.length > 0}
                                    <span class="subjective-badge">
                                        📝 Text Scale
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
 
    .input-wrapper {
        flex: 1;
        min-width: 200px;
    }
    /* Accessibility utility */
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
    /* Disabled state styling */
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

    /* Edit mode styles */
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
        color: #b45309; /* Warning color */
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
    color: #dc3545; /* Error color */
    font-size: 0.85rem;
    margin-top: 0.5rem;
    font-weight: bold;
    }

    /* Creation Dealbreaker Styles */
   

    .dealbreaker-checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        user-select: none;
    }

    .dealbreaker-inline-fields {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-left: 1.5rem; /* Indent subordinate fields */
        background-color: #f9fafb;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
    }

    .db-text {
        font-size: 0.875rem;
        color: #374151;
        font-weight: 500;
    }

    .db-select, .db-input {
        padding: 0.4rem 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.875rem;
    }

    .db-input {
        width: 120px;
    }

    .builder-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background-color: #ffffff;
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
    }

    .input-row {
        display: flex;
        gap: 1rem;
    }

    /* Distribute input wrapper space */
    .input-wrapper {
        flex: 1; 
        display: flex;
        flex-direction: column;
    }

    .name-input, .type-select {
        width: 100%;
        padding: 0.6rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 1rem;
    }

    .dealbreaker-row {
        background-color: #f9fafb;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .form-submit-btn {
        width: 100%; /* Full width anchor button */
        padding: 0.75rem;
        font-size: 1rem;
        font-weight: 600;
        justify-content: center;
        margin-top: 0.5rem;
    }

    /* Subjective Row Styles */
    .subjective-row {
        background-color: #f9fafb;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .subjective-checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        user-select: none;
    }

    .subjective-preview {
        margin-left: 1.5rem;
        padding: 0.5rem 0.75rem;
        background-color: #f3f4f6;
        border-radius: 4px;
        border-left: 3px solid #3b82f6; /* Info accent border */
    }

    .preview-text {
        font-size: 0.8rem;
        color: #4b5563;
    }

    /* Subjective Edit Mode Styles */
    .subjective-config {
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px dotted #cbd5e1;
    }

    .subjective-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: #475569;
        cursor: pointer;
    }

    /* Badge for Read Mode */
    .subjective-badge {
        background-color: #e0e7ff;
        color: #4338ca;
        padding: 0.2rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 600;
        margin-left: 0.5rem;
    }

</style>