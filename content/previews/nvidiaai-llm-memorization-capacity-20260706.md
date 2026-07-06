# LLM memorization capacity: 3.6 bits per parameter

**Source:** https://x.com/nvidiaai/status/2074162777535516985?s=52  
**Grounding:** PARTIAL — X post and image summary retrieved with `x_search`; full paper/PDF not extracted because web tools are not configured.

## Mechanism to learn

The useful distinction is **unintended memorization vs generalization**:

- **Memorization:** storing dataset-specific details that can leak or be regurgitated.
- **Generalization:** learning reusable structure from the data-generating process.
- The post's reported estimate: GPT-style models have about **3.6 bits of memorization capacity per parameter**.
- This implies finite capacity, not zero privacy risk.

## Deck shape

- 8 questions
- Courtroom profile: pressure-test claims about privacy, scaling, and evidence
- Includes one no-hint enterprise fine-tuning transfer item

## Critic note

This is good as a mechanism deck, but not a full paper deck. Upgrade grounding later by extracting the ICML/arXiv PDF and adding methodology questions about the actual estimator.
