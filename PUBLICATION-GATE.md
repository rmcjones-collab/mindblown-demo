# MindBlown publication gate

The owner requires these checks before publishing or updating ANY MindBlown-related website. Passing checks is not permission to publish. Private real-data brains must remain private.

## Required checks for every Brain view in the proposed release

- **Modifier brains:** available in the current Brain's placement interface, not merely linked to a separate prototype. Place one on the current canvas, connect it to a target, adjust it and confirm its intended downstream effect. Confirm removal/reset. A button or catalog entry alone does not pass.
- **Genome Layout:** a visible, labelled, functional control inside the Lobes panel. Toggle to genome layout and back, verifying the canvas changes and the selection stays usable. A toolbar-only control or an unrelated genome website does not pass.
- **Scrollable Lobes and options:** reach and operate the final lobe entry and every option checkbox, including the last one, on a normal desktop, a short laptop viewport, a phone, and a short landscape phone. Exercise a long lobe list and an expanded set of switches; nothing may disappear into a zero-height list or beyond an unscrollable panel.
- **Regression/privacy:** search, navigation, selection, Build/Explode when present, and console checks must pass. Public assets must contain no private datasets or private destination catalogs.

## Evidence and release scope

Record the exact repository commit, proposed artifact/version, each tested Brain route, viewport sizes, test results and screenshots. Repeat on the hosted private preview. Any missing or unverified requirement is a blocker.

Homepages and directories without a Brain canvas do not need fake Lobes controls; they cannot be used as evidence that their linked Brain views pass. Testing the demo does not certify the Neural engine, AI Hub, Genome, GTA, or other sibling sites. Each applicable renderer and deployed bundle needs its own checks.

`node tools/qa-lobes-scroll.cjs <brain-url>` tests the scrolling requirement only. It is NOT a complete publication pass.

## Current disposition

**BLOCKED.** The current demo does not integrate modifier placement and does not include Genome Layout in the Lobes panel. A standalone modifiers prototype and an unmerged genome-layout implementation are not equivalent to release integration.

No merge, review, deployment, privacy change or publication is authorized by this document.
