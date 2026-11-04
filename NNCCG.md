# NNCCG — Neural Network Connection Charts and Graphs

Phase 1 starter-set preparation. Charts about a brain's connections, in a drawer, on both the canonical renderer and the Neural engine. Still draft; not deployed.

## Use

Open **Charts** from the side rail (View group; also on the phone rail), press **C**, or open `#chart=nn-lobe-matrix`. Choose Lobe wiring, Degree distribution, Hub ranking or Source mix. All follow lobe visibility and export PNG. Each has accessible chart data; hub entries select neurons by keyboard as well as pointer. Escape closes charts without clearing the map selection. On a page without the rail, the Charts button sits at the bottom of the Lobes panel with a separate phone Charts button.

Degree counts distinct visible neighbours, including isolated pages at degree zero; purple marks sub-neurons. Source mix counts unique source IDs cited by visible pages, grouped by kind, with distinct-page counts in accessible data. Old session definitions gain missing starters without overwriting their settings.

## Files

| File | Role |
|---|---|
| `nnccg.js` (`js/nnccg.js` in the Neural repo) | Byte-identical in both repos. Model adapters (`canonical`, `neural`), measure providers (`basic`; `connectome` detected only), chart type registry, session-only definitions, drawer UI, `#chart=` handling, `window.MINDBLOWN_NNCCG` QA hooks. |
| `nnccg.css` | Drawer, card and tooltip styles; bottom sheet below 900 px. |
| `tools/qa-nnccg.cjs` | Playwright check: drawer by C/button/hash, symmetric matrix whose total matches an independent recount, hide/show a lobe, PNG download, Escape, mobile sheet, zero console errors. |

## Renderer hooks (the only renderer change)

- `MINDBLOWN_RENDERER.engine` — `'canonical'` or `'neural'`.
- `MINDBLOWN_RENDERER.lobes()` — read-only `[{id, name, color, on}]`.
- `renderLobeList()` dispatches `mindblown:lobes` on `window`.

## Boundaries

- Reads `window.MINDBLOWN`; never writes it. Dataset strings reach the DOM through `textContent` only.
- Definitions live in `sessionStorage` (`mindblown.nnccg.<title>`); reload keeps them for the session, a new session starts from the starter chart.
- No new dependency (D3 v7 only). No backend. No publication: this branch is a draft for review.
- Neural repo: `tools/build-publication.cjs` now explicitly allows and requires `js/nnccg.js` and `nnccg.css`. `PUBLICATION-GATE.md` requires NNCCG checks on each staged bundle and owner-authorized hosted preview. Building a bundle does not authorize deployment.

Run both `tools/qa-nnccg.cjs` and `tools/qa-nnccg-starters.cjs`. Cross-host engine switching is not enabled: verified same-brain destination mappings and a definition-transfer mechanism remain to be implemented. No arbitrary destination URL is inferred, and private brain state is never sent to another host.

Phases 1–7 (starter set of four, management, graphs, Build authoring, Community templates, snapshots, sync) are described in the NNCCG implementation report.
