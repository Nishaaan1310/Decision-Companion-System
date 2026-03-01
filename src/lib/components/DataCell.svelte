<script lang="ts">
    import type { ScoreValue } from '$lib/stores/decisionStore';

    // 1. Props (Updated to accept the flexible ScoreValue)
    export let value: ScoreValue | undefined = undefined; 
    export let criterionName: string; 
    export let optionName: string; 
    
    // NEW: The optional text-to-math dictionary
    export let qualitativeScale: { label: string, value: number }[] | undefined = undefined;
    // The dispatcher function passed down from +page.svelte
    export let onUpdate: ((detail: { value: ScoreValue | undefined }) => void) = () => {};

    // 2. RESTORED: Your unique ID generation!
    const inputId = `cell-${Math.random().toString(36).substring(2, 9)}`;

    // 3. The display string for our new text input
    let displayValue = '';

    // NEW: The "Lock" that prevents the database from overwriting the box while we type
    let isTyping = false;

    // 4. REACTIVE SYNC: If the database value changes, update the text box display
    // REACTIVE SYNC: Only format the box if the user is NOT actively typing in it
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

    // 5. RESTORED & UPDATED: Your empty warning logic! 
    // We now check our string displayValue instead of the raw number
    $: isEmpty = (qualitativeScale && qualitativeScale.length > 0)
        ? (value === undefined || value === null) 
        : (displayValue.trim() === '');

    // TEMPORARY DEBUG: Calculate the average for visual confirmation
    $: debugAverage = (typeof value === 'object' && value !== null) 
        ? (value.min + value.max) / 2 
        : null;

    // 6. THE PARSER: Runs when the user leaves the text box or hits Enter
    // THE SMART REAL-TIME PARSER (Fires on every keystroke)
    function handleInput(event: Event){
        isTyping = true; // Lock the text box!
        const target = event.target as HTMLInputElement;
        displayValue = target.value;
        const trimmed = displayValue.trim();

        if (trimmed === '') {
            onUpdate({ value: undefined });
            return;
        }

        // Scenario B: Check if it's a range (e.g., "10-20", "10~20", "10 to 20")
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

        // Scenario 2: Is it an INCOMPLETE range? (e.g., "10-" or "10 to ")
        const isIncompleteRange = /^[\d.]+\s*[-~|to]+\s*$/i.test(trimmed);
        if (isIncompleteRange) {
            // Do absolutely nothing. Patiently let them finish typing.
            return; 
        }

        // Scenario C: If it's not a range, try parsing it as a single standard number
        // Scenario 3: Is it a strict, single number? (e.g., "15")
        // We use Number() instead of parseFloat() because Number("15-") is strictly NaN.
        const singleNumber = Number(trimmed); 
        if (!isNaN(singleNumber)) {
            onUpdate({ value: singleNumber });
        }
    }
            // Failsafe Scenario D: They typed pure text like "apples"
            // Revert the text box back to whatever the last valid database value was.
            // When they finally click away from the box
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
    // --- NEW: DROPDOWN LOGIC ---
    function handleSelectChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        const selectedValue = target.value;
        
        if (selectedValue === '') {
            onUpdate({ value: undefined });
        } else {
            // Silently convert their text choice back into the math engine's number!
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

    {#if debugAverage !== null}
        <span class="debug-badge">avg: {debugAverage}</span>
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

    /* RESTORED: Your empty cell warning style */
    .empty-cell {
        border: 2px solid #ffc107; 
        background-color: #fffdf5;
    }

/* NEW: Add these two rules at the very bottom of your style block */
    .relative-container {
        position: relative;
    }

    .debug-badge {
        position: absolute;
        bottom: -18px;
        right: 0;
        font-size: 0.7rem;
        color: #ef4444; /* Bright red so we know it's temporary */
        font-weight: bold;
        pointer-events: none; /* Prevents it from blocking clicks */
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
