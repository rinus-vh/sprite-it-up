#!/usr/bin/env python3
"""
Sprite It Up — local sprite generation server.

Everything runs on this machine; no image ever leaves it. Each pipeline stage
lives in server/stages/<name>.py and exposes run(...). Stages are loaded at
startup and a stage whose dependencies are missing simply disables itself — the
server still starts with whatever is available, and the app tells you which
capabilities it found.

Run:   python3 server/server.py
"""
import base64
import io
import logging
import re
import sys
import threading
import uuid
from collections import deque

from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

PORT = 8766

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Access-log noise — /logs, /health and /job/<id> are polled every second and
# would otherwise drown out anything worth reading in the terminal.
# ---------------------------------------------------------------------------
_POLLING_RE = re.compile(r'"(?:GET|OPTIONS) /(?:logs|health|model-status|job/)')


class _SuppressPollingFilter(logging.Filter):
    def filter(self, record):
        return not _POLLING_RE.search(record.getMessage())


logging.getLogger("werkzeug").addFilter(_SuppressPollingFilter())

# ---------------------------------------------------------------------------
# Log capture — tee stdout/stderr into a rolling buffer so the browser can poll
# /logs and show live server output (model downloads, diffusion progress).
# ---------------------------------------------------------------------------
_LOG_LOCK = threading.Lock()
_LOG_LINES = deque(maxlen=500)
_LOG_SEQ = 0
# Seq of the last carriage-return line (a tqdm bar). Further \r writes overwrite
# that entry so the browser shows one updating line, not thirty separate ones.
_PROGRESS_SEQ = None


class _Tee:
    def __init__(self, orig):
        self._orig = orig

    def write(self, text):
        global _LOG_SEQ, _PROGRESS_SEQ
        self._orig.write(text)
        if not text or _POLLING_RE.search(text):
            return
        line = text.strip("\r\n")
        if not line:
            return

        is_overwrite = text.startswith("\r") and "\n" not in text
        with _LOG_LOCK:
            if is_overwrite and _PROGRESS_SEQ is not None and _LOG_LINES and _LOG_LINES[-1]["seq"] == _PROGRESS_SEQ:
                _LOG_SEQ += 1
                _LOG_LINES[-1] = {"seq": _LOG_SEQ, "text": line}
                _PROGRESS_SEQ = _LOG_SEQ
            else:
                _LOG_SEQ += 1
                _LOG_LINES.append({"seq": _LOG_SEQ, "text": line})
                _PROGRESS_SEQ = _LOG_SEQ if is_overwrite else None

    def flush(self):
        self._orig.flush()

    def fileno(self):
        return self._orig.fileno()


sys.stdout = _Tee(sys.stdout)
sys.stderr = _Tee(sys.stderr)

# ---------------------------------------------------------------------------
# Job registry — generation takes minutes, so stages run in background threads
# and the browser polls GET /job/<id> instead of holding a connection open.
# ---------------------------------------------------------------------------
_JOBS_LOCK = threading.Lock()
_JOBS: dict = {}


def _start_job(fn, *args, **kwargs):
    job_id = str(uuid.uuid4())
    with _JOBS_LOCK:
        _JOBS[job_id] = {"status": "running", "result": None, "error": None, "progress": 0, "label": "Starting…"}

    def report(progress, label=None):
        with _JOBS_LOCK:
            job = _JOBS.get(job_id)
            if job is None:
                return
            job["progress"] = progress
            if label is not None:
                job["label"] = label

    def run():
        try:
            result = fn(*args, progress=report, **kwargs)
            with _JOBS_LOCK:
                _JOBS[job_id].update(status="done", result=result, progress=100, label="Done")
        except Exception as exc:  # noqa: BLE001 — surfaced to the browser verbatim
            import traceback
            traceback.print_exc()
            with _JOBS_LOCK:
                _JOBS[job_id].update(status="error", error=str(exc))

    threading.Thread(target=run, daemon=True).start()
    return job_id


# ---------------------------------------------------------------------------
# Stage registry
# ---------------------------------------------------------------------------
STAGES = {}


def _load_stages():
    print("Sprite It Up server — loading stages…", flush=True)

    try:
        from stages import rotate
        STAGES["rotate"] = rotate
        print(f"  ✓ rotate     ({rotate.describe()})", flush=True)
        if not rotate.weights_ready():
            print(f"    weights not cached yet — run: python3 server/fetch_model.py", flush=True)
    except Exception as exc:  # noqa: BLE001
        print(f"  ✗ rotate     — {exc}", flush=True)

    # animate and asset-set are intentionally not wired yet: the engine choice
    # is still open (see README). Their endpoints answer 503 with a clear
    # message so the app can say so instead of failing obscurely.

    if not STAGES:
        print("  No stages loaded — check server/requirements.txt.", flush=True)
    print(f"\nListening on http://127.0.0.1:{PORT}\n", flush=True)


def _decode_image(b64, mode="RGBA"):
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert(mode)


def _encode_image(image):
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    engine = STAGES["rotate"].describe() if "rotate" in STAGES else None
    return jsonify({"status": "ok", "capabilities": list(STAGES.keys()), "engine": engine})


@app.get("/model-status")
def model_status():
    """
    Whether the rotate stage's weights are on disk. The app checks this before
    offering to generate, so a multi-gigabyte first download is something the
    user opts into knowingly rather than discovers as a stalled progress bar.
    """
    if "rotate" not in STAGES:
        return jsonify({"available": False}), 503

    return jsonify({"available": True, **STAGES["rotate"].status()})


@app.get("/logs")
def logs():
    since = int(request.args.get("since", 0))
    with _LOG_LOCK:
        lines = [line for line in _LOG_LINES if line["seq"] > since]
    return jsonify(lines)


@app.get("/job/<job_id>")
def job(job_id):
    with _JOBS_LOCK:
        state = _JOBS.get(job_id)
    if state is None:
        return jsonify({"status": "error", "error": "Unknown job"}), 404
    return jsonify(state)


@app.post("/rotate")
def rotate():
    if "rotate" not in STAGES:
        return jsonify({"error": "The rotate stage is not available — install server/requirements.txt and restart."}), 503

    body = request.get_json(force=True)
    image = _decode_image(body["image"])
    targets = body.get("targets", [])
    if not targets:
        return jsonify({"error": "No target directions requested"}), 400

    job_id = _start_job(
        STAGES["rotate"].run,
        image,
        targets,
        encode=_encode_image,
        description=body.get("description", ""),
        seed=body.get("seed"),
        source=body.get("from", "S"),
    )
    return jsonify({"job_id": job_id})


@app.post("/animate")
def animate():
    return jsonify({
        "error": "The animate stage is not wired to an engine yet — the model choice is still open. "
                 "Rotation is the pipeline that runs today."
    }), 503


@app.post("/asset-set")
def asset_set():
    return jsonify({
        "error": "The asset-set stage is not wired to an engine yet — the model choice is still open. "
                 "Rotation is the pipeline that runs today."
    }), 503


if __name__ == "__main__":
    sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent))
    _load_stages()
    app.run(host="127.0.0.1", port=PORT, threaded=True)
