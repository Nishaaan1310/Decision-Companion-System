<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    // 1. Props passed from the parent grid
    export let value: number | undefined = undefined; 
    export let criterionName: string; // Used for clean accessibility labeling
    export let optionName: string;    // Used for clean accessibility labeling

    const dispatch = createEventDispatcher();
    
    // Generate a unique ID for this specific input field
    const inputId = `cell-${Math.random().toString(36).substring(2, 9)}`;

    // 2. Handle the user typing a number
    function handleInput(event: Event) {
        const target = event.target as HTMLInputElement;
        const parsedValue = parseFloat(target.value);
        
        // Broadcast the new number up to the main page
        dispatch('update', {
            value: isNaN(parsedValue) ? undefined : parsedValue
        });
    }
</script>

<div class="cell-wrapper">
    <label class="sr-only" for={inputId}>Enter {criterionName} for {optionName}</label>
    <input 
        id={inputId}
        type="number" 
        step="any"
        placeholder="0.0" 
        value={value ?? ''} 
        on:input={handleInput}
        class="data-input"
    />
</div>

<style>
    .cell-wrapper {
        display: flex;
        width: 100%;
    }
    
    /* Standard utility class to hide elements visually but keep them readable by machines */
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
</style>