# Local generation server

Everything runs on this machine. No sprite, reference image or description is
ever sent to an external service.

```bash
python3 -m pip install -r server/requirements.txt
python3 server/fetch_model.py    # one-time, ~4.6 GB, resumable
python3 server/server.py
```

`fetch_model.py` is optional — the server downloads on demand — but doing it
first is strongly preferable. On a slow connection the on-demand download can
take hours, and inside the app that is only visible as a slowly climbing
percentage. Run it in a terminal and you get a real progress bar and transfer
rate, and Ctrl+C then rerun resumes where it stopped.

The server listens on `http://127.0.0.1:8766` and the app checks `/health` on
load. Keep the terminal open while you work — the app streams the server's
output into its Server Log panel, including model download and diffusion
progress.

## Stages

| Stage | Endpoint | Status |
|---|---|---|
| rotate | `POST /rotate` | Wired — Zero123++ novel views (default) |
| animate | `POST /animate` | Not wired yet (returns 503 with an explanation) |
| asset-set | `POST /asset-set` | Not wired yet (returns 503 with an explanation) |

`animate` and `asset-set` are intentionally unwired: the engine choice for this
project is still open. Their UI is complete, and the app reports the 503 message
verbatim rather than failing obscurely.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `SPRITE_ROTATE_ENGINE` | `zero123` | `zero123` or `img2img` |
| `SPRITE_ZERO123_STEPS` | `36` | Denoising steps for the zero123 engine |
| `SPRITE_MODEL` | `stable-diffusion-v1-5/stable-diffusion-v1-5` | Base model for the `img2img` engine only |
| `SPRITE_LORA` | *(unset)* | Optional pixel-art LoRA weights |
| `SPRITE_DEVICE` | autodetect | Force `mps`, `cuda` or `cpu` |
| `HF_HUB_DISABLE_XET` | `1` (forced) | Leave alone unless you know your link is fast — see below |

```bash
SPRITE_LORA=/path/to/pixel-art-lora python3 server/server.py
```

A generic SD checkpoint produces pixel-*styled* output, not true pixel art. What
makes the result usable is the client-side finishing pass
(`src/machinery/finalizeFrame.js`): every generated frame is reduced to the
sprite's real pixel grid by dominant-colour sampling, then snapped to the input
sprite's own palette. A purpose-trained model would improve the raw generation;
the finishing pass is what keeps a set coherent regardless of engine.

## Rotation engines

`SPRITE_ROTATE_ENGINE` picks between two implementations. Both live in
`server/stages/` and neither is referenced from the app, so swapping them
touches one env var.

**`zero123` (default)** — Zero123++ v1.2, conditioned on viewpoint. This is the
right shape for rotation: one image in, novel views of the same object out. Its
weights are already cached locally, so it needs no download.

Its limitation is fixed poses. The six views sit at azimuths 30/90/150/210/270/330
with elevation alternating +20/-10, which means:

- **W is exact** (azimuth 90); **SW and NW are 15 degrees off** (30 and 150
  against the 45 and 135 a sprite wants).
- **There is no azimuth 180**, so a straight-on back view is reached by chaining
  a second pass — feed the azimuth-150 view back in and take its azimuth-30
  output. That doubles the time and compounds the first pass's error.
- **Elevation alternates between frames** and cannot be corrected; it is baked
  into the training. Mirroring the near half onto the far half keeps the two
  halves of the sheet at least consistent with each other.

The app reports each of these as a note alongside the generated set rather than
presenting approximate facings as exact.

**`img2img`** — Stable Diffusion 1.5 image-to-image. The original default, kept
as a baseline. Measured 2026-09-04: it does not rotate the subject at all. Every
facing came back still looking at the viewer. At the strength needed to keep the
character recognisable, img2img is anchored to the input's composition, which is
exactly what blocks a viewpoint change. It remains a reasonable fit for the
animate mode, where that anchoring is desirable.

## Why Xet is disabled

The server forces `HF_HUB_DISABLE_XET=1` before `huggingface_hub` loads. Measured
on the same file, interleaved to cancel out link fluctuation:

| Transfer path | Throughput |
|---|---|
| Xet enabled (hub default) | 4.0 kB/s |
| Xet disabled | 1,870 kB/s |

Xet's adaptive concurrency controller ramps up without bound — the logs in
`~/.cache/huggingface/xet/logs` showed 69 increases against 4 decreases, reaching
57 parallel range requests, with no errors at all. On a modest connection those
streams congest each other into a crawl. `HF_XET_NUM_CONCURRENT_RANGE_GETS` does
not help; the controller overrides it.

The compounding problem is resume: each Xet attempt writes its own per-attempt
`.incomplete` temp file, so a dropped download restarts from byte zero. Before
this was found, one 4.3 GB model had consumed ~7 GB of transfer across a dozen
attempts per file and produced nothing usable. The plain HTTP path resumes
properly.

If a download ever does strand, clear the dead partials with:

```bash
find ~/.cache/huggingface/hub -name '*.incomplete' -delete
```

## Removing it again

```bash
python3 -m pip uninstall -y flask flask-cors torch diffusers transformers accelerate peft Pillow numpy
rm -rf ~/.cache/huggingface
```
