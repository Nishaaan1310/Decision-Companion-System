<script lang="ts">

    // 1. Component Props (Data passed down from the parent)
    export let criterionA: string; // The human-readable name (e.g., "Cost")
    export let criterionB: string; // The human-readable name (e.g., "Speed")
    export let idA: string;        // The internal ID (e.g., "c1")
    export let idB: string;        // The internal ID (e.g., "c2")


    // NEW: Receive the saved AHP math from the global store
    export let savedValue: number = 1;
    export let savedFavored: string | null = null;

    // 2. The internal state of the HTML slider (-8 to +8)
    // 0 represents the exact center (Equal Importance)
    export let sliderPosition: number = 0; 


    // NEW: The standard modern Svelte prop for passing events
    export let onChange: (detail: { idA: string, idB: string, favored: string, value: number }) => void;

    // NEW: The Reverse Translation Engine!


    $: {
        if (savedValue === 1) {
            sliderPosition = 0; // Dead center
        } else if (savedFavored === idA) {
            sliderPosition = -(savedValue - 1); // Snap left
        } else if (savedFavored === idB) {
            sliderPosition = savedValue - 1; // Snap right
        }
    }
    // 4. The Translation Engine: Converts slider position to AHP math
    function handleSlide() {
        let ahpValue = 1;
        let favoredId = idA; // Default to A

        if (sliderPosition < 0) {
            // Moving left (negative numbers) means the user favors Criterion A
            // Math.abs turns -4 into 4, then we add 1 to get an AHP score of 5
            ahpValue = Math.abs(sliderPosition) + 1;
            favoredId = idA;
        } else if (sliderPosition > 0) {
            // Moving right (positive numbers) means the user favors Criterion B
            ahpValue = sliderPosition + 1;
            favoredId = idB;
        } else {
            // Dead center
            ahpValue = 1;
        }

        // Execute the callback function passed down from the parent
        if (onChange) {
            onChange({ 
                idA: idA, 
                idB: idB, 
                favored: favoredId,
                value: ahpValue 
            });
        }
    }
</script>

<div class="slider-container">
    <div class="labels">
        <span class="label-left">{criterionA}</span>
        <span class="label-center">Equal</span>
        <span class="label-right">{criterionB}</span>
    </div>

    <input
        type="range"
        min="-8"
        max="8"
        step="1"
        bind:value={sliderPosition}
        on:input={handleSlide}
        class="ahp-range"
    />

    <div class="scale-marks">
        <span>9</span><span>7</span><span>5</span><span>3</span><span>1</span><span>3</span><span>5</span><span>7</span><span>9</span>
    </div>
</div>

<style>
    .slider-container {
        margin: 2rem 0;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 8px;
    }
    .labels {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-weight: 600;
        font-size: 1.1rem;
    }
    .label-center {
        font-size: 0.9rem;
        color: #6b7280;
        font-weight: normal;
    }
    .ahp-range {
        width: 100%;
        cursor: pointer;
    }
    .scale-marks {
        display: flex;
        justify-content: space-between;
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #9ca3af;
    }
</style>