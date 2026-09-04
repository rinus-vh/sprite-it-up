"""
Rotation engine: Stable Diffusion 1.5 image-to-image.

NOT the default. Kept because it is a useful baseline, and because img2img is
the right shape for the animate mode where staying anchored to the input pose is
exactly what you want.

Tested 2026-09-04 on a 40x40 character sprite, 4-frame set from South: frames
generate and the palette survives, but **the subject does not turn**. W, N and E
all came back still facing the viewer. That is inherent, not a tuning problem —
at the strength needed to keep the character recognisable, img2img stays
anchored to the input's composition, which is precisely what prevents a
viewpoint change. A prompt saying "seen from behind" cannot overcome it.
Rotation needs viewpoint conditioning, so `engine_zero123` is the default.

Select this engine with SPRITE_ROTATE_ENGINE=img2img.

  SPRITE_MODEL   HF repo or local path   default: stable-diffusion-v1-5/...
  SPRITE_LORA    HF repo or local path   optional pixel-art LoRA weights
  SPRITE_DEVICE  mps | cuda | cpu        default: autodetect

What this stage does NOT do: pixel-grid reduction and palette locking. Those run
client-side in src/machinery/finalizeFrame.js so that every engine we might swap
in gets the same treatment.
"""
import os

import numpy as np
import torch
from PIL import Image

# Working resolution for diffusion. The sprite arrives tiny and is scaled up
# with nearest-neighbour so the model sees hard pixel edges rather than a blur.
WORK_SIZE = 512

# Colour the sprite is composited onto so transparency can be recovered
# afterwards. Picked per-image from colours the sprite does not use.
_KEY_CANDIDATES = [(255, 0, 255), (0, 255, 0), (0, 255, 255), (255, 255, 0)]

# The canonical id. "runwayml/stable-diffusion-v1-5" still 307-redirects here,
# but resolving through the redirect gave the same blob two different cache
# entries, so every attempt restarted the download from zero.
_MODEL = os.environ.get("SPRITE_MODEL", "stable-diffusion-v1-5/stable-diffusion-v1-5")
_LORA = os.environ.get("SPRITE_LORA")

# Total weight download for this pipeline, safetensors only. Approximate and
# only used to turn cache bytes into a percentage — being a few hundred MB out
# costs nothing, whereas showing no progress at all during a multi-hour
# download is what made the app look hung.
EXPECTED_DOWNLOAD_BYTES = 4.3 * 1024 ** 3

_FACING_PROMPT = {
    "S": "seen from the front, facing the viewer",
    "SW": "seen from the front three-quarter view, facing front-left",
    "W": "seen from the side, facing left, full profile",
    "NW": "seen from behind at a three-quarter view, facing back-left",
    "N": "seen from behind, back turned to the viewer",
    "NE": "seen from behind at a three-quarter view, facing back-right",
    "E": "seen from the side, facing right, full profile",
    "SE": "seen from the front three-quarter view, facing front-right",
}

_STYLE_PROMPT = (
    "pixel art sprite, crisp hard pixel edges, limited palette, flat colours, "
    "no anti-aliasing, plain solid background, centred, full body"
)

_NEGATIVE_PROMPT = (
    "blurry, soft edges, gradient, anti-aliased, photorealistic, 3d render, "
    "text, watermark, signature, multiple characters, cropped"
)

_pipe = None
_pipe_lock = None


def _device():
    requested = os.environ.get("SPRITE_DEVICE")
    if requested:
        return requested
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def model_id():
    """The configured model, for callers outside this module."""
    return _MODEL


def describe():
    """Short engine description, shown in the app's server status."""
    lora = f" + LoRA {os.path.basename(_LORA)}" if _LORA else ""
    return f"SD img2img — {_MODEL}{lora} on {_device()}"


def _cache_dir():
    """Where huggingface_hub keeps this model's blobs."""
    from huggingface_hub.constants import HF_HUB_CACHE

    return os.path.join(HF_HUB_CACHE, "models--" + _MODEL.replace("/", "--"))


def cached_bytes():
    """
    Bytes of this model already on disk, completed and partial.

    Only the blobs directory is counted: the snapshot directory is symlinks
    back into blobs, and getsize() follows them, which double-counted every
    byte and reported 40 GB for a 20 GB cache.
    """
    total = 0
    for root, _dirs, files in os.walk(os.path.join(_cache_dir(), "blobs")):
        for name in files:
            try:
                total += os.path.getsize(os.path.join(root, name))
            except OSError:
                pass

    return total


def weights_ready():
    """
    Whether the weights are downloaded far enough to load without hitting the
    network. Any `.incomplete` blob means a download was interrupted.
    """
    directory = _cache_dir()
    if not os.path.isdir(directory):
        return False

    for root, _dirs, files in os.walk(directory):
        for name in files:
            if name.endswith(".incomplete"):
                return False

    return _pipe is not None or cached_bytes() > EXPECTED_DOWNLOAD_BYTES * 0.9


def status():
    """Reported by GET /model-status so the app can warn before a long wait."""
    return {
        "repo": _MODEL,
        "ready": weights_ready(),
        "loaded": _pipe is not None,
        "cached_bytes": cached_bytes(),
        "expected_bytes": int(EXPECTED_DOWNLOAD_BYTES),
    }


