"""
Pipeline stages.

The HuggingFace transfer settings live here because this is the earliest module
imported by anything that touches the hub, and they must be set before
`huggingface_hub` loads.

Measured on this project, same file, interleaved runs to cancel out link
fluctuation:

    Xet enabled (hub default)      4.0 kB/s
    Xet disabled              1,870 kB/s

Xet's adaptive concurrency controller ramps without bound — the logs in
`~/.cache/huggingface/xet/logs` showed 69 increases against 4 decreases,
reaching 57 parallel range requests, with zero errors — and dozens of
concurrent streams congest a modest connection into a crawl.
`HF_XET_NUM_CONCURRENT_RANGE_GETS` does not help; the controller overrides it.

Worse, each Xet attempt writes its own per-attempt `.incomplete` temp file, so a
dropped download restarts from byte zero instead of resuming. Together that made
a 4.3 GB model impossible to finish: ~7 GB transferred across a dozen attempts
per blob, nothing usable. The plain HTTP path resumes correctly.

Set HF_HUB_DISABLE_XET=0 to opt back in.
"""
import os

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
# 10s (the hub default) is too aggressive on a slow link: each timeout drops the
# connection and restarts TCP slow-start, so throughput never ramps.
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "60")
