#!/usr/bin/env python3
"""
Download the rotate stage's model weights up front.

Worth doing as its own step rather than on the first Generate click: the
download is several gigabytes, it resumes if interrupted, and running it in a
terminal gives you a real progress bar and transfer rate instead of a
percentage inside the app.

    python3 server/fetch_model.py

Respects SPRITE_MODEL, so it fetches whichever model the server is configured
to use.
"""
import os
import sys
from pathlib import Path

# See the long note in stages/rotate.py: the Xet backend cannot complete a large
# download on a constrained link and never resumes. Set here too so this script
# is correct regardless of import order.
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "60")

sys.path.insert(0, str(Path(__file__).parent))


def main():
    from stages import rotate

    if rotate.weights_ready():
        print(f"{rotate.model_id()} is already downloaded — nothing to do.")
        return 0

    cached = rotate.cached_bytes()
    total = rotate.EXPECTED_DOWNLOAD_BYTES
    print(f"Fetching {rotate.model_id()}")
    print(f"About {total / 1024 ** 3:.1f} GB, {cached / 1024 ** 3:.2f} GB already cached.")
    print("Interrupt with Ctrl+C at any point — rerunning resumes.\n")

    from huggingface_hub import snapshot_download

    # The default zero123 engine needs no allow_patterns dance: its repo holds
    # only the pipeline components. The pinned list below is for the img2img
    # engine, whose repo also carries standalone checkpoints and fp16 variants.
    patterns = None if rotate.engine_name() == "zero123" else [
        "model_index.json",
        "unet/config.json",
        "unet/diffusion_pytorch_model.safetensors",
        "vae/config.json",
        "vae/diffusion_pytorch_model.safetensors",
        "text_encoder/config.json",
        "text_encoder/model.safetensors",
        "tokenizer/*",
        "scheduler/*",
    ]

    try:
        snapshot_download(
            rotate.model_id(),
            # Never glob by extension: an earlier "*.safetensors" pattern
            # pulled 16 GB the pipeline never loads (standalone v1-5-pruned
            # checkpoints, the non_ema unet, and fp16 variants unused because
            # MPS runs fp32). Enumerate exactly what is needed.
            allow_patterns=patterns,
        )
    except KeyboardInterrupt:
        print("\nStopped. Rerun this command to resume.")
        return 1

    print("\nDone. Start the server with: python3 server/server.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
