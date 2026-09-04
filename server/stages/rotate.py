"""
Rotation stage — picks an engine and delegates to it.

    SPRITE_ROTATE_ENGINE = zero123 | img2img      default: zero123

`zero123` (engine_zero123) is the default because it is conditioned on
viewpoint, which is what rotation actually needs, and because its weights are
already cached locally.

`img2img` (engine_img2img) is kept as a baseline. It was the original default
and was measured on 2026-09-04 to not rotate the subject at all — the frames
come back still facing the viewer. See that module's docstring.

Importing this module does not load any model; each engine loads lazily on its
first run so the server starts instantly.
"""
import os

_ENGINE_NAME = os.environ.get("SPRITE_ROTATE_ENGINE", "zero123").strip().lower()

if _ENGINE_NAME == "img2img":
    from . import engine_img2img as _engine
elif _ENGINE_NAME == "zero123":
    from . import engine_zero123 as _engine
else:
    raise ValueError(
        f"Unknown SPRITE_ROTATE_ENGINE {_ENGINE_NAME!r} — expected 'zero123' or 'img2img'"
    )

EXPECTED_DOWNLOAD_BYTES = _engine.EXPECTED_DOWNLOAD_BYTES


def engine_name():
    return _ENGINE_NAME


def model_id():
    return _engine.model_id()


def describe():
    return _engine.describe()


def cached_bytes():
    return _engine.cached_bytes()


def weights_ready():
    return _engine.weights_ready()


def status():
    return {**_engine.status(), "engine": _ENGINE_NAME}


def run(*args, **kwargs):
    return _engine.run(*args, **kwargs)
