/**
 * Client for the local generation server (server/server.py).
 *
 * Nothing here talks to a remote service — the whole pipeline runs on this
 * machine. When the server isn't up the app says so and shows the setup steps
 * rather than failing silently.
 */
const SERVER = 'http://127.0.0.1:8766'

/** @returns {Promise<{ ok: boolean, capabilities: string[], engine: string | null }>} */
export async function checkServer() {
  try {
    const res = await fetch(`${SERVER}/health`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return { ok: false, capabilities: [], engine: null }
    const data = await res.json()

    return { ok: true, capabilities: data.capabilities ?? [], engine: data.engine ?? null }
  } catch {
    return { ok: false, capabilities: [], engine: null }
  }
}

/** Rolling server stdout, for the log panel. */
export async function fetchLogs(since = 0) {
  try {
    const res = await fetch(`${SERVER}/logs?since=${since}`, { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return []

    return await res.json()
  } catch {
    return []
  }
}

/**
 * Whether the rotate stage's weights are on disk.
 *
 * The first generation otherwise downloads several gigabytes behind a progress
 * bar, which on a slow connection is indistinguishable from a hang. Checking
 * first lets the app say so before the user commits to waiting.
 *
 * @returns {Promise<{ ready: boolean, cachedBytes: number, expectedBytes: number, repo: string | null } | null>}
 */
export async function checkModelStatus() {
  try {
    const res = await fetch(`${SERVER}/model-status`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return null
    const data = await res.json()

    return {
      ready: Boolean(data.ready),
      cachedBytes: data.cached_bytes ?? 0,
      expectedBytes: data.expected_bytes ?? 0,
      repo: data.repo ?? null,
    }
  } catch {
    return null
  }
}

const POLL_INTERVAL = 700

/**
 * Posts to a generation endpoint and polls the job to completion.
 *
 * Generation is minutes-long, so the server hands back a job id immediately
 * instead of holding the connection open.
 *
 * @param {string} path            e.g. '/rotate'
 * @param {object} body            JSON payload
 * @param {{ onProgress?: (info: { progress: number, label?: string }) => void, signal?: AbortSignal }} [options]
 */
export async function runJob(path, body, { onProgress, signal } = {}) {
  const res = await fetch(`${SERVER}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (res.status === 503) {
    const { error } = await res.json().catch(() => ({}))
    throw new ServerCapabilityError(error ?? `${path} is not available on the server`)
  }
  if (!res.ok) throw new Error(`Server responded ${res.status} for ${path}`)

  const { job_id: jobId } = await res.json()

  for (;;) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    await wait(POLL_INTERVAL)

    const status = await fetch(`${SERVER}/job/${jobId}`, { signal }).then(r => r.json())

    if (status.progress !== undefined) {
      onProgress?.({ progress: status.progress, label: status.label })
    }
    if (status.status === 'done') return status.result
    if (status.status === 'error') throw new Error(status.error ?? 'Generation failed')
  }
}

/** Thrown when the server is running but the stage's dependencies are missing. */
export class ServerCapabilityError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ServerCapabilityError'
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
