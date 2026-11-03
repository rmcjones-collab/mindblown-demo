# MindBlown Brain API clients

Three ways in, all dependency-free. Protocol `mindblown-brain/1`; spec in `../PROTOCOL.md`.

| File | Runs in | Use |
| --- | --- | --- |
| `mindblown-brain.js` | browser (UMD → `window.MindBlownAPI`) and Node 18+ (`require`) | `MindBlownAPI.host(origin)` → `brains()`, `brain(id)`, `network()`, `peers()`, `searchAll(q)`; `Brain` → `info()`, `pages()`, `page(id)`, `search(q)`, `facts(id, q)`, `graph()`, `feed()`, `data()`. Falls back to the `.js` twin of a document when a browser hits a CORS wall. |
| `mindblown_brain.py` | Python 3.8+ | Same surface: `Host(origin).brain(id).search(q)`; `python3 mindblown_brain.py <host> [query]` prints a summary. |
| `mindblown-mcp.mjs` | Node 18+, stdio | MCP server for AI assistants: `node mindblown-mcp.mjs https://host1 https://host2`. Tools `list_brains · get_brain · list_pages · get_page · search · neighbours · facts · random_synapse · network`; resources `mindblown://<host>/<brain>[/pages/<id>]`. Keep it in the same folder as `mindblown-brain.js`. |

Every host that runs `build_api.py` serves these three files at `/api/sdk/`, so an app can load them from the brain it talks to.
