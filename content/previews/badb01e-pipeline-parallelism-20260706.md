# Deck preview: Inference parallelism (6 Q)

**Source:** [0xBADB01E status](https://x.com/0xbadb01e/status/2073990357398982797) (parent interconnect thread)

**Pack:** `content/packs/badb01e-pipeline-parallelism-20260706.json`

| # | Mechanism focus |
|---|-----------------|
| 1 | Pipeline vs tensor for per-user latency |
| 2 | Decode memory stalls / low MFU |
| 3 | Interconnect latency as binding constraint |
| 4 | FLOPs matched to memory pipe |
| 5 | 8-chip mesh pod |
| 6 | **No-hint** long-context / KV capacity |

**Critic:** Thread text not fully ingested (no Firecrawl); grounding VERIFIED via x_search anchors. Run P1 validator before shipping to playable client.