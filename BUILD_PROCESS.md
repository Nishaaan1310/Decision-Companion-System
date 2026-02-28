started the project by asking AI about how to create a decision companion system and steps involved in a decision making process.

#####

(24/02/2026 20:23) currently planned system architecture components:

1. The Presentation Layer (Client): A dynamic, single-page interface where users can adjust weights and instantly see how the final rankings shift.

2. The Core API Layer: A set of RESTful endpoints that handle the business logic, validate the math (ensuring weights don't exceed 100%), and trigger the evaluation engine.

3. The Evaluation Engine: An isolated module or microservice strictly dedicated to running the Multi-Criteria Decision Analysis calculations. Keeping this separate allows you to swap or upgrade algorithms later without breaking the API.

4. The Data Layer: A relational or document database to store user sessions, historical decisions.

for the evaluation engine, the mathematic model considered are weighted sum model and Analytic Hierarchy Process (AHP).

planned to use both model and combine them into a sequential pipeline.
AHP in the first stage to help the user mathematically determine their criteria weights through pairwaise comparison. WSM engine for the second stage to score and rank the actual options based on the weights.

#####

(26/02/2026 20:43) changed the Architecture plan. Removed Api Layer, Data Layer, Microservice Evaluation Engine and decided to go with the Fully Client-Side Application.

The Presentation Layer (UI): A dynamic, single-page interface built in a modern framework. It handles state management locally in the browser, capturing criteria, AHP slider inputs, and option values.

The Evaluation Engine (Client-Side Module): Instead of a backend microservice, this is a dedicated, isolated JavaScript module running directly in the browser. It receives the payload from the UI state, calculates the AHP matrix, runs the WSM scoring, and returns the final rankings to the UI instantaneously.

#####

Framework selection:
React,Vue.js and svelet are considered for the UI. decided to use svelte framework as it is more faster due to its compiler approach and also is lightweight for a single page application.

Execution plan: (Phase 1)

1. State Management: Define the data structure to hold the criteria, AHP slider values, and raw option scores in memory.
2. The AHP Math Module: Write the pure JavaScript logic to calculate the matrix, eigenvalues, and Consistency Ratio.
3. The WSM Module: Write the logic to normalize the raw scores and multiply them by the AHP weights.
4. The UI Components: Build the bidirectional sliders and the final ranking podium.

State Management (core pieces):

1. The Criteria State: It stores A unique ID for each criterion (e.g., "crit_1"), The human-readable name (e.g., "Performance"), The Polarity Flag (is_cost: boolean), so the final WSM engine knows whether to invert the raw scores or not.

2. The AHP Matrix State (The Weights): It track the exact slider positions of the pairwise comparisons.It store a map linking two criteria IDs (e.g., "crit_1 vs crit_2"). It store the raw 1-9 AHP scale value that the user selected on the slider.

3. The Options State (The Raw Data):
   This state holds the actual choices and their real-world numbers. a unique ID and a name for each option, a nested dictionary/object mapping every criterion ID to the raw numerical score the user typed in.

Math Modules (core pieces):

1. The AHP Engine (Weight Calculator): Converts the user's subjective pairwise comparisons into a strict set of objective priority weights (percentages) for each defined criterion. It also calculates a Consistency Ratio to ensure the user's logic isn't contradictory.

2. The WSM Engine (Option Scorer): Standardizes the diverse, real-world numbers of the options (e.g., price vs. speed) onto a uniform scale. It then multiplies these standardized scores by the AHP weights to produce a mathematically grounded final ranking.

UI Components (core pieces):

1. The Pairwise Sliders: Visual components that allow users to intuitively balance the importance of two different criteria against each other on a sliding scale.

2. The Data Entry Grid: A dynamic table where users input the raw, real-world data for their various options across all defined criteria.

3. The Leaderboard: The final scoreboard that reacts instantly to any changes in priorities or raw data, displaying the mathematically optimal choice to the user.

#####

(27/02/2026 20:35) Current Progression:

Phase 1 (complete):

State Management: Set up Svelte stores to track criteria, pairwise comparisons, and options.

Math Engines: Finished the decoupled logic for both AHP (calculating normalized weights and Consistency Ratios) and WSM (normalizing scores and ranking options).

Stage 1 UI (AHP Weighting): Built the interactive `AhpSlider` component for pairwise comparisons. Integrated it into the main page so that moving the sliders instantly calculates the underlying matrix, displaying live criteria weights (%) and Consistency Ratio warnings on-screen.

Stage 2 UI (WSM Evaluation): Developed the `DataCell` component and a dynamic data grid to input raw scores for options across criteria. Integrated the WSM engine to reactively normalize scores, apply AHP weights, and calculate final rankings. Added a leaderboard to visually highlight the mathematically optimal decision.

Phase 2 Plans:

1. Browser LocalStorage Integration
2. Criteria Builder UI (note: current one uses hardcoded criterias)
3. Edge Cases & User Experience

#####

Phase 2 (27/02/2026 22:00) Progression:

**Criteria Builder:**

**Dynamic Criteria Generation:**
Replaced the hardcoded mock criteria with a fully dynamic model. The system now allows users to define custom criteria on the fly, assigning unique IDs and establishing polarity (Benefit vs. Cost).

**Cascading Deletions (The Logic Layer):**
Implemented a vital safety mechanism in the global state (`decisionStore.ts`). When a user deletes a criterion, the system performs a cascading surgical sweep:

1. It removes the criterion from the main list.
2. It sweeps the AHP memory (`comparisonsStore`), destroying any pairwise slider data associated with the deleted criterion.
3. It sweeps the WSM memory (`optionsStore`), cleanly deleting the orphaned raw score column from every single option.
   This guarantees the mathematical engines never crash trying to calculate data for a criterion that no longer exists.

**CriteriaBuilder Component (The Presentation Layer):**
Built an isolated, clean UI component that sits at the top of the dashboard. It features strict input validation (locking the add button if empty) and seamlessly triggers the cascading deletion logic when removing items. The rest of the dashboard (`+page.svelte`) reacts instantly to these changes, auto-generating the appropriate sliders and data grids.

(28/02/2026 12:00) Progression:

**Data Persistence (LocalStorage API Wrapper):**

1. **The DRY Factory Function (`createPersistentStore`):**
   Instead of repeatedly writing save/load logic, built a single wrapper function to enhance Svelte's native `writable` stores.

- _Load Phase_: On boot, it checks the browser's disk for existing JSON data and hydrates the memory.
- _Save Phase_: It attaches a `.subscribe()` listener to the store, silently serializing and saving data to disk every time a user makes a change (e.g., sliding a weight or typing a score).

2. **SSR Safety Check:**
   Since SvelteKit uses Server-Side Rendering (SSR) by default, attempting to access `localStorage` on the server would crash the app. The wrapper implements a strict `typeof window !== 'undefined'` guard to ensure storage logic only executes within the user's browser runtime.

8/02/2026 13:45) Progression:

