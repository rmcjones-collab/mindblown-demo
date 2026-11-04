# Modifier brains

Open Lobes and choose **Place Modifier Brain**. Select a neuron and place a controller on the canvas, or use **Place beside target** for keyboard/touch placement.

## Scenario semantics

- **Signal:** An illustrative, dimensionless scenario property with baseline 1.00 and bounds 0–2. It is not a factual, biological, financial or physical prediction.
- **Dependencies:** Explicit directed connections authored in the modifier panel. Ordinary knowledge/reference links are never treated as causal.
- **Propagation:** Each target receives the sum of modifier deviations from 1. Downstream targets receive weighted deviations through a directed acyclic graph. Values clamp at each node; the results panel shows direct and incoming contributions.
- **Conflicts:** Duplicate links, cycles, invalid weights and unknown targets are rejected before changing the scenario. Negative influence and cancellation are supported.
- **Data boundary:** The factual dataset is never modified. No backend writes or persistent storage. Reload resets the scenario.

## Controls and limits

Controllers can be placed, dragged, keyboard-moved, adjusted and removed. Connections can be added and removed; Undo, Redo and Reset are available. Layout switches preserve scenario state. Up to 12 controllers are supported; numeric model weights range from −1 to 1.

Genome Layout is a real button in Lobes, synchronized with the toolbar and G shortcut. The entire Lobes panel scrolls, including all options and the two new actions.

This is the first integrated placement surface, not the full typed-property/biological engine proposed in the standalone Modifiers research. Screenshot export currently captures the underlying renderer canvas, not the modifier overlay.
