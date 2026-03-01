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

**Execution plan: (Phase 1)**

1. **State Management**: Define the data structure to hold the criteria, AHP slider values, and raw option scores in memory.
2. **The AHP Math Module**: Write the pure JavaScript logic to calculate the matrix, eigenvalues, and Consistency Ratio.
3. **The WSM Module**: Write the logic to normalize the raw scores and multiply them by the AHP weights.
4. **The UI Components**: Build the bidirectional sliders and the final ranking podium.

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

**Phase 1 (complete)**:

State Management: Set up Svelte stores to track criteria, pairwise comparisons, and options.

Math Engines: Finished the decoupled logic for both AHP (calculating normalized weights and Consistency Ratios) and WSM (normalizing scores and ranking options).

Stage 1 UI (AHP Weighting): Built the interactive `AhpSlider` component for pairwise comparisons. Integrated it into the main page so that moving the sliders instantly calculates the underlying matrix, displaying live criteria weights (%) and Consistency Ratio warnings on-screen.

Stage 2 UI (WSM Evaluation): Developed the `DataCell` component and a dynamic data grid to input raw scores for options across criteria. Integrated the WSM engine to reactively normalize scores, apply AHP weights, and calculate final rankings. Added a leaderboard to visually highlight the mathematically optimal decision.

**Phase 2 Plans**:

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


(01/03/2026 02:30) Progression:

**The Explainable Recommendation Engine**

Evolved the system from a "Black Box" calculator into a transparent decision engine. By leveraging the mathematics of the Weighted Sum Model (WSM), the application now provides human-readable context explaining _why_ the optimal option won.

**1. The Contribution Math (`calculateItemizedContributions()`)**

- Added a utility function in `wsm.ts` that forensically breaks down an option's final score. It calculates the exact "Weighted Contribution" of each criterion (Raw Score x AHP Weight), allowing the system to identify the single criterion that carried the option to victory (The MVP Criterion).

**2. The "Delta" Analysis (`findDecidingFactor()`)**

- Added a comparative function in `wsm.ts` that pits the #1 ranked option against the #2 runner-up. It iterates through the math layer to find the specific criterion where the winner outperformed the runner-up by the largest margin (The Deciding Factor).

**3. The Insight Component (`RecommendationInsight.svelte`)**

- Created a decoupled UI component that acts as the translation layer. It subscribes to the final math rankings and the global memory state.
- It dynamically generates a clean, narrative sentence explaining the mathematical results to the user (e.g., summarizing the MVP criterion and the primary deciding factor over the runner-up). This component is injected directly above the final leaderboard in the main dashboard.

**Phase 2 Complete:**

Phase 2 successfully transformed the static calculator into a stateful, resilient application.

1.  **Data Persistence**: Integrated a robust, self-healing wrapper around the native browser LocalStorage. Application state (Criteria, Options, Pairwise Comparisons) is now protected against crashes, tab closures, and page refreshes, and maintains perfect real-time synchronization across multiple open windows.
2.  **Dynamic UI Builders**: Decoupled the monolithic UI by extracting the `CriteriaBuilder` and `OptionsBuilder` components. Users can now fully customize the evaluation framework on the fly.
3.  **Edge Case Immunity**: Fortified the mathematical and data layers against edge cases including the Zero Variance Divide-by-Zero crash, AHP Consistency Matrix limits, LocalStorage JSON corruption, and Duplicate Naming collisions. The system now gracefully degrades and clearly communicates state issues via dedicated error banners.
4.  **Explainable Recommendations**: Evolved the math engine from a "Black Box" into a transparent system, deploying custom Svelte components to dynamically translate complex WSM mathematics into human-readable insights that explain exactly _why_ the top option won.

#####

**Decision companion system V1 is Complete.**

#####

Phase 3 plans:

1. The Uncertainty Engine (Range Values): Allow users to input ranges (e.g., "10-20") for uncertain data, using mathematical expected values for the WSM grid.

2. Qualitative Data Mapping: Implement text-based scales (e.g., "Poor, Fair, Good, Excellent") that silently convert to precise mathematical scores under the hood.

3. Hard Constraints (Dealbreakers): Add threshold logic that instantly disqualifies an option if it fails a critical requirement, regardless of its overall score.

4. The Pareto Frontier (Value vs. Cost): Separate the WSM math into "Total Benefit" and "Total Cost" to recommend the absolute best "Value for Money" option.

5. Ghost Scoring (Missing Data Scenarios): Upgrade the missing data failsafe to calculate Best-Case and Worst-Case scenarios for empty cells instead of just ignoring them.

**(01/03/2026 15:00) The Uncertainty Engine (Range Values):**

