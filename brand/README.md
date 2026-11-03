# MindBlown brand mark — Genome Spectrum

Source of truth for the MindBlown logo across every repository (owner decision, 2026-11-02).

| File | Use |
|---|---|
| `mindblown-logo.svg` | Full mark: rainbow neuron (Genome brain karyotype palette, `#fde68a` hub) with a slim magnifying lens revealing a neuron within. Inline as `<svg class="mark" viewBox="-1 -1 34 34">` on every page; also `build/icon.svg` in mindblown-desktop. |
| `mindblown-logo-small.svg` | Small cut for 32 px and below: no inner neuron, thicker lens. Used as the favicon data URI on every page. |
| `mindblown-logo-1024.png` | Raster export on the `#06080f` page background. |

Palette: the eight arms follow the Genome brain's chromosome spectrum (`mb_shared._chr_color`: HLS hue `0.02 + 0.78·k/7`, lightness 0.72, saturation 0.85), clockwise from the top. Lens ring `#ffffff → #aeb9d6`; handle `#dde4f5 → #8f9bb8`.

When this mark changes: re-inline it into every page's `.brand .mark`, regenerate the favicon data URI from the small cut, copy it into `mindblown-desktop/build/icon.svg` and run `npm run icons` there.
