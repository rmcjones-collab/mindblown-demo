# Handoff to Claude Code: MindBlown demo (public)

Date: 2026-11-02. Prepared by Perplexity Computer after the sub-neuron release and three CodeRabbit passes. Read `CLAUDE.md` first. The full renderer handoff (module map of `app.js`, depth feature contract, refinement backlog) lives in the private `mindblown` repo's `HANDOFF-CLAUDE-CODE.md`; this file covers only what is specific to the public demo.

## Ownership

- **Claude Code owns:** the three demo generators, `index.html`/`life.html`/`programming.html` shell markup, README, and the QA harness in `tools/`. Renderer changes (`app.js`, `style.css`) are made in `mindblown` and copied here unchanged.
- **Owner owns:** publishing to https://mindblown.pplx.app and anything that changes what is public.

## State at handoff

- Head `dbf60cc` on `master`; [PR #1](https://github.com/rmcjones-collab/mindblown-demo/pull/1) is a draft review vehicle (base `review-base/sub-neurons`, head `master`), 3/3 CodeRabbit passes used, all 9 findings fixed. The final fix (panel synapse → `ensureVisible`) landed after pass 3 and is unreviewed by CodeRabbit; it is covered by `tools/qa-depth.cjs`.
- The published site runs commit `5a7add3` (pre-review). The deployed preview matches `master`. Republishing is the owner's decision.
- Both pages pass `tools/qa-shot.cjs` and `tools/qa-depth.cjs` with zero console errors at 1440×900 and 390×844.

## Files specific to this repo

| File | Purpose |
|---|---|
| `index.html` | Projects brain shell; `nav.brains` links to `life.html` and `programming.html` |
| `life.html` | Life brain shell; identical markup except the `.on` link and `<script src="./life-data.js">` |
| `build.html`, `build.js`, `build.css`, `build-questions.js` | Build module: interview-driven brain builder with its own canvas renderer, IndexedDB storage, Save/Open JSON (files embedded as base64), Questions manager, Explode-to-explorer iframe. Questions/categories/templates live in `build-questions.js`. |
| `build_demo_data.py` | fictional Projects brain: 70 pages (20 sub-neurons under Tidewatch 7, Hollow Pines 7, Orbit Kitchen 6), 616 synapses, 94 sources. Prefix map decides parents. Code host is `git.example.test`. |
| `build_life_demo_data.py` | fictional Life brain: 86 pages (22 sub-neurons under 8 parents, e.g. `money/overview` 6, `studio/repos` 5, `home/saltmarsh-house` 4), 257 synapses, 201 sources. Source helpers `SES GM CAL SP GH MEM WIKI WEB BANK_*` all emit reserved hosts. |
| `programming.html` | Programming brain shell; same markup, `<script src="./programming-data.js">` |
| `build_programming_demo_data.py` | example Programming-wiki brain: 103 pages (48 top-level, 46 sub-neurons under 19 parents, 9 hidden study weeks), 286 synapses, 230 sources. Sources are real public URLs (docs, specs, Wikipedia, GitHub repos) plus fictional `pplx://sessions/` study sessions. |
| `data.js`, `life-data.js`, `programming-data.js` | generated; `window.MINDBLOWN` with `demo: true`, `title`, `subtitle`, `dayName` |
| `tools/qa-shot.cjs`, `tools/qa-depth.cjs` | Playwright harness, identical across the three repos |

Fictional cast and hosts that must not change meaning: Sam Vale (`sam.vale@example.test`, Port Ellery), Juno, Dana Okafor, Marguerite Vale, Priya Natarajan, Tomasz Wrona, Harbourline Systems, the boat Nikau 27 "Marrow"; hosts `example.test`, `example.org`, `git.example.test`, `mail.example.test`, `music.example.test`, `gcal://demo-`, `bank://`, `memory://`, `wiki://`, `pplx://sessions/<random uuid>`.

## Review dispositions carried over

| Finding | Disposition |
|---|---|
| Docstring coverage below 80% | Not a goal; comment what you touch. |
| Inherit child lobe from parent | Declined; cross-lobe parents are intentional (`pageOn` checks both lobes). |
| d3@7 without SRI | Acceptable; if pinning, pin all three repos' HTML in one change. |
| Real GitHub namespace in demo URLs | Fixed to `git.example.test` during the security review; keep it that way. |

## Demo-specific backlog

1. **Brain switcher data-driven.** `nav.brains` is hand-written in both HTML files. If a third brain is added, emit the nav from a `D.brains[]` list or a tiny shared `brains.js`. Check: adding an entry in one place updates both pages.
2. **Dream log lobe in the Projects demo.** The 15 hidden "day" pages could become sub-neurons of one "Dream log" neuron (generator change, no renderer change). Check: lobe list shows one neuron with 15 sub-neurons; stats still count them separately.
3. **Life demo money lobe.** `money/overview` has 6 children; this is the best place to test the label-collision and mobile-ring fixes from the main backlog. Check: screenshot at 390×844, 0.9×.
4. **README screenshots.** Regenerate the README images from `tools/qa-shot.cjs` output once the label fix lands.
5. **Generator determinism test.** Run each generator twice and `diff` the output; if it ever differs, the seed leaked. Consider making this a `tools/qa-generators.sh`.

Out of scope: adding any real data, new source kinds, or publishing.

## Sync procedure

From the private `mindblown` checkout after QA: `cp app.js style.css ../mindblown-demo/ && cp tools/qa-*.cjs ../mindblown-demo/tools/`. Then here: `python3 build_demo_data.py && python3 build_life_demo_data.py && python3 build_programming_demo_data.py` only if a generator changed, run both QA scripts on all three pages, open a draft PR on a `claude/<topic>` branch. Do not comment `@coderabbitai review`; the owner decides whether to spend passes.