Upgraded the system to gracefully handle mathematical ambiguity, allowing users to input ranged values (e.g., "$80k - $100k" or "3 to 6 weeks") without crashing the rigid mathematical algorithms.

**1. Data Structure Upgrades (`decisionStore.ts`)**

- Replaced the strict number requirement for WSM grid scores with a new union type: `export type ScoreValue = number | { min: number; max: number };`. Updated the `updateOptionScore` function to accept this new polymorphic type.

**2. Math Engine Translation Layer (`wsm.ts`)**

- Created the `getExpectedValue()` helper bridging function. Because WSM matrix multiplication requires scalar numbers, this function intercepts range objects and dynamically calculates their mathematical expected value (average) using `(min + max) / 2`.
- The core Min-Max normalization loop was subsequently patched to filter arrays through this Expected Value helper, definitively solving a severe `NaN` crash caused when comparing raw range objects against absolute numbers during min/max evaluation.

**3. Smart UI Parser (`DataCell.svelte`)**

- Refactored the data input cell from a rigid `number` input into a highly forgiving `text` input to allow hyphenated ranges.
- Implemented a "Smart Real-Time Parser" utilizing Regex (`on:input`) to instantly translate string ranges into valid memory objects.
- To prevent the real-time Reactivity engine from calculating mathematical averages while a user is mid-keystroke typing an incomplete bounds (e.g., "10-"), introduced an `isTyping` state lock. The UI silently pauses calculations for incomplete strings and resumes the instant the range logic is fulfilled.
- Re-instituted failsafes: Restored the `empty-cell` accessibility class warnings and fixed ID regressions caused during the visual refactor.

**(01/03/2026 15:30) Mistakes and corrections: AHP Slider State Desync**

**UI Slider State Desync on Page Refresh:**

- _The Problem_: When the user refreshed the page, the visual slider handles in the Pairwise Comparison section reset to the center (0) position. Although the underlying mathematical weights were successfully retained in LocalStorage and the global store, the `<AhpSlider.svelte>` component was built as a "One-Way Street" that broadcasted state but lacked a mechanism to read hydrated data backwards upon mount, making it appear as though data was lost.
- _The Fix_: Upgraded the components to create a two-way data bridge.
  1. Implemented a "Reverse Translation Engine" in `<AhpSlider.svelte>` (`$:`) that listens for hydrated props from the parent and instantly snaps the visual slider to the correct coordinate.
  2. Created a `getSavedSliderProps()` helper function in `+page.svelte` that safely reverse-engineers the stored mathematical fractions back into whole integers (using `Math.round(1 / storedMath)` to prevent floating-point errors).
  3. Deployed Svelte's `{@const}` declaration inside the HTML `{#each}` loop to instantly pass this reverse-engineered state down into the child components the moment the DOM mounts. The visual UI now perfectly reflects the persistent data layer across all browser refreshes.

#####

**(01/03/2026 16:30) Hard Constraints (Dealbreakers):**

Introduced a "Non-Compensatory" layer to the evaluation engine to prevent the math from artificially boosting options that excel in minor categories but fail critical minimum requirements (e.g., exceeding a strict budget ceiling).

**1. The Data Layer Upgrade (`decisionStore.ts`)**

- Expanded the `Criterion` interface to support optional threshold data (`hasDealbreaker`, `dealbreakerType`, and `dealbreakerValue`).
- Added a new `updateCriterionDealbreaker()` store action to safely save these strict limits into the persistent global memory.

**2. The UI & Presentation Upgrades (`CriteriaBuilder`, `+page.svelte`, `RecommendationInsight`)**

- Added a "Set Hard Constraint" toggle within the criteria edit panel. When activated, users can specify a strict "Must be at least" (min) or "Must be less than" (max) numerical limit.
- Added visual `⚠️` dealbreaker badges to the active criteria list to clearly indicate which factors have strict constraints applied.

- Stripped disqualified options out of the primary ranking system. They are now rendered at the bottom of the dashboard with a subdued UI treatment (`opacity: 0.6`, greyscale filter) and a clear red badge explaining exactly _why_ they were eliminated.
- Upgraded the `RecommendationInsight` component to detect "Sole Survivor" scenarios. If all options except one are eliminated by dealbreakers, the text dynamically shifts to declare a win by elimination rather than purely by mathematical points.
- Implemented a "Catastrophic Failure" banner that warns the user if their dealbreaker rules were so strict that _every single option_ was disqualified.

**3. The Math Engine Interceptor (`wsm.ts`)**

- Updated the WSM execution loop with a "Survival Check". Before compiling the final leaderboard scores, the engine forensically passes every option through the `getExpectedValue()` helper.
- If an option violates any defined dealbreaker boundary or if data is entirely missing, it is immediately tagged with `isDisqualified: true` and assigned a specific `disqualificationReason` string.

