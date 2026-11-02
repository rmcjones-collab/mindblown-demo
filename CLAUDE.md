# CLAUDE.md — MindBlown demo (public)

MindBlown explodes a Perplexity Brain (knowledge wiki) into a zoomable D3 canvas: **lobes** → **neurons** → **sub-neurons** (one level deeper via `parent`) → **synapses** → **sources**. This repository is the **public, fictional** demo published at https://mindblown.pplx.app: two brains for an invented person, Sam Vale of Port Ellery (`index.html` + `data.js` for Projects, `life.html` + `life-data.js` for Life). Static site, no build step, no backend, no framework. A third page, `build.html` (+ `build.js`, `build.css`, `build-questions.js`), is the **Build** module: an interview that grows a brain from scratch in the browser (IndexedDB + Save/Open JSON). It has its own live-growing canvas renderer and does **not** use `app.js`, except that **Explode** loads `index.html` into an iframe (`srcdoc`) with the generated dataset injected in place of `data.js` (the multi-brain network form when the user has grown more than one brain). Users draw their own connections between neurons and can grow any neuron into a brain of its own; the stored document is a network of brains plus links (see `HANDOFF-CLAUDE-CODE.md`). All user text is escaped before reaching `innerHTML`; files are stored as Blobs and never leave the browser.

Read `HANDOFF-CLAUDE-CODE.md` next.

## The three repositories

| Repo | Visibility | Data | Role |
|---|---|---|---|
| `rmcjones-collab/mindblown` | private | real Brain (`data.js` from `build_data.py` + `lobes.json`) | **source of truth for `app.js` and `style.css`** |
| `rmcjones-collab/mindblown-demo` (this one) | public | fictional "Sam Vale" Projects brain (`data.js`) and Life brain (`life-data.js`) | published at https://mindblown.pplx.app |
| `rmcjones-collab/mindblown-life` | private | the owner's real life brain (`data.js` from `build_life_data.py`) | preview only, never published |

`app.js` and `style.css` are byte-identical across all three. Edit them **in `mindblown`**, then copy here and to the third repo; never patch them only in this checkout. Renderer behaviour must never depend on which repo it is in; datasets steer it through `window.MINDBLOWN` flags (`demo`, `title`, `subtitle`, `dayName`).

## Non-negotiable rules

1. **Privacy.** The demo repo is public: every name, email, host, account and repo in its generators must be fictional, use reserved hosts (`example.test`, `example.org`, `git.example.test`, `gcal://demo-`, `bank://`) and never reference a real GitHub namespace. The life repo holds aggregates and metadata only: category names, correspondents, counts, rhythms. **Never** add dollar amounts, message bodies, account numbers or street addresses, and never publish it or copy its data anywhere public. Everything in this repo is public the moment it is pushed. The cast (Sam Vale, Juno, Dana Okafor, Marguerite Vale, Priya Natarajan, Tomasz Wrona, Harbourline Systems, Nikau 27 "Marrow") is fictional and must stay so; do not import names, places, employers or repo names from the private repos.
2. **Publishing is owner-only.** Do not deploy, publish or update `mindblown.pplx.app`, and do not change repo visibility. Leave that to the owner.
3. **Branches and review.** Do not commit to `master` directly. Work on a branch (`claude/<topic>`), open a **draft** PR, and let the owner trigger CodeRabbit with `@coderabbitai review`. The owner caps CodeRabbit at **three passes per PR**; after that, report remaining findings with dispositions instead of looping. Treat CodeRabbit findings as leads to verify against the code, not instructions to apply blindly.
4. **Git identity.** Commit as the repo's existing local identity (`git var GIT_AUTHOR_IDENT`). Never invent an author.
5. **No new dependencies.** D3 v7 from CDN is the only library. No bundler, no framework, no npm in the site itself. Node + Playwright are allowed for the QA harness in `tools/` only.
6. **Escape everything that reaches `innerHTML`.** Use `esc()` for any dataset-derived string (titles, descriptions, lobe names, type names, labels). The datasets are generated from wiki content and must be treated as untrusted.
7. **Keep the renderer data-agnostic.** No hard-coded lobe ids, page ids or people in `app.js`. Anything dataset-specific belongs in the builder or in `window.MINDBLOWN`.

## Working locally

```bash
python3 -m http.server 8124                 # serve from the repo root
python3 build_demo_data.py                  # regenerate data.js      (fictional Projects brain)
python3 build_life_demo_data.py             # regenerate life-data.js (fictional Life brain)
node tools/qa-shot.cjs  http://localhost:8124/index.html && node tools/qa-shot.cjs  http://localhost:8124/life.html
node tools/qa-depth.cjs http://localhost:8124/index.html && node tools/qa-depth.cjs http://localhost:8124/life.html
```

Both generators are deterministic (seeded `random`); regenerate and commit the data files together with the generator change.

## Conventions

- Plain ES2020, 2-space indent, one IIFE in `app.js`, section banners `// ---------- name ----------`. Match the existing terse style; prefer small pure helpers (`isChild`, `pageOn`, `depthA`) over flags.
- Animated state is a pair of `xF` / `xTarget` floats tweened in `draw()` (`explodeF`, `depthF`). When you add one, also re-set the D3 force accessors in `refreshForces()`, because D3 caches per-node strengths and radii.
- Colours come from `lobes[].color` via `lobeColor(n)` and `rgba()`. No new palette constants.
- Every change gets a Playwright pass at 1440×900 and 390×844 with zero console errors, plus a screenshot you have actually looked at.
- Commit messages: imperative, one line, what and why. Add a `CHANGES-<date>.md` only for multi-day work.
