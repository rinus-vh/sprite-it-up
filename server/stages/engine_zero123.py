"""
Rotation engine: Zero123++ v1.2 (sudo-ai/zero123plus-v1.2). The default.

Chosen because it is conditioned on *viewpoint* rather than text. Given one
image it synthesises novel views of the same object, which is the actual
rotation problem. Text-prompted img2img cannot do this (see engine_img2img).

Already cached locally at ~5.2 GB from the sibling three-ation project, so it
needs no download.

## Pose mismatch — read this before trusting the output

Zero123++ emits six views at *fixed* poses, and they do not line up with sprite
facings:

    view 0: azimuth  30, elevation +20
    view 1: azimuth  90, elevation -10
    view 2: azimuth 150, elevation +20
    view 3: azimuth 210, elevation -10
    view 4: azimuth 270, elevation +20
    view 5: azimuth 330, elevation -10

Three consequences we cannot tune away, only work around:

1. **No back view.** There is no azimuth 180, so a straight-on N facing is not
   directly obtainable. We reach it by chaining: feed view 2 (azimuth 150) back
   through the model and take its azimuth 30 output, composing to 180. That
   costs a second full pass and accumulates the first pass's error.

2. **45-degree steps do not exist.** SW wants 45 and gets azimuth 30; NW wants
   135 and gets 150. Both are 15 degrees off. Acceptable for a sprite, but the
   diagonals are approximations, not exact facings.

3. **Elevation alternates** between +20 and -10 across views, so adjacent frames
   are seen from different heights. This is baked into the model's training and
   cannot be corrected. Mirroring the near side to the far side (rather than
   using views 3-5) at least keeps the two halves of the sheet consistent with
   each other.

## Cost

A pass is slow on Apple Silicon — three-ation measured 10-20 minutes. A set that
includes N needs two passes. Budget accordingly; the job reports progress.

## What this engine does NOT do

Background removal, pixel-grid reduction and palette locking all run client-side
(src/machinery/), so every engine gets identical treatment and the finishing
pass has one implementation.
"""
import base64
import io
import os
import threading

# huggingface_hub >= 0.24 removed cached_download, which the Zero123++ custom
# pipeline still references. The shim must be installed before diffusers loads.
import huggingface_hub

if not hasattr(huggingface_hub, "cached_download"):
    huggingface_hub.cached_download = huggingface_hub.hf_hub_download

import torch
from PIL import Image

MODEL_ID = os.environ.get("SPRITE_ZERO123_MODEL", "sudo-ai/zero123plus-v1.2")
CUSTOM_PIPELINE = "sudo-ai/zero123plus-pipeline"

DEFAULT_STEPS = int(os.environ.get("SPRITE_ZERO123_STEPS", "36"))

# Input resolution the model expects.
INPUT_SIZE = 256

# Azimuth of each of the six output views, in model order.
VIEW_AZIMUTHS = [30, 90, 150, 210, 270, 330]

# Which view best approximates each yaw we might be asked for, and how far off
# it is. Only the near side is listed: the far side is produced by mirroring.
_YAW_TO_VIEW = {
    90: (1, 0),    # W  — azimuth 90, exact
    45: (0, 15),   # SW — azimuth 30, 15 degrees short
    135: (2, 15),  # NW — azimuth 150, 15 degrees over
}

# Yaw that needs the chained second pass.
_BACK_YAW = 180
# The view fed into the second pass, and the view taken out of it. 150 + 30 = 180.
_CHAIN_IN_VIEW = 2
_CHAIN_OUT_VIEW = 0

_pipe = None
_pipe_lock = threading.Lock()
# Zero123++ is not re-entrant: concurrent calls share the pipeline object and
# corrupt its state, so inference is serialised.
_inference_lock = threading.Lock()


def _device():
    requested = os.environ.get("SPRITE_DEVICE")
    if requested:
        return requested
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def _dtype():
    # float16 produces NaNs for this model on MPS, giving black output. Only
    # CUDA is numerically stable in half precision here.
    return torch.float16 if torch.cuda.is_available() else torch.float32


def model_id():
    return MODEL_ID


def describe():
    return f"Zero123++ novel views — {MODEL_ID} on {_device()}"


def _cache_dir():
    from huggingface_hub.constants import HF_HUB_CACHE

    return os.path.join(HF_HUB_CACHE, "models--" + MODEL_ID.replace("/", "--"))