**Completing CRUD Operations & UX Enhancements:**

1. **Factory Reset Mechanism (Clear All Data)**:
   Enabled users to completely erase their current decision framework and start a fresh session. Added a global system command (`resetAllData` action) connected to a "Start Over" button in the application header. Because the underlying memory engine (`localStorage`) permanently saves data without asking, this manual purge function includes a critical safety check (`confirm()` dialogue) to prevent accidental data loss.

2. **Option Deletion**:
   Enabled users to remove specific choices from their evaluation matrix. Attached a subtle delete control to each row in the data grid UI (`+page.svelte`). Clicking this control triggers a global deletion command (`removeOption` action in `decisionStore.ts`), which safely excises the choice and automatically synchronizes the cleared state to the persistent memory layer.

3. **Inline Criteria Editing (The UX Fix)**:
   Allowed users to fix typos or change the calculation polarity of a criterion "in-line" without having to delete and recreate it (which would catastrophically destroy any pairwise comparisons already made).
   - _Memory Isolation_: Paused real-time mathematical calculations while the user is typing by introducing temporary tracking variables (`editingId`, `editName`, and `editIsCost` local states). This prevents the primary engine (`Svelte`) from crashing or aggressively recalculating every time a letter is added.
   - _Synchronized Global Update_: Committed the final changes only when the user explicitly clicks "Save". This triggers a single execution command (`updateCriterion` action), cleanly updating both the human-readable name and its mathematical role (Cost/Benefit) across the entire application memory bank simultaneously.

(28/02/2026 16:10) Mistakes and corrections:

**Null Threat (Empty Data Cells) Tri-Layer Fix**:

Resolved a critical mathematical vulnerability where missing data inputs were defaulting to 0, unintentionally rewarding blank cells as the "best possible cost." Implemented a "Graceful Degradation" pipeline using a tri-layer architecture to keep the app running safely while alerting the user:

- _Layer 1 (Math - Safe Pessimism)_: Guaranteed that missing data receives 0% of its available weighting. Filtered out blank cells during max/min calculation and explicitly forced empty inputs to evaluate to a normalized score of 0 (`normalizeScores` in `wsm.ts`).
- _Layer 2 (UI - Non-Blocking Warning)_: Allowed the application to continue rendering the final leaderboard despite missing data, while injecting a reactive alert banner to warn the user that their evaluation is mathematically compromised (`missingDataCount` state block in `+page.svelte`).
- _Layer 3 (UX - The Heatmap)_: Instantly directed the user's attention to the exact points of missing data. Applied a mathematical tracker and dynamic CSS styling to highlight any empty input cell with a distinct warning color (`isEmpty` reactive variable and `.empty-cell` class in `DataCell.svelte`).

