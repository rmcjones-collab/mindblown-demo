# MindBlown — the Brain, exploded into synapses

MindBlown turns a Perplexity Brain (the `memory/knowledge` wiki) into a zoomable neural map:

- **Lobes** — colour-coded clusters of related pages (zoomed out).
- **Neurons** — one node per wiki page, sized by how many notes it holds.
- **Synapses** — every `- **Lead** — text` bullet becomes its own particle orbiting its neuron; zoom in (or flip "Explode every neuron") to read them, follow `[[wikilinks]]` between pages, and trace `[cite:n]` sources back to sessions, GitHub PRs and web pages.

**This public repository ships three fictional demo brains** (two for "Sam Vale", one about programming) **plus an empty one you grow yourself**:

- `index.html` + `data.js` — the **Projects** brain (a Perplexity Brain wiki exploded into lobes, neurons and synapses).
- `life.html` + `life-data.js` — the **Life** brain: lobes are life domains (family, crew, work, studio, money, home, body, play), neurons are people, places, habits, events and accounts, and neurons can go **one level deeper** into sub-neurons that unfold as you zoom. Synapses cite fictional mail metadata, calendar entries, playlists, bank *category names*, memory notes and Brain pages.
- `programming.html` + `programming-data.js` — the **Programming** brain: an example of MindBlown applied to a wiki about programming. Lobes are Languages, Paradigms & Types, Data Structures & Algorithms, Systems, Tools & Craft and Pioneers & History, plus a hidden study log grouped by week. 48 neurons, 46 sub-neurons (e.g. TypeScript/Node/event loop under JavaScript, quicksort/mergesort/Timsort under Sorting), 286 synapses citing real public docs, specs, Wikipedia articles and GitHub repositories, plus fictional study sessions.
- `build.html` + `build.js` + `build.css` + `build-questions.js` — **Build**: start from an empty brain and grow your own. The page asks your name first, then keeps asking questions that build a profile (17 starter categories, ~120 questions, plus follow-ups spawned from your answers). Every question and category can be switched off; you can add your own categories (each gets a generated question set) and your own questions; starred neurons and interests are asked about more. Every category and neuron holds answers, notes, links, pictures and files. The brain lives in your browser (IndexedDB) and can be saved to / opened from a single `<name>.mindblown.json` file; **Explode** opens it in the full explorer, and **Export as MindBlown dataset** writes a `data.js`-compatible file. Nothing is uploaded anywhere.

No real people, projects, sessions or messages appear in any of the data files (`data.js`, `life-data.js`, `programming-data.js`); Build starts empty and only ever holds what you type into your own browser. A header switch links the pages.

Live demo: see the published pplx.app link in the repository description.

## Run it locally

```bash
python3 -m http.server 8123
# open http://localhost:8123
```

It is a static site: `index.html`, `style.css`, `app.js` (D3 v7, canvas) and `data.js`.

## Regenerate the demo data

```bash
python3 build_demo_data.py       # rewrites data.js (Projects brain)
python3 build_life_demo_data.py  # rewrites life-data.js (Life brain)
python3 build_programming_demo_data.py  # rewrites programming-data.js (Programming brain)
```

## Point it at your own Brain

1. Edit `lobes.json`: set `center` to the page id of your own entity page, and give each lobe a list of `match` substrings that pick its pages (`default` catches the rest; `hidden: true` lobes start switched off).
2. Run the extractor against your wiki folder:

```bash
python3 build_data.py ~/workspace/memory/knowledge data.js
```

The extractor reads frontmatter, section headings, bullet notes, wikilinks and citation footnotes, and writes `window.MINDBLOWN = {...}` to `data.js`. Keep that file private if your Brain is.

## Data shape

```
lobes[]     {id, name, color, hidden}
center      page id drawn at the heart of the ring
pages[]     {id, title, type, lobe, desc, intro, created, updated, synapses[], sources[], sections[]}
synapses[]  {id, page, lead, text, section, links[], cites[]}
sources[]   {id, label, kind: session|github|web, pages[]}
links[]     {s, t, w, kinds[], notes[]}      page ↔ page
synLinks[]  {s, t}                           synapse → page
cocite[]    {s, t, w}                        pages sharing a source
```

## Depth: sub-neurons

Give any page a `"parent": "<page id>"` and it becomes a sub-neuron: folded into its parent at lobe zoom, unfolding onto a ring around it past 0.85×, exploding into its own synapses past 1.5×. The side panel lists `Sub-neurons` on the parent and `Part of` on the child.

## For Claude Code

Start with `CLAUDE.md` (rules and conventions) and `HANDOFF-CLAUDE-CODE.md` (module map, QA harness, review dispositions, backlog). QA: `node tools/qa-shot.cjs <url>` and `node tools/qa-depth.cjs <url>` against a local `python3 -m http.server`.