def cached_bytes():
    """
    Bytes on disk for this model. Only `blobs` is counted — the snapshot tree is
    symlinks back into it, and getsize() follows them, which would double-count.
    """
    total = 0
    for root, _dirs, files in os.walk(os.path.join(_cache_dir(), "blobs")):
        for name in files:
            try:
                total += os.path.getsize(os.path.join(root, name))
            except OSError:
                pass

    return total


# Measured size of the cached model; used only to turn bytes into a percentage.
EXPECTED_DOWNLOAD_BYTES = 5.2 * 1024 ** 3


def weights_ready():
    directory = _cache_dir()
    if not os.path.isdir(directory):
        return False

    for root, _dirs, files in os.walk(directory):
        for name in files:
            if name.endswith(".incomplete"):
                return False

    return _pipe is not None or cached_bytes() > EXPECTED_DOWNLOAD_BYTES * 0.9


def status():
    return {
        "repo": MODEL_ID,
        "ready": weights_ready(),
        "loaded": _pipe is not None,
        "cached_bytes": cached_bytes(),
        "expected_bytes": int(EXPECTED_DOWNLOAD_BYTES),
    }


def _tensors_to(obj, device):
    """Recursively move tensors in a (possibly dataclass) object to `device`."""
    if torch.is_tensor(obj):
        return obj.to(device)
    if hasattr(obj, "__dict__"):
        for key, value in vars(obj).items():
            if torch.is_tensor(value):
                setattr(obj, key, value.to(device))

    return obj


class _CPUEncoderWithDeviceOutput(torch.nn.Module):
    """
    Runs the vision encoder on CPU, returning its tensors on the pipeline's
    device.

    On MPS float32 the encoder produces corrupt CLIP embeddings, so the UNet
    denoises effectively unconditioned and the output is colour noise. Running
    just the encoder on CPU fixes the numerics; moving its outputs back avoids a
    cross-device error when the pipeline combines them with global_embeds.

    Carried over from three-ation, where this was diagnosed.
    """

    def __init__(self, model, out_device):
        super().__init__()
        self.model = model.to("cpu").float()
        self.out_device = out_device

    def forward(self, *args, **kwargs):
        cpu_args = [a.to("cpu") if torch.is_tensor(a) else a for a in args]
        cpu_kwargs = {k: (v.to("cpu") if torch.is_tensor(v) else v) for k, v in kwargs.items()}

        return _tensors_to(self.model(*cpu_args, **cpu_kwargs), self.out_device)

    def parameters(self, recurse=True):
        return self.model.parameters(recurse=recurse)


def _load_pipeline():
    global _pipe
    if _pipe is not None:
        return _pipe

    with _pipe_lock:
        if _pipe is not None:
            return _pipe

        from diffusers import DiffusionPipeline

        device = _device()
        print(f"Loading {MODEL_ID} on {device}…", flush=True)

        pipe = DiffusionPipeline.from_pretrained(
            MODEL_ID,
            custom_pipeline=CUSTOM_PIPELINE,
            torch_dtype=_dtype(),
            trust_remote_code=True,
        )
        pipe.to(device)

        if device == "mps" and hasattr(pipe, "vision_encoder"):
            pipe.vision_encoder = _CPUEncoderWithDeviceOutput(pipe.vision_encoder, device)
            print("vision_encoder wrapped: runs on CPU, outputs on MPS.", flush=True)

        pipe.enable_attention_slicing(1)

        from diffusers import DPMSolverMultistepScheduler
        pipe.scheduler = DPMSolverMultistepScheduler.from_config(dict(pipe.scheduler.config))

        _pipe = pipe
        print("Pipeline ready.", flush=True)

    return _pipe


