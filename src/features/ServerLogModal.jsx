import { RefreshCw } from 'lucide-react'
import { GhostButton, LabelUppercaseXs, ModalFlexible, ParagraphSm, Tag } from '@6njp/prototype-library'

import { useServerContext } from '@/contexts/ServerContext.jsx'
import { fetchLogs } from '@/machinery/serverClient.js'

import styles from './ServerLogModal.module.css'

const POLL_INTERVAL = 1000

/**
 * Live tail of the server's stdout — model downloads and diffusion progress
 * take minutes, and watching the actual output beats a spinner that can't say
 * what is happening.
 *
 * A modal rather than a panel: the grid only has room for so many panels at a
 * given window height, and diagnostic output is not worth displacing the work.
 *
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
export function ServerLogModal({ isOpen, onClose }) {
  return (
    <ModalFlexible title='Server log' {...{ isOpen, onClose }}>
      {/* Mounted only while open: the content polls the server every second,
          and the modal keeps its children mounted when closed. */}
      {isOpen && <ServerLogModalContent />}
    </ModalFlexible>
  )
}

function ServerLogModalContent() {
  const { available, engine, checking, recheck, openSetup } = useServerContext()
  const [lines, setLines] = React.useState([])
  const listRef = React.useRef(null)

  React.useEffect(
    () => {
      if (!available) return

      let cancelled = false

      // The whole buffer is re-read each tick rather than only new lines: the
      // server rewrites its last line while a progress bar runs, so an
      // incremental fetch would leave stale copies of it behind. The buffer is
      // capped at 500 lines and the server is local, so this costs nothing.
      async function poll() {
        const fresh = await fetchLogs(0)
        if (cancelled) return

        setLines(fresh)
      }

      poll()
      const id = setInterval(poll, POLL_INTERVAL)

      return () => { cancelled = true; clearInterval(id) }
    },
    [available],
  )

  // Follow the tail as new output arrives.
  React.useEffect(
    () => {
      const list = listRef.current
      if (list) list.scrollTop = list.scrollHeight
    },
    [lines],
  )

  return (
    <div className={styles.componentContent}>
      <div className={styles.header}>
        {available
          ? <Tag variant='success'>Connected</Tag>
          : <Tag variant='alert'>Offline</Tag>}

        {Boolean(engine) && (
          <span className={styles.engine}>
            <LabelUppercaseXs>{engine}</LabelUppercaseXs>
          </span>
        )}

        <GhostButton
          label={checking ? 'Checking…' : 'Recheck'}
          icon={RefreshCw}
          color='white'
          onClick={recheck}
        />
      </div>

      {available
        ? (
          <ol ref={listRef} className={styles.log}>
            {lines.map(line => (
              <li key={line.seq} className={styles.line}>{line.text}</li>
            ))}

            {!lines.length && (
              <li className={styles.line}>Waiting for server output…</li>
            )}
          </ol>
        )
        : (
          <div className={styles.offline}>
            <ParagraphSm>
              The local server isn&apos;t running, so nothing can be generated yet.
            </ParagraphSm>

            <GhostButton label='Show setup steps' color='white' onClick={openSetup} />
          </div>
        )}
    </div>
  )
}
