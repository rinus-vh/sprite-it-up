# Sprite It Up

Local sprite generation. Three things it makes from what you already have:

1. **Rotate** — one sprite in, 4 or 8 directional frames out.
2. **Animate** — one pose plus a description ("walk animation"), out comes a cycle.
3. **Asset set** — several style references plus a description, out comes a set of
   entirely new sprites in that style.

Everything runs on your machine. No sprite, reference or description is sent to
an external service.

## Native resolution

A sprite is stored at exactly its pixel grid: a 32px sprite is a 32×32 PNG,
around a kilobyte. Display scales it up with nearest-neighbour
(`image-rendering: pixelated`), so it is perfectly sharp at any size and nothing
is ever resampled. Sheets are square, tiled from the smallest grid that fits the
frames — 4 frames become 2×2, 8 frames become 3×3.

Every generated frame passes through `src/machinery/finalizeFrame.js` before it
is stored: reduced to the real pixel grid by dominant-colour sampling (averaging
would invent colours the sprite never had), then snapped to the input sprite's
own palette. That finishing pass is what keeps a generated set looking like one
sprite rather than several near-misses, whatever engine produced the frames.

## The rotation rule

Facings are the eight compass directions. A rotation set always starts at the
facing the input is drawn in:

- **8 frames** — all eight, clockwise from the input.
- **4 frames** — the input's own family. A cardinal input (S, W, N, E) yields the
  other cardinals; a diagonal input (SW, NW, NE, SE) yields the other diagonals.
  So `S → W, N, E` and `NE → SE, SW, NW`.

## Running it

```bash
pnpm install
pnpm start
```

The generative work needs the local server as well — the app checks for it on
load and shows the setup steps if it isn't up:

```bash
python3 -m pip install -r server/requirements.txt
python3 server/server.py
```

The default rotation engine (Zero123++) needs no download if you already have it
cached from the sibling `three-ation` project. `python3 server/fetch_model.py`
fetches it if not.

See [server/README.md](server/README.md) for configuration and cleanup.

## Status

| Mode | UI | Backend |
|---|---|---|
| Rotate | complete | wired — Zero123++ novel views on MPS |
| Animate | complete | not wired yet |
| Asset set | complete | not wired yet |

Rotation runs on Zero123++, which is conditioned on viewpoint. Stable Diffusion
img2img was tried first and measured not to rotate the subject at all — see
[server/README.md](server/README.md). Zero123++ has its own limitation: fixed
camera poses that do not line up with 45-degree sprite facings, so some frames
are approximations and the app says which.

Training a purpose-built pixel model locally is still the preferred end state.
Everything model-specific lives in `server/stages/`, selected by one env var.

Facings past 180 degrees are mirrored rather than generated — exact, instant,
and it halves the work. Toggle it off for asymmetric characters.

## Commands

| Command | Description |
|---|---|
| `pnpm start` | Start dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Lint (0 warnings allowed) |
| `pnpm lint:css` | Lint CSS (0 warnings allowed) |

## For AI agents

Read `.claude/SKILL.md` and `.claude/SKILL_DESIGN_SYSTEM.md` before making any
changes.
