# MindBlown — the Brain, exploded into synapses

MindBlown turns a Perplexity Brain (the `memory/knowledge` wiki) into a zoomable neural map:

Navigation is centralized in `brain-nav.js`: Home, the four local modules, and verified public networks (Brain 42, Deep Answers, Human Genome, GTA Network and AI Hub). It populates every module dropdown, the homepage Projects menu and the public-network footer. Add future public destinations there, not separately to each shell. Private previews and unpublished brains are deliberately excluded.

- **Lobes** — colour-coded clusters of related pages (zoomed out).
- **Neurons** — one node per wiki page, sized by how many notes it holds.
- **Synapses** — every `- **Lead** — text` bullet becomes its own particle orbiting its neuron; zoom in (or flip "Explode every neuron") to read them, follow `[[wikilinks]]` between pages, and trace `[cite:n]` sources back to sessions, GitHub PRs and web pages.

**This public repository ships a home page, three fictional demo brains** (two for "Sam Vale", one about programming) **and an empty one you grow yourself**:

- `index.html` + `site.css` + `site.js` — the **MindBlown home page**: what the project is, the four modules with their counts, how a brain unfolds, the Build module and how to point MindBlown at your own wiki. Plain scrolling page with a procedural canvas background; it does not load `style.css` or `app.js`.
- `projects.html` + `data.js` — the **Projects** brain (a Perplexity Brain wiki exploded into lobes, neurons and synapses).
- `life.html` + `life-data.js` — the **Life** brain: lobes are life domains (family, crew, work, studio, money, home, body, play), neurons are people, places, habits, events and accounts, and neurons can go **one level deeper** into sub-neurons that unfold as you zoom. Synapses cite fictional mail metadata, calendar entries, playlists, bank *category names*, memory notes and Brain pages.
- `programming.html` + `programming-data.js` — the **Programming** brain: an example of MindBlown applied to a wiki about programming. Lobes are Languages, Paradigms & Types, Data Structures & Algorithms, Systems, Tools & Craft and Pioneers & History, plus a hidden study log grouped by week. 48 neurons, 46 sub-neurons (e.g. TypeScript/Node/event loop under JavaScript, quicksort/mergesort/Timsort under Sorting), 286 synapses citing real public docs, specs, Wikipedia articles and GitHub repositories, plus fictional study sessions.
- `build.html` + `build.js` + `build.css` + `build-questions.js` — **Build**: start from an empty brain and grow your own. The page asks your name first, then keeps asking questions that build a profile (17 starter categories, ~120 questions, plus follow-ups spawned from your answers). Every question and category can be switched off; you can add your own categories (each gets a generated question set) and your own questions; starred neurons and interests are asked about more. Every category and neuron holds answers, notes, links, pictures and files. You draw your own **connections** between any two neurons (a label such as "mother of", notes and a strength; pick the target from a list or click it on the canvas), and any neuron can **grow into a brain of its own**: a family member added as a neuron becomes the centre of a second brain with its own categories, questions and files, tied back to the neuron by a synapse. A header switch moves between the brains of the network; **Explode** shows them all on one screen. The network lives in your browser (IndexedDB) and can be saved to / opened from a single `<name>.mindblown.json` file; **Explode** opens it in the full explorer, and **Export as MindBlown dataset** writes a `data.js`-compatible file. Nothing is uploaded anywhere.

No real people, projects, sessions or messages appear in any of the data files (`data.js`, `life-data.js`, `programming-data.js`); Build starts empty; whatever it holds was typed into your own browser or opened from a `.mindblown.json` file you chose, and it is stored locally only. A header switch links the pages.

Live demo: see the published pplx.app link in the repository description.

## Run it locally

```bash
python3 -m http.server 8123
# open http://localhost:8123
```

It is a static site: `index.html` (home), the module shells (`projects.html`, `life.html`, `programming.html`, `build.html`), `style.css`, `app.js` (D3 v7, canvas) and the data files. The brain switcher in every module header starts with a Home entry, and the MindBlown mark links home too.

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