def _to_model_input(image_rgba):
    """
    White-composited square RGB at the model's input size.

    Zero123++ was trained on objects on white, and the client cuts the
    background back out afterwards by flood-filling from the border, so interior
    white in the sprite survives.
    """
    background = Image.new("RGBA", image_rgba.size, (255, 255, 255, 255))
    background.paste(image_rgba, mask=image_rgba.split()[3])
    rgb = background.convert("RGB")

    width, height = rgb.size
    scale = INPUT_SIZE / max(width, height)
    new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
    # Nearest keeps the input's hard pixel edges rather than blurring them,
    # which gives the model cleaner shapes to work from.
    resized = rgb.resize(new_size, Image.NEAREST)

    canvas = Image.new("RGB", (INPUT_SIZE, INPUT_SIZE), (255, 255, 255))
    canvas.paste(resized, ((INPUT_SIZE - new_size[0]) // 2, (INPUT_SIZE - new_size[1]) // 2))

    return canvas


def _split_grid(grid):
    """
    Zero123++ returns the six views as one grid. Layout is detected from the
    aspect ratio: landscape is 3x2, portrait is 2x3.
    """
    width, height = grid.size
    columns, rows = (3, 2) if width >= height else (2, 3)
    cell_width, cell_height = width // columns, height // rows

    views = []
    for row in range(rows):
        for column in range(columns):
            box = (column * cell_width, row * cell_height,
                   (column + 1) * cell_width, (row + 1) * cell_height)
            views.append(grid.crop(box).convert("RGB"))

    return views


def _synthesise(image_rgb, steps, on_step=None):
    """One Zero123++ pass: RGB in, six view images out."""
    import warnings

    pipe = _load_pipeline()

    def callback(step, _timestep, _latents):
        if on_step:
            on_step(step + 1, steps)

    with _inference_lock:
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=FutureWarning, message=".*callback.*")
            grid = pipe(
                image_rgb,
                num_inference_steps=steps,
                callback=callback,
                callback_steps=1,
            ).images[0]

    return _split_grid(grid)


def _encode(image):
    buf = io.BytesIO()
    image.save(buf, format="PNG")

    return base64.b64encode(buf.getvalue()).decode()


def run(image, targets, *, encode=None, description="", seed=None, source="S", progress=None):
    """
    Generates one frame per requested target facing.

    `targets` carries the yaw each facing needs, which the caller has already
    reduced to the near side — the client mirrors the far side itself, so this
    engine is never asked for more than SW, W, NW and N.

    @param image    RGBA input sprite at native resolution
    @param targets  [{'direction': 'W', 'yaw': 90}, ...]
    @param encode   ignored; kept for interface parity with engine_img2img
    @returns        {'frames': [{'direction', 'image_b64'}], 'notes': [...]}
    """
    def report(value, label=None):
        if progress:
            progress(value, label)

    yaws = {t["direction"]: int(t.get("yaw", 0)) % 360 for t in targets}
    needs_back = _BACK_YAW in yaws.values()
    total_passes = 2 if needs_back else 1

    report(2, "Loading Zero123++…")
    _load_pipeline()

    model_input = _to_model_input(image)

    def pass_progress(pass_index):
        base = 5 + pass_index * (90 // total_passes)
        span = (90 // total_passes) - 5

        def on_step(step, steps):
            report(
                base + int(span * step / max(1, steps)),
                f"Synthesising views, pass {pass_index + 1} of {total_passes} "
                f"(step {step}/{steps})…",
            )

        return on_step

    print(f"Pass 1 of {total_passes}: synthesising 6 views…", flush=True)
    views = _synthesise(model_input, DEFAULT_STEPS, pass_progress(0))

    frames = []
    notes = []

    for direction, yaw in yaws.items():
        if yaw == _BACK_YAW:
            continue
        if yaw not in _YAW_TO_VIEW:
            notes.append(f"{direction}: yaw {yaw} has no Zero123++ view; skipped.")
            continue

        index, offset = _YAW_TO_VIEW[yaw]
        frames.append({"direction": direction, "image_b64": _encode(views[index])})
        if offset:
            notes.append(
                f"{direction}: nearest available view is azimuth "
                f"{VIEW_AZIMUTHS[index]}, {offset} degrees off {yaw}."
            )

    if needs_back:
        # Chain: the azimuth-150 view becomes the input, and its own azimuth-30
        # output composes to 180 — a straight-on back view the model will not
        # produce directly. Drift from pass 1 carries into pass 2.
        print(f"Pass 2 of {total_passes}: chaining for the back view…", flush=True)
        chained_input = _to_model_input(views[_CHAIN_IN_VIEW].convert("RGBA"))
        chained = _synthesise(chained_input, DEFAULT_STEPS, pass_progress(1))

        back = next(d for d, y in yaws.items() if y == _BACK_YAW)
        frames.append({"direction": back, "image_b64": _encode(chained[_CHAIN_OUT_VIEW])})
        notes.append(
            f"{back}: composed from two passes (azimuth 150 then 30). Expect more "
            "drift here than in the single-pass facings."
        )

    report(100, "Done")

    return {"frames": frames, "notes": notes, "engine": "zero123"}
