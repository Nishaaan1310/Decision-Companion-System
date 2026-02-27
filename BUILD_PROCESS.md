started the project by asking gemini about how to create a decision companion system and steps involved in a decision making process.

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

Dynamic Criteria Generation:
Replaced the hardcoded mock criteria with a fully dynamic model. The system now allows users to define custom criteria on the fly, assigning unique IDs and establishing polarity (Benefit vs. Cost).

Cascading Deletions (The Logic Layer):
Implemented a vital safety mechanism in the global state (`decisionStore.ts`). When a user deletes a criterion, the system performs a cascading surgical sweep:

1. It removes the criterion from the main list.
2. It sweeps the AHP memory (`comparisonsStore`), destroying any pairwise slider data associated with the deleted criterion.
3. It sweeps the WSM memory (`optionsStore`), cleanly deleting the orphaned raw score column from every single option.
   This guarantees the mathematical engines never crash trying to calculate data for a criterion that no longer exists.

CriteriaBuilder Component (The Presentation Layer):
Built an isolated, clean UI component that sits at the top of the dashboard. It features strict input validation (locking the add button if empty) and seamlessly triggers the cascading deletion logic when removing items. The rest of the dashboard (`+page.svelte`) reacts instantly to these changes, auto-generating the appropriate sliders and data grids.