def _load_pipeline():
    """Loads the diffusion pipeline on first use, not at server startup."""
    global _pipe, _pipe_lock
    if _pipe is not None:
        return _pipe

    import threading
    if _pipe_lock is None:
        _pipe_lock = threading.Lock()

    with _pipe_lock:
        if _pipe is not None:
            return _pipe

        from diffusers import StableDiffusionImg2ImgPipeline

        device = _device()
        print(f"Loading {_MODEL} on {device} — first run downloads the weights…", flush=True)

        pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
            _MODEL,
            torch_dtype=torch.float32 if device in ("mps", "cpu") else torch.float16,
            safety_checker=None,
            requires_safety_checker=False,
            # Without this the hub also fetches the duplicate .bin weights —
            # roughly double the download for files that are never loaded.
            use_safetensors=True,
        )
        pipe.set_progress_bar_config(disable=False)
        pipe = pipe.to(device)

        if _LORA:
            print(f"Loading LoRA weights from {_LORA}…", flush=True)
            pipe.load_lora_weights(_LORA)

        _pipe = pipe
        print("Pipeline ready.", flush=True)

    return _pipe


def _pick_key_colour(image):
    """A colour the sprite does not contain, so keying it out is unambiguous."""
    used = {px[:3] for px in image.getdata() if px[3] > 127}
    for candidate in _KEY_CANDIDATES:
        if candidate not in used:
            return candidate
    # Every candidate is in use — fall back to a colour far from all of them.
    return (255, 0, 255)


def _flatten(image, key):
    background = Image.new("RGBA", image.size, key + (255,))
    return Image.alpha_composite(background, image).convert("RGB")


def _upscale(image, size):
    return image.resize((size, size), Image.NEAREST)


def _key_out(image, key, tolerance=60):
    """Restores transparency by removing pixels close to the key colour."""
    arr = np.asarray(image.convert("RGB")).astype(np.int16)
    distance = np.sqrt(((arr - np.array(key, dtype=np.int16)) ** 2).sum(axis=2))
    alpha = np.where(distance < tolerance, 0, 255).astype(np.uint8)

    out = np.dstack([np.asarray(image.convert("RGB")), alpha])
    return Image.fromarray(out, mode="RGBA")


def run(image, targets, *, encode, description="", seed=None, source="S", progress=None):
    """
    Generates one frame per target facing.

    Every facing is generated from the same input with the same seed, which is
    the cheapest thing that meaningfully improves cross-frame consistency: the
    denoiser starts from identical noise, so silhouette and colour placement
    drift far less than with independent seeds.

    @param image    RGBA input sprite at native resolution
    @param targets  [{'direction': 'W', 'yaw': 90}, ...]
    @param encode   callable(PIL.Image) -> base64 png, injected by the server
    """
    def report(value, label=None):
        if progress:
            progress(value, label)

    pipe = _load_with_progress(report)

    key = _pick_key_colour(image)
    flat = _upscale(_flatten(image, key), WORK_SIZE)

    if seed is None:
        seed = torch.seed() % (2 ** 31)
    subject = description.strip() or "character sprite"

    frames = []
    for index, target in enumerate(targets):
        direction = target["direction"]
        facing = _FACING_PROMPT.get(direction, "")
        label = f"Generating {direction} ({index + 1}/{len(targets)})…"
        report(60 + int(38 * index / len(targets)), label)
        print(label, flush=True)

        generator = torch.Generator(device="cpu").manual_seed(int(seed))

        result = pipe(
            prompt=f"{subject}, {facing}, same character as reference, {_STYLE_PROMPT}",
            negative_prompt=_NEGATIVE_PROMPT,
            image=flat,
            # A wide turn needs more freedom than a small one, but too much and
            # the character stops being the same character. 0.42–0.68 keeps the
            # silhouette recognisable across a full 180°.
            strength=_strength_for(target.get("yaw", 90)),
            guidance_scale=7.5,
            num_inference_steps=30,
            generator=generator,
        )

        frames.append({
            "direction": direction,
            "image_b64": encode(_key_out(result.images[0], key)),
        })

    report(100, "Done")
    return {"frames": frames, "seed": int(seed)}


def _load_with_progress(report):
    """
    Loads the pipeline while reporting download progress.

    The first run pulls several gigabytes, which on a slow connection takes
    hours. Loading it behind a single unchanging "Loading model…" made the app
    look hung, so a watcher thread turns cache growth into real progress and a
    byte count the user can sanity-check against their own link speed.
    """
    import threading

    if weights_ready():
        report(3, "Loading model…")

        return _load_pipeline()

    done = threading.Event()

    def watch():
        while not done.wait(2):
            cached = cached_bytes()
            fraction = min(cached / EXPECTED_DOWNLOAD_BYTES, 0.999)
            report(
                2 + int(56 * fraction),
                f"Downloading weights — {cached / 1024 ** 3:.2f} of "
                f"{EXPECTED_DOWNLOAD_BYTES / 1024 ** 3:.1f} GB "
                f"({fraction * 100:.0f}%). One time only.",
            )

    report(2, "Downloading weights — this is a one-time download.")
    watcher = threading.Thread(target=watch, daemon=True)
    watcher.start()
    try:
        pipe = _load_pipeline()
    finally:
        done.set()

    report(60, "Model ready.")

    return pipe


def _strength_for(yaw):
    turn = min(abs(yaw), 360 - abs(yaw))  # 0–180
    return round(0.42 + 0.26 * (turn / 180.0), 3)
