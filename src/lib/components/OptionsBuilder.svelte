<script lang="ts">
    import { optionsStore, addOption, removeOption, updateOptionName } from '$lib/stores/decisionStore';

    let newOptionName = '';

    // Inline editing state
    let editingId: string | null = null;
    let editName: string = '';

    // Error message state
    let errorMessage = '';

    // Option duplicate validation
    function isDuplicate(nameToCheck: string, ignoreId: string | null = null): boolean {
        const normalized = nameToCheck.trim().toLowerCase();
        return $optionsStore.some(
            opt => opt.name.toLowerCase() === normalized && opt.id !== ignoreId
        );
    }

    function handleAdd() {
        errorMessage = ''; // Reset error state
        const trimmed = newOptionName.trim();

        if (trimmed !== '') {
            // Validate against existing options
            if (isDuplicate(trimmed)) {
                errorMessage = `An option named "${trimmed}" already exists.`;
                return;
            }

            addOption(trimmed);
            newOptionName = ''; 
        }
    }

    function startEdit(opt: any) {
        editingId = opt.id;
        editName = opt.name;
        errorMessage = '';
    }

    function saveEdit() {
        errorMessage = '';
        const trimmed = editName.trim();

        if (trimmed && editingId) {
            // Validate against duplicates, excluding the current option
            if (isDuplicate(trimmed, editingId)) {
                errorMessage = `Name "${trimmed}" is already taken.`;
                return;
            }

            // Persist the updated name
            updateOptionName(editingId, trimmed);
        }
        editingId = null;
    }

    function cancelEdit() {
        errorMessage = ''; 
        editingId = null;
    }
</script>
<div class="builder-container">
    <div class="header-section">
        <h3>Add Competing Options</h3>
        <p class="subtitle">Enter the alternatives you want to evaluate and compare.</p>
    </div>

    <div class="add-section">
        <input 
            type="text" 
            bind:value={newOptionName} 
            class="name-input"
            placeholder="e.g., Car A, Vendor B, Software C..."
            on:keydown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button 
            class="add-btn" 
            on:click={handleAdd}
            disabled={newOptionName.trim() === ''}
        >
            {newOptionName.trim() === '' ? '🔒 Locked' : '+ Add Option'}
        </button>
    </div>

    {#if errorMessage}
        <p class="error-message">
            🚨 {errorMessage}
        </p>
    {/if}

    <ul class="item-list">
        {#each $optionsStore as opt (opt.id)}
            <li>
                {#if editingId === opt.id}
                    <div class="edit-mode">
                        <input 
                            type="text" 
                            bind:value={editName}
                            class="name-input edit-input"
                            on:keydown={(e) => e.key === 'Enter' && saveEdit()}
                            on:keydown={(e) => e.key === 'Escape' && cancelEdit()}
                        />
                        <button class="save-btn" on:click={saveEdit}>Save</button>
                        <button class="cancel-btn" on:click={cancelEdit}>Cancel</button>
                    </div>
                {:else}
                    <div class="view-mode">
                        <span class="item-name">{opt.name}</span>
                        <div class="actions">
                            <button class="edit-btn" title="Edit" on:click={() => startEdit(opt)}>✎</button>
                            <button class="delete-btn" title="Delete" on:click={() => removeOption(opt.id)}>✖</button>
                        </div>
                    </div>
                {/if}
            </li>
        {/each}
    </ul>
</div>

<style>
    .builder-container {
        background: #ffffff;
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        margin-bottom: 2rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .header-section {
        margin-bottom: 0.5rem;
    }

    h3 {
        margin-top: 0;
        margin-bottom: 0.25rem;
        color: #111827;
        font-size: 1.25rem;
    }

    .subtitle {
        margin: 0;
        color: #6b7280;
        font-size: 0.875rem;
    }

    .add-section {
        display: flex;
        gap: 0.75rem;
        background-color: #f9fafb;
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        align-items: center;
    }

    .name-input {
        flex-grow: 1;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 1rem;
        font-family: inherit;
        transition: all 0.2s;
    }

    .name-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        background-color: #ffffff;
    }

    .edit-input {
        padding: 0.5rem;
    }

    .add-btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 1rem;
        background-color: #3b82f6;
        color: white;
        transition: all 0.2s;
        white-space: nowrap;
    }

    .add-btn:hover:not(:disabled) {
        background-color: #2563eb;
    }

    .add-btn:disabled {
        background-color: #e5e7eb;
        color: #9ca3af;
        cursor: not-allowed;
    }

    .error-message {
        color: #dc3545;
        font-size: 0.85rem;
        margin-top: -0.5rem;
        font-weight: bold;
    }

    .item-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    li {
        background-color: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 0.75rem 1rem;
    }

    .view-mode, .edit-mode {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .item-name {
        flex-grow: 1;
        font-weight: 500;
        color: #374151;
    }

    .actions { 
        display: flex; 
        gap: 0.5rem; 
    }

    .edit-btn, .delete-btn, .save-btn, .cancel-btn {
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.85rem;
        padding: 0.35rem 0.6rem;
        transition: background-color 0.2s;
    }

    .edit-btn { background-color: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db; }
    .edit-btn:hover { background-color: #e5e7eb; }

    .delete-btn { background-color: transparent; color: #ef4444; font-size: 1rem; padding: 0.2rem 0.5rem; }
    .delete-btn:hover { background-color: #fef2f2; }

    .save-btn { background-color: #10b981; color: white; }
    .save-btn:hover { background-color: #059669; }

    .cancel-btn { background-color: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db; }
    .cancel-btn:hover { background-color: #e5e7eb; }
</style>