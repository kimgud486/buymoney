# Microsoft Qlib Open Source Integration Notice

**License:** MIT License
**Source Repository:** https://github.com/microsoft/qlib

## Architecture Integration in AISTOCK v13
Microsoft Qlib is an AI-oriented quantitative investment platform. In AISTOCK v13 Real Intelligence Core, Qlib patterns are integrated as a **Feature Research, Factor Model, & AI Return Probability Layer**.

### Mapping:
- **LightGBM / Alpha Factor Model:** Cross-sectional ranking of stock candidates.
- **Model Confidence Calibration:** Provides AI model prediction confidence to the AISTOCK Unified Decision Engine.
- **Constraint:** Qlib model outputs serve as ONE input metric among 10 evaluation categories in the Entry Engine and do NOT execute direct broker orders.