(28/02/2026 18:35) Progression:

**Criteria Builder UI/UX Overhaul:**

1. **Input Validation (Identical Naming Collisions):**
   - Implemented a "Hard Block" mechanism (`isDuplicate` helper function) in the `<script>` layer to continuously monitor the global store.
   - If a user attempts to add or edit a criterion with a name that exactly matches an existing one (case-insensitive), the save event is aborted.
   - The UI immediately surfaces a reactive, styled error banner (`limit-warning`/`error-banner`) warning the user that identical names are strictly prohibited.

2. **Mathematical Limit Enforcement:**
   - Implemented a hard cap at 10 criteria, as recommended by AHP best practices.
   - The input field and buttons are now visually disabled (`disabled` attribute) and styled differently when the limit is reached.
   - Added a prominent warning banner to inform the user why they cannot add more.

3. **Keyboard Navigation:**
   - Enabled the "Enter" key to submit a new criterion, improving workflow efficiency.

(28/02/2026 22:00) Updates:

**Data Persistence Resilience (Self-Healing LocalStorage)**:

- _The Problem_: While the data extraction function (`decisionStore.ts`) already had a `try...catch` block to prevent `JSON.parse()` from causing a fatal application crash when reading corrupted local storage data, it did not actually remove the bad data. This meant the corrupted payload lingered in the user's browser, causing the app to silently fail to load its memory on every subsequent refresh, leaving the user in a broken state.
- _The Fix_: Upgraded the existing `catch` block by adding `localStorage.removeItem(key)`. Now, if the system detects malformed JSON, it actively self-heals by quarantining and deleting the corrupted dictionary key. This guarantees the application safely flushes the error and boots into a clean, empty state rather than remaining permanently locked by broken data.

**Cross-Tab State Synchronization (Solving the Split-Brain Desync)**:

- _The Problem_: Because the application used isolated Svelte memory stores that only wrote _out_ to `localStorage`, opening the app in two different browser tabs created a "split-brain" scenario. Tab A would write new data to disk, but Tab B's memory remained stale. If the user then clicked anything in Tab B, its stale memory would overwrite and permanently destroy the new data created in Tab A.
- _The Fix_: Implemented a seamless reactivity bridge using the native Web Storage API. Injected a `window.addEventListener('storage', ...)` block directly into the `createPersistentStore` factory. Because this listener only fires when _other_ tabs modify the disk, it allows background tabs to instantly intercept new JSON payloads, parse them, and explicitly `.set()` their isolated Svelte stores. This ensures all open tabs remain perfectly synchronized in real-time, completely preventing data-loss collisions.

(28/02/2026 21:40) Code Refactoring

**Decoupling the UI: OptionsBuilder Component Extraction:**

1. **Architectural Separation of Concerns:**
   - Extracted the HTML markup, CSS styling, and component-specific logic for creating, editing, and deleting Options completely out of the main `+page.svelte` file.
   - Centralized this logic into a dedicated, isolated `<OptionsBuilder />` component to reduce code bloat in the main dashboard and improve maintainability.

2. **Global Store API Refactoring (`decisionStore.ts`):**
   - _The Problem_: The original `addOption` function was hardcoded to spawn generic identifiers (e.g., "Option 1", "Option 2") and expected zero arguments. The new UI required passing user-defined strings.
   - _The Fix_: Rewrote the `addOption(name: string)` signature to explicitly require parsing the user's custom string payload. Additionally, implemented a new global atomic action (`updateOptionName`) to support inline modifications within the new component.

3. **Input Validation (Identical Naming Collisions):**
   - Deployed the same strict, case-insensitive "Hard Block" validation layer (`isDuplicate` helper) used in the Criteria Builder to the new Options Builder.
   - This ensures a user can never accidentally create two identically named choices (e.g., two cars both named "Honda Civic"), which would render the final mathematical leaderboard confusing.


**Phase 2 Complete:**

Phase 2 successfully transformed the static calculator into a stateful, resilient application.

1.  **Data Persistence**: Integrated a robust, self-healing wrapper around the native browser LocalStorage. Application state (Criteria, Options, Pairwise Comparisons) is now protected against crashes, tab closures, and page refreshes, and maintains perfect real-time synchronization across multiple open windows.
2.  **Dynamic UI Builders**: Decoupled the monolithic UI by extracting the `CriteriaBuilder` and `OptionsBuilder` components. Users can now fully customize the evaluation framework on the fly.
3.  **Edge Case Immunity**: Fortified the mathematical and data layers against edge cases including the Zero Variance Divide-by-Zero crash, AHP Consistency Matrix limits, LocalStorage JSON corruption, and Duplicate Naming collisions. The system now gracefully degrades and clearly communicates state issues via dedicated error banners.

#####