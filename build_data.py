#!/usr/bin/env python3
"""Explode the knowledge wiki into neurons (pages), synapses (bullets) and sparks (sources)."""
import json, os, re, glob, hashlib
from collections import defaultdict

import sys
ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/workspace/memory/knowledge")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.js")

WIKILINK = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]")
CITE = re.compile(r"\[cite:(\d+)\]")
REF = re.compile(r"^\[cite:(\d+)\]:\s*(\S+)", re.M)
BULLET = re.compile(r"^- \*\*(.+?)\*\*\s*(?:[—:–-]\s*)?(.*)$")
MDLINK = re.compile(r"\[([^\]]+)\]\((https?://[^)]+)\)")

HERE = os.path.dirname(os.path.abspath(__file__))
# Lobe rules live in lobes.json so the same extractor works on any Brain:
# {"center": page id, "default": lobe id, "lobes": [{"id","name","color","match":[id substrings],"hidden":bool}]}
_cfg = json.load(open(os.path.join(HERE, "lobes.json"), encoding="utf-8"))
LOBES = [(l["id"], l["name"], l["color"], l["match"], l.get("hidden", False)) for l in _cfg["lobes"]]
CENTER = _cfg.get("center", "")
DEFAULT_LOBE = _cfg.get("default", LOBES[0][0])


def lobe_for(pid):
    for key, name, color, pats, _h in LOBES:
        for p in pats:
            if p in pid:
                return key
    return DEFAULT_LOBE


def slug_title(pid):
    return pid.split("/")[-1].replace("-", " ").title()


def parse_frontmatter(text):
    fm = {}
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            block = text[3:end]
            for line in block.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    fm[k.strip()] = v.strip().strip("'\"")
            text = text[end + 4:]
    return fm, text


def clean(s):
    s = CITE.sub("", s)
    s = MDLINK.sub(r"\1", s)
    s = WIKILINK.sub(lambda m: slug_title(m.group(1)), s)
    s = re.sub(r"`([^`]*)`", r"\1", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


pages = {}
synapses = []
sources = {}
edges = []  # {s, t, kind, w}

files = []
for sub in ["projects", "entities", "preferences", "learnings", "artifacts"]:
    files += sorted(glob.glob(os.path.join(ROOT, sub, "*.md")))

for path in files:
    rel = os.path.relpath(path, ROOT)[:-3]
    raw = open(path, encoding="utf-8").read()
    fm, body = parse_frontmatter(raw)
    pid = fm.get("id", rel)
    refs = {n: u for n, u in REF.findall(body)}
    m = re.search(r"^# (.+)$", body, re.M)
    title = fm.get("title") or (m.group(1).strip() if m else slug_title(pid))
    title = clean(title)
    stype = fm.get("semantic_type") or rel.split("/")[0].rstrip("s")
    if rel.startswith("learnings/"):
        stype = "day"
        title = title.replace("Dream Learnings: ", "")
    if rel.startswith("artifacts/"):
        stype = "audit"
    desc = clean(fm.get("description", ""))

    # intro paragraph = first non-heading paragraph after H1
    lines = body.splitlines()
    intro = ""
    for ln in lines:
        if ln.startswith("#") or not ln.strip() or ln.startswith("- ") or ln.startswith("["):
            if intro:
                break
            continue
        intro += " " + ln
    intro = clean(intro)
    if not desc:
        desc = intro[:260]

    page = dict(id=pid, title=title, type=stype, lobe=lobe_for(pid), desc=desc, intro=intro,
                created=fm.get("created_at", "")[:10], updated=fm.get("updated_at", "")[:10],
                synapses=[], sources=[], sections=[])
    pages[pid] = page

    # walk sections / bullets
    section = "Intro"
    page_cites = set()
    for ln in lines:
        if ln.startswith("## "):
            section = ln[3:].strip()
            if section not in ("References",):
                page["sections"].append(section)
            continue
        if section == "References":
            continue
        for c in CITE.findall(ln):
            page_cites.add(c)
        links = [l.strip() for l in WIKILINK.findall(ln)]
        bm = BULLET.match(ln.strip()) if ln.startswith("- ") else None
        if bm:
            lead, text = bm.group(1), bm.group(2)
            sid = f"{pid}#{len(page['synapses'])+1}"
            cites = CITE.findall(ln)
            syn = dict(id=sid, page=pid, lead=clean(lead), text=clean(text)[:420], section=section,
                       links=[l for l in links], cites=[refs.get(c, "") for c in cites if refs.get(c)])
            synapses.append(syn)
            page["synapses"].append(sid)
            for l in links:
                edges.append(dict(s=sid, t=l, kind="syn-link", w=1))
        elif ln.startswith("- ") and section == "See also":
            for l in links:
                note = clean(ln.split("—", 1)[1]) if "—" in ln else ""
                edges.append(dict(s=pid, t=l, kind="see-also", w=2, note=note))
        else:
            for l in links:
                edges.append(dict(s=pid, t=l, kind="link", w=1))

    for c in sorted(page_cites, key=int):
        uri = refs.get(c)
        if not uri:
            continue
        page["sources"].append(uri)
        if uri not in sources:
            label = uri
            kind = "session"
            if uri.startswith("pplx://sessions/"):
                label = uri.split("/")[-1][:8]
            elif "github.com" in uri:
                kind = "github"
                label = "/".join(uri.split("/")[3:5]) + (" #" + uri.rsplit("/", 1)[-1] if "/pull/" in uri else "")
            else:
                kind = "web"
                label = uri.split("/")[2]
            sources[uri] = dict(id=uri, label=label, kind=kind, pages=[])
        sources[uri]["pages"].append(pid)

# resolve edges: drop dangling targets, dedupe page-page, weight
valid = set(pages)
page_edges = defaultdict(lambda: dict(w=0, kinds=set(), notes=[]))
syn_edges = []
for e in edges:
    if e["t"] not in valid:
        continue
    if e["kind"] == "syn-link":
        syn_edges.append(dict(s=e["s"], t=e["t"]))
        src_page = e["s"].split("#")[0]
        if src_page != e["t"]:
            k = tuple(sorted((src_page, e["t"])))
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

links_out = [dict(s=a, t=b, w=v["w"], kinds=sorted(v["kinds"]), notes=v["notes"][:2])
             for (a, b), v in page_edges.items()]

# co-citation edges: pages sharing a source (weak)
cocite = defaultdict(int)
for uri, s in sources.items():
    ps = sorted(p for p in set(s["pages"]) if pages[p]["lobe"] not in ("dream",))
    for i in range(len(ps)):
        for j in range(i + 1, len(ps)):
            cocite[(ps[i], ps[j])] += 1
cocite_out = [dict(s=a, t=b, w=w) for (a, b), w in cocite.items()]

data = dict(
    lobes=[dict(id=k, name=n, color=c, hidden=h) for k, n, c, _, h in LOBES],
    center=CENTER,
    pages=list(pages.values()),
    synapses=synapses,
    sources=list(sources.values()),
    links=links_out,
    synLinks=syn_edges,
    cocite=cocite_out,
    built="2026-11-01",
)
with open(OUT, "w", encoding="utf-8") as f:
    f.write("window.MINDBLOWN = ")
    json.dump(data, f, ensure_ascii=False)
    f.write(";\n")

print("pages", len(pages), "synapses", len(synapses), "sources", len(sources),
      "page links", len(links_out), "syn links", len(syn_edges), "cocite", len(cocite_out))
from collections import Counter
print(Counter(p["lobe"] for p in pages.values()))
print(Counter(p["type"] for p in pages.values()))
print(os.path.getsize(OUT) // 1024, "KB")
