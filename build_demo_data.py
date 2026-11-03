#!/usr/bin/env python3
# MindBlown — © 2026 Rory Jones. All rights reserved. Source-available under the PolyForm Strict License 1.0.0 (see LICENSE.md).
"""Generate a fully fictional demo Brain for MindBlown (same schema as build_data.py output).

Everything here is invented: the persona, projects, people, sessions and repositories.
"""
import json, os, random, uuid

random.seed(20261101)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "data.js")

LOBES = [
    dict(id="tide", name="Tidewatch", color="#4fd1c5", hidden=False),
    dict(id="kitchen", name="Orbit Kitchen", color="#ff8a3d", hidden=False),
    dict(id="pines", name="Hollow Pines", color="#ffb347", hidden=False),
    dict(id="studio", name="Vale Studio", color="#60a5fa", hidden=False),
    dict(id="moons", name="Paper Moons", color="#c084fc", hidden=False),
    dict(id="pref", name="Preferences", color="#a3e635", hidden=False),
    dict(id="home", name="Home & Garden", color="#f472b6", hidden=False),
    dict(id="ledger", name="Ledgerline", color="#34d399", hidden=False),
    dict(id="dream", name="Dream log", color="#94a3b8", hidden=True),
    dict(id="self", name="Sam", color="#fde68a", hidden=False),
]

# ---- fictional pages -------------------------------------------------------
P = {}  # id -> page spec


# sub-neurons: pages whose id starts with one of these prefixes orbit the named parent one level deeper
PARENTS = {"projects/tidewatch-": "projects/tidewatch", "projects/orbit-kitchen-": "projects/orbit-kitchen", "projects/hollow-pines-": "projects/hollow-pines"}


def parent_for(pid):
    """Return the parent page id for a sub-neuron, or None for a top-level page."""
    for prefix, parent in PARENTS.items():
        if pid != parent and pid.startswith(prefix):
            return parent
    return None


def page(pid, lobe, title, desc, n_syn, stype="project", vocab=None, sections=("How it works",), parent=None):
    P[pid] = dict(id=pid, lobe=lobe, title=title, desc=desc, n=n_syn, type=stype, vocab=vocab or lobe, sections=list(sections), parent=parent or parent_for(pid))


# Tidewatch — sailing weather and tide planner
page("projects/tidewatch", "tide", "Tidewatch", "Tidewatch is Sam Vale's sailing weather and tide planner for small-boat day trips, with a hosted web app and an offline phone build.", 22)
page("projects/tidewatch-forecast-engine", "tide", "Tidewatch Forecast Engine", "Blends public marine forecasts into a single hourly wind, swell and tide timeline with confidence bands.", 16)
page("projects/tidewatch-offline-charts", "tide", "Tidewatch Offline Charts", "Vector harbour charts cached on the phone, with depth soundings and a no-network passage mode.", 13)
page("projects/tidewatch-passage-planner", "tide", "Tidewatch Passage Planner", "Drag-to-plan routes with tide gates, estimated arrival windows and a printable float plan.", 15)
page("projects/tidewatch-beta-crew", "tide", "Tidewatch Beta Crew", "Private tester group, release notes and the feedback triage board.", 9)
page("projects/tidewatch-alerts", "tide", "Tidewatch Alerts", "Push alerts for small-craft warnings and tide-gate closures, rate-limited per harbour.", 10)
page("projects/tidewatch-harbour-cards", "tide", "Tidewatch Harbour Cards", "Shareable harbour summary cards for club noticeboards and group chats.", 8)
page("projects/tidewatch-store-release", "tide", "Tidewatch Store Release", "App-store listing, screenshots, privacy labels and the staged rollout plan.", 11)
page("entities/nikau-27", "tide", "Nikau 27", "Nikau 27 is the fictional 27-foot sloop used as the reference boat for Tidewatch's polar and draft defaults.", 5, stype="entity", sections=("Who they are",))

