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

the system is designed be a fully client side application and steteless. the system will have zero latency issues as there is no backend server involved. calculations are instantaneous.
drawback is no persistance and no user history.


