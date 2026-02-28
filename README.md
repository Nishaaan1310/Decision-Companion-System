Problem Statement:
To build a fully client-side application that takes criteria, options, pairwise comparisons, and raw values from a user to evaluate the options and provide a ranked recommendation. The system is domain-agnostic; any decision can be evaluated based on the parameters provided by the user, and the system will explain the mathematical reasoning behind its final recommendation.

Assumptions Made:

1. The user knows and provides the specific options for the decision.
2. The user provides a raw data value for each option against each criterion.
3. The user does not provide absolute weights; instead, they provide relative preferences through pairwise comparisons of the criteria.

The Solution's Core:

The core of the solution lies in a hybrid mathematical evaluation engine.

Analytic Hierarchy Process (AHP) is used to establish the criteria weights. It is psychologically easier for a user to compare two criteria directly (A vs. B) than to guess an absolute percentage for a complex list of priorities.

Weighted Sum Model (WSM) is used to calculate the final rankings. Once the raw option values are normalized to a standard scale, WSM provides a highly computationally efficient evaluation using simple linear algebra.

The system is designed be a fully client side application and steteless. The application relies entirely on the client's device to perform heavy matrix calculations, guaranteeing absolute data privacy and zero latency.
The trade-off is that the data is isolated to the local device. Users cannot natively sync their decision history across different devices.

Design Decisions:

1. Client-Side Framework: Svelte

The Problem: The system requires a UI framework capable of handling heavy mathematical matrix recalculations triggered by high-frequency user inputs (e.g., dragging sliders) without introducing lag.

The Solution: SvelteKit. Acting as a compiler, it translates code into optimized vanilla JavaScript at build time. This eliminates the Virtual DOM middleman entirely, guaranteeing instantaneous UI reactivity.

Alternatives Rejected: React & Vue.js (Virtual DOM overhead causes lag during rapid state changes). Vanilla JS (unmaintainable code for wiring complex grids).

The Trade-off: A smaller ecosystem requires building custom, complex UI components from scratch rather than relying on pre-built libraries.

2. Primary Engine (Weighting): Analytic Hierarchy Process (AHP)

The Problem: Assigning accurate, absolute percentage weights to a complex list of competing priorities is cognitively demanding and highly prone to human bias.

The Solution: Analytic Hierarchy Process (AHP). Breaks the overarching decision into simple pairwise comparisons, mathematically calculating absolute percentage weights purely from relative human preferences.

Alternatives Rejected: Direct Point Allocation (forces users to manually balance numbers to 100%). Ordinal Ranking (identifies priority order but fails to capture the magnitude of preference).

The Trade-off: Geometric scaling constraint ($n(n-1)/2$). The required number of comparisons grows rapidly, causing severe user fatigue if the framework exceeds 7 to 8 criteria.

3. Secondary Engine (Evaluation): Weighted Sum Model (WSM)

The Problem: Once criteria weights are established, the system needs a computationally lightweight method to score and rank options based on varying raw data.

The Solution: Weighted Sum Model (WSM). Computes final option rankings using highly efficient linear algebra, multiplying normalized raw data by the established AHP weights to create a composite score.

Alternatives Rejected: Analytic Network Process (ANP) (over-engineered, destroys client-side performance).

The Trade-off: WSM strictly assumes that all criteria are mathematically independent. It cannot account for mutually influencing variables (e.g., if "Speed" directly dictates "Cost").

4. Data Normalization: Min-Max Normalization

The Problem: The system must compare drastically different real-world units (e.g., $50,000 cost vs. 15ms latency) without the larger numbers mathematically dominating the final score.

The Solution: Min-Max Scaling. Standardizes all raw inputs onto a clean 0-to-1 scale. It allows seamless handling of "Cost vs. Benefit" polarities by simply inverting the formula for negative traits.

Alternatives Rejected: Z-Score Normalization (strictly assumes a normal distribution of data, which small decision matrices rarely have).

The Trade-off: High sensitivity to extreme outliers. A single massive outlier option can compress the remaining normal data points into a tiny, indistinguishable fraction of the 0-to-1 scale.

5. User Interface (Inputs): Bidirectional Slider

The Problem: Standard numerical inputs for AHP pairwise comparisons require users to understand underlying fractions (e.g., manually calculating $1/5$), causing massive cognitive friction.

The Solution: Continuous Bidirectional Sliders. Translates the abstract 1-to-9 mathematical Saaty scale into a spatial, intuitive "tug-of-war" visual, perfectly mapping to human decision-making psychology.

Alternatives Rejected: Dropdown Menus (requires 3 clicks per comparison, causing fatigue). Radio Buttons (consumes massive screen space).