# Orbit Kitchen — recipe planner
page("projects/orbit-kitchen", "kitchen", "Orbit Kitchen", "Orbit Kitchen is a weekly meal planner that rotates recipes by season, pantry stock and leftover windows.", 20)
page("projects/orbit-kitchen-pantry-sync", "kitchen", "Orbit Kitchen Pantry Sync", "Barcode and receipt import that keeps the pantry list honest without manual entry.", 14)
page("projects/orbit-kitchen-recipe-import", "kitchen", "Orbit Kitchen Recipe Import", "Paste-a-link import with structured ingredients, scaling and unit normalisation.", 12)
page("projects/orbit-kitchen-grocery-runs", "kitchen", "Orbit Kitchen Grocery Runs", "Aisle-ordered shopping lists split across stores with a running budget estimate.", 11)
page("projects/orbit-kitchen-leftover-windows", "kitchen", "Orbit Kitchen Leftover Windows", "Tracks cooked batches and nudges the plan before food goes to waste.", 9)
page("projects/orbit-kitchen-household-sharing", "kitchen", "Orbit Kitchen Household Sharing", "Shared plans for two cooks with conflict-free edits and per-person dietary flags.", 10)
page("projects/orbit-kitchen-demo-site", "kitchen", "Orbit Kitchen Demo Site", "Public demo with fictional recipes and a sandboxed pantry.", 8)

# Hollow Pines — cozy browser game
page("projects/hollow-pines", "pines", "Hollow Pines", "Hollow Pines is a cozy browser game about tending a forest cabin through four seasons, with a radio, a sky and visiting animals.", 24)
page("projects/hollow-pines-weather-sky", "pines", "Hollow Pines Weather Sky", "Procedural sky, fog and snowfall tuned to a draw budget so laptops stay cool.", 15)
page("projects/hollow-pines-visitors", "pines", "Hollow Pines Visitors", "Animal visitors with routines, memories and a tiny journal of encounters.", 17)
page("projects/hollow-pines-radio", "pines", "Hollow Pines Radio", "In-game radio with licensed-free station scripts and a local MP3 drawer.", 10)
page("projects/hollow-pines-save-system", "pines", "Hollow Pines Save System", "Protected saves, export bundles and migration checks between versions.", 12)
page("projects/hollow-pines-public-demo", "pines", "Hollow Pines Public Demo", "Browser demo at a custom domain with postcards players can share.", 11)
page("projects/hollow-pines-performance", "pines", "Hollow Pines Performance", "Frame-time diagnostics, draw caches and the distinct GPU timeout evidence.", 14)
page("projects/hollow-pines-community", "pines", "Hollow Pines Community", "Discord community with a relay bot that posts visitor journal entries.", 9)

# Vale Studio — portfolio, media and misc making
page("projects/vale-studio-card", "studio", "Vale Studio Card", "Sam's public portfolio page, digital contact card and print kit.", 9)
page("projects/field-notes-shorts", "studio", "Field Notes Shorts", "Ten-episode short-video series about everyday physics with a reusable production system.", 12)
page("projects/paper-lantern-festival-film", "studio", "Paper Lantern Festival Film", "Short documentary edit of a neighbourhood lantern festival with original score.", 8)
page("projects/kinetic-type-experiments", "studio", "Kinetic Type Experiments", "Browser experiments in animated typography used as studio idents.", 7)
page("projects/own-voice-narration", "studio", "Own-Voice Narration", "On-demand narration using Sam's own trained voice for explainers.", 6)
page("projects/holiday-playlist-for-nan", "studio", "Holiday Playlist for Nan", "Family playlist spanning swing, novelty songs and winter classics.", 5)
page("projects/classroom-weather-posters", "studio", "Classroom Weather Posters", "Child-friendly weather handout and classroom posters.", 6)
page("projects/desk-synth-build", "studio", "Desk Synth Build", "Modular desktop synth enclosure with a web configurator.", 9)

# Paper Moons — children's books
page("projects/paper-moons", "moons", "Paper Moons", "Paper Moons is a picture-book series about Pip and the Moon Fox, with a pilot animatic and imagination modes.", 14)
page("projects/paper-moons-books", "moons", "Paper Moons Books", "Four cumulative books, continuity bible and hardcover preparation.", 13)
page("projects/paper-moons-website", "moons", "Paper Moons Website", "Public reader, downloads and reviews with private Git-linked deployment.", 10)
page("projects/paper-moons-publishing", "moons", "Paper Moons Publishing", "Publisher inquiries, softcover proofs and a hardcover compendium.", 9)
page("projects/moon-fox-field-guide", "moons", "Moon Fox Field Guide", "Spin-off fact book in the series' art style with night covers.", 8)
page("entities/marin-okafor", "moons", "Marin Okafor", "Marin Okafor is the fictional illustrator collaborating on Paper Moons' later books.", 4, stype="entity", sections=("Who they are",))

