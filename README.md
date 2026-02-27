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