The Trade-off: Sliders generate high-frequency, continuous DOM events, mandating strict performance constraints on the underlying framework to prevent browser lag.

Criteria weights are established using a bidirectional slider on a 1-to-9 scale, representing pairwise comparisons. To prevent user fatigue, the system calculates only the minimum required unique pairs using the formula n(n-1)/2. The mathematical matrix is then built automatically: if the user establishes that Criterion A is 5 times more important than Criterion B, the engine automatically populates the reverse relationship (B vs. A) as the mathematical inverse (1/5). It never forces the user to evaluate the same pair twice.

6. Data Persistence: Browser LocalStorage.

The Problem: Because the application is stateless and runs entirely in RAM, a simple page refresh or accidental tab closure instantly destroys the user's entire decision framework and data entry.

The Solution: Browser LocalStorage. Wrapped the global Svelte stores in a custom factory function that automatically serializes state to the browser's persistent localStorage on every keystroke.

Alternatives Rejected: Backend Database (violates the stateless, zero-latency, privacy-first goals). SessionStorage (wipes data the moment the tab is closed, which doesn't protect against accidental closures). Cookies (has severe size limits and needlessly sends data to the server on every request).

The Trade-off: Data is permanently locked to the specific device and browser. Furthermore, because localStorage lacks an automatic expiration mechanism, the architecture mandates building explicit "factory reset" UI controls so users can manually purge the memory banks to begin a new decision.

7. Mathematical & Cognitive Constraints: The Saaty Limit

The Problem: The mathematical integrity of the Analytic Hierarchy Process degrades rapidly when a human attempts to simultaneously balance more than 7-9 competing variables. Furthermore, allowing 15+ criteria would mathematically require rendering over 105 bidirectional sliders, causing severe DOM lag and overwhelming the device's memory.

The Solution: Constraint-Driven Design. The system enforces a strict architectural hard limit of 10 criteria. This forces the user to prioritize their most critical factors, explicitly preventing cognitive overload and guaranteeing that the AHP mathematical engine functions precisely within its intended theoretical boundaries.

Alternatives Rejected: Complex pagination to hide sliders (fails to solve the cognitive limit of AHP); Unlimited criteria (fails the DOM performance constraint).

The Trade-off: Users cannot build massive, unconstrained flat hierarchies. They are forced to consolidate and prioritize their decision-making parameters before utilizing the tool.

Edge cases:

### Mathematical Anomalies

1. **Zero Variance (The Divide-by-Zero Crash)**
   - _The Scenario_: A user enters identical raw scores for every single option under a specific criterion (e.g., all three cars listed have a top speed of 150mph).
   - _The Danger_: The WSM Min-Max normalization formula is `(raw - min) / (max - min)`. If the maximum and minimum values are identical, the denominator becomes zero, forcing JavaScript to return `NaN` (Not a Number) and catastrophically breaking the entire mathematical cascade.
   - _The Solution_: The WSM engine (`wsm.ts`) contains an explicit architectural safeguard before running the formula: `if (maxScore === minScore)`. If triggered, the system mathematically recognizes the perfect tie and bypasses the division formula entirely, explicitly awarding all options a perfect normalized value of `1` (100%).

2. **The 1-or-2 Criterion Matrix Crash**
   - _The Scenario_: A user creates only 1 or 2 criteria (or deletes existing criteria until only 1 or 2 remain).
   - _The Danger_: The AHP Consistency Ratio (CR) formula requires dividing by the Random Index (RI). The RI for a $1 \times 1$ or $2 \times 2$ matrix is exactly `0` (because it is impossible to be logically inconsistent when comparing only two variables). Dividing by zero throws a `NaN` error in JavaScript, crashing the CR display calculations.
   - _The Solution_: The AHP engine (`ahp.ts`) explicitly intercepts the calculation before it begins with an architectural safeguard: `if (n < 3) return 0;`. This bypasses the division and cleanly returns a perfect 0% inconsistency rating.

### Concurrency & State Management

1. **Cross-Tab State Synchronization (The Split-Brain Desync)**
   - _The Scenario_: A user opens the application in two different browser tabs simultaneously and begins editing data in Tab A.
   - _The Danger_: Web browsers isolate memory for each open window. If Tab A saves new data to the local device, Tab B doesn't automatically know about the update. If the user then switches to Tab B and makes a change, Tab B will blindly overwrite the device's shared memory with its outdated information, permanently destroying the work done in Tab A.
   - _The Solution_: The application actively listens for background changes to the shared memory. Whenever a different window or tab updates the data, the current tab instantly detects the change, retrieves the fresh data, and updates its visual interface in real-time. This guarantees all open windows remain perfectly synchronized and prevents any data-loss collisions without the user needing to manually refresh.