# Home & Garden
page("projects/garden-ledger", "home", "Garden Ledger", "Planting calendar, bed rotation and a searchable garden journal.", 10)
page("projects/rain-barrel-controller", "home", "Rain Barrel Controller", "Low-power pump controller with a local dashboard and overflow alerts.", 9)
page("projects/mail-organization", "home", "Mail Organization", "Topic labels, inbox archiving and a receipt workbook.", 7)
page("projects/home-dashboard", "home", "Home Dashboard", "Offline personal dashboard for planning and daily journaling.", 8)
page("projects/footprint-review", "home", "Footprint Review", "Public identity audit and exposure proposals.", 6)
page("entities/harbor-print-co", "home", "Harbor Print Co.", "Harbor Print Co. is the fictional local printer used for cards, posters and book proofs.", 3, stype="entity", sections=("Who they are",))

# Ledgerline — personal finance
page("projects/ledgerline", "ledger", "Ledgerline", "Ledgerline is Sam's private finance dashboard with a hosted register, weekly CSV updates and audit-ready reports.", 18)
page("projects/ledgerline-document-upload", "ledger", "Ledgerline Document Upload", "Reviewed multi-page uploads, extraction and optional tracking entries.", 12)
page("projects/ledgerline-email-receipts", "ledger", "Ledgerline Email Receipts", "Optional mailbox receipt intake with automatic categories and owner review.", 11)
page("projects/ledgerline-managed-register", "ledger", "Ledgerline Managed Register", "Owner-only hosted register, private cutover and file-aware rollback.", 13)
page("projects/ledgerline-reports", "ledger", "Ledgerline Reports", "Year views, PDF and spreadsheet exports and classification evidence.", 10)
page("projects/ledgerline-demo", "ledger", "Ledgerline Demo", "Fictional public presentation and separately scoped sample previews.", 8)
page("projects/ledgerline-mobile", "ledger", "Ledgerline Mobile", "Sanitized phone apps, independent review and gated integration.", 9)

# Preferences
page("preferences/iterative-refinement", "pref", "Refines work through successive change requests", "Sam prefers to refine creative work through concrete, successive change requests.", 0, stype="preference", sections=())
page("preferences/spoken-explanations", "pref", "Often wants spoken explanations", "Sam often wants substantial explanations in spoken form and prefers natural narration.", 0, stype="preference", sections=())
page("preferences/review-budget", "pref", "Caps automated review passes", "Sam caps automated code-review loops at three passes, then wants remaining findings reported.", 0, stype="preference", sections=())

# Self
page("entities/sam-vale", "self", "Sam Vale", "Sam Vale is the fictional maker at the centre of this demo Brain: sailor, cook, game tinkerer and picture-book author.", 7, stype="entity", sections=("Who they are",))

# Dream log
DAYS = ["2026-10-13", "2026-10-14", "2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-28", "2026-10-29", "2026-10-30"]
for d in DAYS:
    page(f"learnings/{d}", "dream", d, f"Daily digest of what moved on {d}: sessions processed, notes distilled and open questions.", 4, stype="day", sections=("Activity Summary",))