#####

**(01/03/2026 20:30) Architectural Refactoring (Separation of Concerns):**

To elevate the application from a prototype to production enterprise software, a massive architectural tear-down was conducted on the main `+page.svelte` file (which had become a 600-line "God Component").

**1. The Logic Layer Upgrade (Derived Stores)**

- _The Problem:_ The UI component was importing raw mathematical engine functions (`ahp.ts`, `wsm.ts`) and using Svelte reactive blocks (`$:`) to manually compute the AHP matrix, weights, and final WSM rankings whenever data changed. UI components should not execute heavy business logic.
- _The Fix:_ Upgraded `decisionStore.ts` using Svelte's `derived()` feature. The Store is no longer lazy—the millisecond raw data enters the store, it automatically funnels through the internal math engines and exports pristine `ahpMatrixStore`, `weightsStore`, and `finalRankingsStore` objects. The UI now simply reads the final answers without performing any calculations.

**2. The Presentation Layer Decoupling (Component Splitting)**

- _The Problem:_ `+page.svelte` contained massive, tangled blocks of HTML loops for the distinct phases of the application.
- _The Fix:_ Sliced the presentation layer into three highly focused, decoupled components that import their specific derived stores automatically:
  1. `<PairwiseComparisonList />`: Orchestrates the AHP slider loop.
  2. `<DataEntryGrid />`: Encapsulates the raw data matrix table and missing data trackers.
  3. `<Leaderboard />`: Takes over the final ranking cards, catastrophic failure banners, and the `RecommendationInsight` component.
- `+page.svelte` was successfully reduced to a clean, top-level orchestrator.

**Resolving the Reactivity "Diamond Dependency" Engine Crash** (Bug introduced during Refactoring)

- _The Problem:_ Moving to automated `derived` stores introduced a fatal race condition. When a user added a new Option, `leaderboardStore` (which depends on `optionsStore`) fired a millisecond _before_ the `normalizedDataStore` finished calculating the new option's 0-1 metrics. Reading `undefined` data caused a silent `TypeError` that totally halted Svelte's reactivity engine.
- _The Fix:_ Handled asynchronous store states by injecting defensive Optional Chaining (`normalizedData[opt.id]?.[crit.id] || 0`) into the WSM calculation engine (`wsm.ts`). Svelte safely reads `0` during the split-second gap, preventing the crash, and recalculates perfectly the instant the normalized data arrives.

#####

**(02/03/2026 01:10) Qualitative Data Mapping (The "Text-to-Math" Bridge):**

Implemented a vital abstraction layer allowing the UI to collect subjective inputs (e.g., "Poor", "Excellent") while feeding pure numerical matrices to the AHP/WSM math engines.

**1. The Data Dictionary Extension (`decisionStore.ts`)**

- Expanded the `Criterion` interface with an optional `qualitativeScale` property.
- This stores an array of mappings (e.g., `[{ label: "Poor", value: 1 }, ... ]`), establishing a rigid translation schema for any subjective criterion.
- Built corresponding CRUD logic (`updateCriterionScale`) to safely persist these mapping arrays in persistent memory.

**2. The UI Configuration (`CriteriaBuilder.svelte`)**

- Added a "Use Subjective Scale" toggle when adding or editing decision criteria.
- Activating this toggle automatically provisions a pre-configured 1-5 scale ("Poor", "Fair", "Average", "Good", "Excellent").
- Added distinct visual UI badges (`📝 Text Scale`) to the criteria list to clearly identify subjective metrics at a glance.

**3. The Smart Input Swap (`DataEntryGrid.svelte` & `DataCell.svelte`)**

- Modified the main `DataEntryGrid` to pass the `qualitativeScale` dictionary down to the individual cell level.
- Re-architected `DataCell.svelte` into a polymorphic input component.
  - If a scale is absent, it renders a standard text input field for numbers and ranges.
  - If a scale is detected, it instantly swaps to a `<select>` dropdown populated exclusively with the human-readable labels.

**4. The Translation Layer (Preserving Math Purity)**

- Built a seamless translation bridge inside `DataCell.svelte`: When a user selects a textual option like "Excellent" from the dropdown, the component intercepts the interaction, looks up the numeric representation (`5`), and dispatches the _number_ to the global `optionsStore`.
- _Architectural Win_: This ensures that the core math execution engines (`wsm.ts` and `ahp.ts`) require zero code alterations. They remain strictly mathematical, unaware that the data originated from qualitative text selections.

Changes:

**UX Improvements (Criteria Builder):** - Fixed discoverability issues by moving the Dealbreaker UI out of the "Edit-only" state and natively into the inline Creation form.