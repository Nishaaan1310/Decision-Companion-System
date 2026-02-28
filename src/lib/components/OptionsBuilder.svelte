<script lang="ts">
    import { optionsStore, addOption, removeOption, updateOptionName } from '$lib/stores/decisionStore';

    let newOptionName = '';

    // State for inline editing
    let editingId: string | null = null;
    let editName: string = '';

    // The validation error state
    let errorMessage = '';

    // The core validation engine for Options
    function isDuplicate(nameToCheck: string, ignoreId: string | null = null): boolean {
        const normalized = nameToCheck.trim().toLowerCase();
        return $optionsStore.some(
            opt => opt.name.toLowerCase() === normalized && opt.id !== ignoreId
        );
    }

    function handleAdd() {
        errorMessage = ''; // Clear previous errors
        const trimmed = newOptionName.trim();

        if (trimmed !== '') {
            // Check the validation gate
            if (isDuplicate(trimmed)) {
                errorMessage = `An option named "${trimmed}" already exists.`;
                return; // Abort the save
            }

            addOption(trimmed);
            newOptionName = ''; // Reset input
        }
    }

    function startEdit(opt: any) {
        editingId = opt.id;
        editName = opt.name;
        errorMessage = '';
    }

    function saveEdit() {
        errorMessage = ''; // Clear previous errors
        const trimmed = editName.trim();

        if (trimmed && editingId) {
            // Check the gate (ignoring its own ID)
            if (isDuplicate(trimmed, editingId)) {
                errorMessage = `Name "${trimmed}" is already taken.`;
                return; // Abort the save, stay in edit mode
            }

            // Assuming you have an updateOptionName function in your store. 
            // If not, we can write it!
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
    <div class="add-section">
        <input 
            type="text" 
            bind:value={newOptionName} 
            placeholder="e.g., Car A, Vendor B, Software C..."
            on:keydown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button class="add-btn" on:click={handleAdd}>Add</button>
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
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .add-section {
        display: flex;
        gap: 0.5rem;
    }

    input[type="text"] {
        flex-grow: 1;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
    }

    button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: background-color 0.2s;
    }

    .add-btn { background-color: #007bff; color: white; }
    .add-btn:hover { background-color: #0056b3; }

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
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        padding: 0.5rem;
    }

    .view-mode, .edit-mode {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .item-name {
        flex-grow: 1;
        font-weight: 500;
    }

    .actions { display: flex; gap: 0.25rem; }

    .edit-btn { background-color: #ffc107; color: #212529; padding: 0.25rem 0.5rem; }
    .delete-btn { background-color: #dc3545; color: white; padding: 0.25rem 0.5rem; }
    .save-btn { background-color: #28a745; color: white; }
    .cancel-btn { background-color: #6c757d; color: white; }
</style>