# ---- vocab banks -----------------------------------------------------------
VOCAB = {
    "tide": dict(things=["tide gate", "swell model", "harbour chart", "float plan", "wind polar", "arrival window", "offline cache", "small-craft alert", "depth sounding", "crew list"],
                 verbs=["recomputes", "caches", "flags", "exports", "re-times", "snapshots", "rate-limits", "validates"],
                 places=["on the phone", "in the hosted app", "at the dock", "before departure", "per harbour"]),
    "kitchen": dict(things=["pantry list", "leftover window", "aisle order", "unit normaliser", "seasonal rotation", "receipt import", "dietary flag", "batch note", "store split", "budget estimate"],
                    verbs=["rebalances", "deduplicates", "scales", "nudges", "merges", "archives", "estimates", "locks"],
                    places=["each Sunday", "per household", "in the demo", "after a grocery run", "per store"]),
    "pines": dict(things=["draw budget", "visitor routine", "save bundle", "radio station", "snowfall layer", "cabin lantern", "journal entry", "postcard", "frame-time breadcrumb", "migration check"],
                  verbs=["caps", "remembers", "exports", "fades", "defers", "replays", "records", "suppresses"],
                  places=["on laptops", "in the public demo", "between versions", "at dusk", "per season"]),
    "studio": dict(things=["ident", "print kit", "episode template", "contact card", "voice take", "colour script", "QR card", "cut list", "enclosure panel", "poster grid"],
                   verbs=["regenerates", "exports", "re-times", "shares", "archives", "proofs", "normalises", "labels"],
                   places=["for print", "for social", "in the browser", "per episode", "at the studio"]),
    "moons": dict(things=["character sheet", "night cover", "continuity note", "hardcover spread", "animatic beat", "imagination mode", "reader download", "proof copy", "spine width", "review page"],
                  verbs=["preserves", "re-flows", "locks", "proofs", "publishes", "tracks", "recolours", "credits"],
                  places=["across four books", "on the public reader", "with the printer", "in the pilot", "per spread"]),
    "home": dict(things=["bed rotation", "overflow alert", "topic label", "journal search", "pump schedule", "exposure note", "receipt workbook", "frost warning", "planting window", "dashboard tile"],
                 verbs=["archives", "schedules", "surfaces", "labels", "logs", "warns", "rotates", "summarises"],
                 places=["offline", "each morning", "per bed", "in the workbook", "on the local network"]),
    "ledger": dict(things=["register row", "tracking entry", "page image", "category rule", "weekly CSV", "rollback bundle", "year report", "duplicate guard", "owner sign-in", "audit note"],
                   verbs=["imports", "classifies", "merges", "protects", "exports", "reconciles", "flags", "retains"],
                   places=["in the private register", "per statement", "on the hosted copy", "before cutover", "per tax year"]),
    "dream": dict(things=["session", "open question", "digest", "note", "follow-up"], verbs=["summarised", "audited", "distilled", "reconciled"], places=["today", "this week"]),
    "pref": dict(things=["request"], verbs=["prefers"], places=["usually"]),
    "self": dict(things=["project", "handle", "credit", "domain", "collaboration"], verbs=["owns", "directs", "credits", "registers"], places=["publicly", "privately"]),
}
LEADS = ["{Thing} stays explicit", "No silent {thing} changes", "{Thing} before {thing2}", "Bounded {thing} evidence", "{Thing} is not acceptance",
         "Separate {thing} ownership", "{Thing} {verb} {place}", "Protected {thing}", "{Thing} with a visible gate", "Reusable {thing}",
         "One {thing}, two surfaces", "{Thing} needs an owner choice", "Honest {thing} limits", "{Thing} survives rollback", "Default-off {thing}"]
TEXTS = ["the {thing} {verb} {place}, but this does not establish {thing2} acceptance or a new release. Review notes remain separate from the shipped build.",
         "{thing} changes are reviewed before merge; a passing check {place} is bounded evidence, not proof that the {thing2} works for every user.",
         "Sam chose to keep the {thing} and the {thing2} distinct so neither substitutes for the other. The decision was recorded with the session that produced it.",
         "the {thing} {verb} {place} and surfaces a plain warning when the {thing2} is missing. Manual confirmation is still required.",
         "an earlier draft treated the {thing} as complete; later turns supersede that, and the current state is a tested candidate awaiting the owner's go-ahead.",
         "the {thing2} is derived from the {thing} {place}; exports include it, imports tolerate its absence and nothing is deleted on the way through."]


def mk_syn(vocab):
    v = VOCAB[vocab]
    t1, t2 = random.sample(v["things"], 2) if len(v["things"]) > 1 else (v["things"][0], v["things"][0])
    f = dict(thing=t1, Thing=t1[0].upper() + t1[1:], thing2=t2, verb=random.choice(v["verbs"]), place=random.choice(v["places"]))
    return random.choice(LEADS).format(**f), random.choice(TEXTS).format(**f)


