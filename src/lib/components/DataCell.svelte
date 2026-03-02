<script lang="ts">
    import type { ScoreValue } from '$lib/stores/decisionStore';

    // Component Properties
    export let value: ScoreValue | undefined = undefined; 
    export let criterionName: string; 
    export let optionName: string; 
    
    // Optional qualitative scale mapping
    export let qualitativeScale: { label: string, value: number }[] | undefined = undefined;
    // The dispatcher function passed down from +page.svelte
    export let onUpdate: ((detail: { value: ScoreValue | undefined }) => void) = () => {};

    // Unique ID generation for accessibility labels
    const inputId = `cell-${Math.random().toString(36).substring(2, 9)}`;

    // Display state for text input
    let displayValue = '';

    // Edit lock to prevent reactive overwrites during typing
    let isTyping = false;

    // Sync database value to display
    // Format display only when not actively typing
    $: if (!isTyping) {
        if (value === undefined || value === null) {
            displayValue = '';
        } else if (typeof value === 'number') {
            displayValue = value.toString();
        } else {
            // It's a range object! Display it nicely
            displayValue = `${value.min} - ${value.max}`;
        }
    }

    // Empty state validation logic
    $: isEmpty = (qualitativeScale && qualitativeScale.length > 0)
        ? (value === undefined || value === null) 
        : (displayValue.trim() === '');

    // Input parser: Handles raw text parsing conditionally
    function handleInput(event: Event){
        isTyping = true; // Lock the text box!
        const target = event.target as HTMLInputElement;
        displayValue = target.value;
        const trimmed = displayValue.trim();

        if (trimmed === '') {
            onUpdate({ value: undefined });
            return;
        }

        // Verify if input is a valid range (e.g., "10-20", "10~20", "10 to 20")
        // This Regex looks for two numbers separated by a dash, tilde, or the word "to"

        const rangeMatch = trimmed.match(/^([\d.]+)\s*[-~|to]+\s*([\d.]+)$/i);
        if (rangeMatch) {
            const num1 = parseFloat(rangeMatch[1]);
            const num2 = parseFloat(rangeMatch[2]);

            if (!isNaN(num1) && !isNaN(num2)) {
                onUpdate({ value: { min: Math.min(num1, num2), max: Math.max(num1, num2) } });
                return;
            }
        }

        // Check for incomplete range patterns (e.g., "10-" or "10 to ")
        const isIncompleteRange = /^[\d.]+\s*[-~|to]+\s*$/i.test(trimmed);
        if (isIncompleteRange) {
            // Do absolutely nothing. Patiently let them finish typing.
            return; 
        }

        // Attempt to parse strictly as a single standard number
        // Strict numeric parsing enforces valid entries.
        const singleNumber = Number(trimmed); 
        if (!isNaN(singleNumber)) {
            onUpdate({ value: singleNumber });
        }
    }
            // Failsafe: Handle invalid or pure text input by reverting on blur
    function handleBlur() {
        isTyping = false; // Unlock the box! Let the database format it cleanly.
        
        // Failsafe: If they left garbage text (like "abc" or "10-"), revert it
        if (value === undefined || value === null) displayValue = '';
        else if (typeof value === 'number') displayValue = value.toString();
        else displayValue = `${value.min} - ${value.max}`;
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            (event.target as HTMLElement).blur(); 
        }
    }
    // Dropdown selection handler
    function handleSelectChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        const selectedValue = target.value;
        
        if (selectedValue === '') {
            onUpdate({ value: undefined });
        } else {
            // Convert selected qualitative text to numeric engine value
            onUpdate({ value: Number(selectedValue) });
        }
    }

</script>

<div class="cell-wrapper relative-container">
    <label class="sr-only" for={inputId}>Enter {criterionName} for {optionName}</label>
    
    {#if qualitativeScale && qualitativeScale.length > 0}
        <select
            id={inputId}
            class="data-select"
            class:empty-cell={isEmpty}
            on:change={handleSelectChange}
        >
            <option value="" selected={value === undefined || value === null}>-- Select --</option>
            {#each qualitativeScale as scaleItem}
                <option value={scaleItem.value} selected={value === scaleItem.value}>
                    {scaleItem.label}
                </option>
            {/each}
        </select>
    {:else}
        <input 
            id={inputId}
            type="text" 
            placeholder="0.0 or 10-20" 
            bind:value={displayValue} 
            on:input={handleInput} 
            on:blur={handleBlur}
            on:keydown={handleKeyDown}
            class="data-input"
            class:empty-cell={isEmpty}
        />
    {/if}


</div>

<style>
    .cell-wrapper {
        display: flex;
        width: 100%;
    }
    
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
    }

    .data-input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        text-align: right;
        font-family: inherit;
        background-color: #ffffff;
        transition: all 0.2s ease-in-out;
    }

    .data-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    /* Empty cell validation styling */
    .empty-cell {
        border: 2px solid #ffc107; 
        background-color: #fffdf5;
    }

/* Tooltip and container positioning */
    .relative-container {
        position: relative;
    }

    .data-select {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.875rem;
        background-color: #ffffff;
        cursor: pointer;
    }
</style>
