# MindBlown — the Brain, exploded into synapses

MindBlown turns a Perplexity Brain (the `memory/knowledge` wiki) into a zoomable neural map:

- **Lobes** — colour-coded clusters of related pages (zoomed out).
- **Neurons** — one node per wiki page, sized by how many notes it holds.
- **Synapses** — every `- **Lead** — text` bullet becomes its own particle orbiting its neuron; zoom in (or flip "Explode every neuron") to read them, follow `[[wikilinks]]` between pages, and trace `[cite:n]` sources back to sessions, GitHub PRs and web pages.

**This public repository ships a fully fictional demo brain** ("Sam Vale" and friends). No real people, projects or sessions appear in `data.js`.

Live demo: see the published pplx.app link in the repository description.

## Run it locally

```bash
python3 -m http.server 8123
# open http://localhost:8123
```

It is a static site: `index.html`, `style.css`, `app.js` (D3 v7, canvas) and `data.js`.

## Regenerate the demo data

```bash
python3 build_demo_data.py      # rewrites data.js with the fictional brain
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