# ---- sources ----------------------------------------------------------------
SESSIONS = [f"pplx://sessions/{uuid.UUID(int=random.getrandbits(128))}" for _ in range(70)]
REPOS = ["sam-vale/tidewatch", "sam-vale/orbit-kitchen", "sam-vale/hollow-pines", "sam-vale/paper-moons-site", "sam-vale/ledgerline", "sam-vale/garden-ledger"]
LOBE_REPO = {"tide": 0, "kitchen": 1, "pines": 2, "moons": 3, "ledger": 4, "home": 5}
WEB = ["https://docs.example.org/marine-forecast-api", "https://example-print.test/proof-guidelines", "https://example-store.test/listing-guide"]
LOBE_SESS = {l["id"]: random.sample(SESSIONS, 9) for l in LOBES}


def pick_sources(lobe):
    out = random.sample(LOBE_SESS[lobe], random.randint(2, 4))
    if lobe in LOBE_REPO and random.random() < 0.8:
        out += [f"https://git.example.test/{REPOS[LOBE_REPO[lobe]]}/pull/{random.randint(3, 42)}" for _ in range(random.randint(1, 2))]
    if random.random() < 0.15:
        out.append(random.choice(WEB))
    return out


# ---- assemble -----------------------------------------------------------------
pages, synapses, sources, edges = {}, [], {}, []
ids_by_lobe = {}
for pid, sp in P.items():
    ids_by_lobe.setdefault(sp["lobe"], []).append(pid)


def add_source(uri, pid):
    if uri not in sources:
        if uri.startswith("pplx://sessions/"):
            sources[uri] = dict(id=uri, label=uri.split("/")[-1][:8], kind="session", pages=[])
        elif "git.example.test" in uri:
            sources[uri] = dict(id=uri, label="/".join(uri.split("/")[3:5]) + " #" + uri.rsplit("/", 1)[-1], kind="github", pages=[])
        else:
            sources[uri] = dict(id=uri, label=uri.split("/")[2], kind="web", pages=[])
    if pid not in sources[uri]["pages"]:
        sources[uri]["pages"].append(pid)


for pid, sp in P.items():
    srcs = pick_sources(sp["lobe"])
    pg = dict(id=pid, title=sp["title"], type=sp["type"], lobe=sp["lobe"], parent=sp["parent"], desc=sp["desc"], intro=sp["desc"],
              created="2026-10-08", updated=random.choice(DAYS), synapses=[], sources=srcs, sections=sp["sections"] + ["See also"])
    for u in srcs:
        add_source(u, pid)
    same = [x for x in ids_by_lobe[sp["lobe"]] if x != pid]
    others = [x for x in P if P[x]["lobe"] not in (sp["lobe"], "dream", "pref", "self")]
    for i in range(sp["n"]):
        lead, text = mk_syn(sp["vocab"])
        sid = f"{pid}#{i+1}"
        links = []
        if sp["type"] == "day":
            links = random.sample([x for x in P if P[x]["type"] == "project"], 3)
            lead = random.choice(["Progress", "Decision", "Blocked", "Delivered", "Open question"]) + ": " + random.choice(["intake", "publishing", "layout", "save migration", "beta feedback", "print proofs", "route planning"])
            text = f"{P[links[0]]['title']} moved forward while {P[links[1]]['title']} waits on an owner decision; {P[links[2]]['title']} was only discussed. Nothing here is a release."
        elif random.random() < 0.12 and same:
            links = [random.choice(same)]
        elif random.random() < 0.04 and others:
            links = [random.choice(others)]
        cites = random.sample(srcs, k=min(len(srcs), random.choice([0, 1, 1, 2])))
        synapses.append(dict(id=sid, page=pid, lead=lead, text=text, section=sp["sections"][0] if sp["sections"] else "Intro", links=links, cites=cites))
        pg["synapses"].append(sid)
        for l in links:
            edges.append(dict(s=sid, t=l, kind="syn-link", w=1))
    # see-also: 2-4 same-lobe + occasional cross-lobe
    for t in random.sample(same, min(len(same), random.randint(2, 4))):
        edges.append(dict(s=pid, t=t, kind="see-also", w=2, note=random.choice(["shared host", "source and release", "owner storage", "reference and rehearsal", "public demo", "print partner", "data model", "campaign and visuals"])))
    if sp["type"] == "project" and random.random() < 0.3:
        edges.append(dict(s=pid, t=random.choice(others), kind="link", w=1))
    pages[pid] = pg

