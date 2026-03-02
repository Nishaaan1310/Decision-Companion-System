<script lang="ts">

    // Component properties
    export let criterionA: string; // Human-readable name
    export let criterionB: string; // Human-readable name
    export let idA: string;        // Internal ID
    export let idB: string;        // Internal ID

    // Persisted AHP data
    export let savedValue: number = 1;
    export let savedFavored: string | null = null;

    // Change event dispatcher
    export let onChange: (detail: { idA: string, idB: string, favored: string, value: number }) => void;

    // Internal slider state (-8 to +8, 0 = equal)
    export let sliderPosition: number = 0;


    $: {
        if (savedValue === 1) {
            sliderPosition = 0; // Dead center
        } else if (savedFavored === idA) {
            sliderPosition = -(savedValue - 1); // Snap left
        } else if (savedFavored === idB) {
            sliderPosition = savedValue - 1; // Snap right
        }
    }
    // Translation engine: slider position to AHP math
    function handleSlide() {
        let ahpValue = 1;
        let favoredId = idA; // Default to A

        if (sliderPosition < 0) {
            // Favor Criterion A (negative slider values)
            ahpValue = Math.abs(sliderPosition) + 1;
            favoredId = idA;
        } else if (sliderPosition > 0) {
            // Favor Criterion B (positive slider values)
            ahpValue = sliderPosition + 1;
            favoredId = idB;
        } else {
            // Equal importance
            ahpValue = 1;
        }

        // Dispatch callback
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