# hub links to Sam + deliberate cross-lobe bridges
CENTER = "entities/sam-vale"
for t in ["projects/tidewatch", "projects/orbit-kitchen", "projects/hollow-pines", "projects/paper-moons", "projects/ledgerline", "projects/vale-studio-card", "projects/garden-ledger"]:
    edges.append(dict(s=CENTER, t=t, kind="see-also", w=2, note="owned product"))
for s, t, note in [("projects/orbit-kitchen-grocery-runs", "projects/ledgerline-email-receipts", "grocery receipts feed the budget"),
                   ("projects/paper-moons-publishing", "entities/harbor-print-co", "proof printer"),
                   ("projects/vale-studio-card", "entities/harbor-print-co", "print kit"),
                   ("projects/hollow-pines-radio", "projects/holiday-playlist-for-nan", "station scripts"),
                   ("projects/own-voice-narration", "projects/paper-moons-website", "read-aloud mode"),
                   ("projects/tidewatch-harbour-cards", "projects/vale-studio-card", "shared card template"),
                   ("projects/garden-ledger", "projects/home-dashboard", "journal search"),
                   ("projects/mail-organization", "projects/ledgerline-email-receipts", "mailbox labels"),
                   ("entities/marin-okafor", "projects/paper-moons-books", "later-book illustrations"),
                   ("entities/nikau-27", "projects/tidewatch-passage-planner", "reference polar")]:
    edges.append(dict(s=s, t=t, kind="see-also", w=3, note=note))
for pr in ["preferences/iterative-refinement", "preferences/spoken-explanations", "preferences/review-budget"]:
    edges.append(dict(s=pr, t=random.choice(["projects/hollow-pines", "projects/ledgerline", "projects/paper-moons"]), kind="link", w=1))

from collections import defaultdict
valid = set(pages)
page_edges = defaultdict(lambda: dict(w=0, kinds=set(), notes=[]))
syn_edges = []
for e in edges:
    if e["t"] not in valid:
        continue
    if e["kind"] == "syn-link":
        syn_edges.append(dict(s=e["s"], t=e["t"]))
        sp = e["s"].split("#")[0]
        if sp != e["t"]:
            k = tuple(sorted((sp, e["t"])))
            page_edges[k]["w"] += 1
            page_edges[k]["kinds"].add("mention")
    else:
        if e["s"] == e["t"]:
            continue
        k = tuple(sorted((e["s"], e["t"])))
        page_edges[k]["w"] += e["w"]
        page_edges[k]["kinds"].add(e["kind"])
        if e.get("note"):
            page_edges[k]["notes"].append(e["note"])
links_out = [dict(s=a, t=b, w=v["w"], kinds=sorted(v["kinds"]), notes=v["notes"][:2]) for (a, b), v in page_edges.items()]

cocite = defaultdict(int)
for uri, s in sources.items():
    ps = sorted(p for p in set(s["pages"]) if pages[p]["lobe"] != "dream")
    for i in range(len(ps)):
        for j in range(i + 1, len(ps)):
            cocite[(ps[i], ps[j])] += 1

data = dict(lobes=LOBES, center=CENTER, pages=list(pages.values()), synapses=synapses, sources=list(sources.values()),
            links=links_out, synLinks=syn_edges, cocite=[dict(s=a, t=b, w=w) for (a, b), w in cocite.items()], built="2026-11-01", demo=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write("window.MINDBLOWN = ")
    json.dump(data, f, ensure_ascii=False)
    f.write(";\n")
print("pages", len(pages), "synapses", len(synapses), "sources", len(sources), "links", len(links_out), "synLinks", len(syn_edges), "cocite", len(cocite))
