import { Terminal, Trash2 } from 'lucide-react'
import { Button, GhostButton, Modal, ParagraphSm } from '@6njp/prototype-library'

import { CopyableCode } from './CopyableCode.jsx'

import styles from './ServerSetupModal.module.css'

/**
 * Shown when the local generation server isn't reachable.
 *
 * The app can't start the server for you — it's a separate long-running process
 * you need to own — so this hands over the exact commands instead, plus the
 * cleanup steps for taking it all off the machine again.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onCheckAgain: () => void,
 *   checking?: boolean,
 * }} props
 */
export function ServerSetupModal({ isOpen, onClose, onCheckAgain, checking = false }) {
  const [page, setPage] = React.useState('setup')

  function handleClose() {
    setPage('setup')
    onClose()
  }

  return (
    <Modal
      title={page === 'setup' ? 'Local server required' : 'Cleanup guide'}
      onClose={handleClose}
      {...{ isOpen }}
    >
      {page === 'setup'
        ? <SetupPage onCleanupGuide={() => setPage('cleanup')} {...{ checking, onCheckAgain }} />
        : <CleanupPage onBack={() => setPage('setup')} />}
    </Modal>
  )
}

function SetupPage({ checking, onCheckAgain, onCleanupGuide }) {
  return (
    <div className={styles.componentSetupPage}>
      <ParagraphSm>
        Sprite It Up generates on your own machine — nothing is sent to an external
        service. Start the local server once before generating.
      </ParagraphSm>

      <ol className={styles.steps}>
        <li className={styles.step}>
          <span className={styles.stepLabel}>Open a terminal in the project folder</span>
        </li>

        <li className={styles.step}>
          <span className={styles.stepLabel}>Install the dependencies <em>(one-time)</em></span>
          <CopyableCode>python3 -m pip install -r server/requirements.txt</CopyableCode>
        </li>

        <li className={styles.step}>
          <span className={styles.stepLabel}>
            Download the model weights <em>(one-time, ~4.6 GB)</em>
          </span>
          <CopyableCode>python3 server/fetch_model.py</CopyableCode>
        </li>

        <li className={styles.step}>
          <span className={styles.stepLabel}>Start the server</span>
          <CopyableCode>python3 server/server.py</CopyableCode>
        </li>

        <li className={styles.step}>
          <span className={styles.stepLabel}>
            Optional — point it at pixel-art LoRA weights for better raw output
          </span>
          <CopyableCode>SPRITE_LORA=/path/to/lora python3 server/server.py</CopyableCode>
        </li>

        <li className={styles.step}>
          <span className={styles.stepLabel}>Keep that terminal open and come back here</span>
        </li>
      </ol>

      <ParagraphSm>
        Fetching the weights as its own step is worth it: the download resumes if
        interrupted, and a terminal shows you the actual transfer rate instead of a
        percentage that can sit still for hours on a slow connection.
      </ParagraphSm>

      <div className={styles.footer}>
        <GhostButton
          label='Cleanup guide'
          icon={Trash2}
          color='white'
          onClick={onCleanupGuide}
        />

        <Button
          label={checking ? 'Checking…' : 'I’ve started the server'}
          variant='solid'
          icon={Terminal}
          disabled={checking}
          onClick={onCheckAgain}
        />
      </div>
    </div>
  )
}

function CleanupPage({ onBack }) {
  return (
    <div className={styles.componentCleanupPage}>
      <ParagraphSm>
        This removes Sprite It Up&apos;s Python dependencies and cached model weights from
        your machine. Stop the server first with Ctrl+C in its terminal.
      </ParagraphSm>

      <ol className={styles.steps}>
        <li className={styles.step}>
          <span className={styles.stepLabel}>Uninstall the Python packages</span>
          <CopyableCode>python3 -m pip uninstall -y flask flask-cors torch diffusers transformers accelerate peft Pillow numpy</CopyableCode>
        </li>

        <li className={styles.step}>
          <span className={styles.stepLabel}>Delete the cached model weights <em>(several GB)</em></span>
          <CopyableCode>rm -rf ~/.cache/huggingface</CopyableCode>
        </li>
      </ol>

      <div className={styles.footer}>
        <GhostButton label='Back to setup' color='white' onClick={onBack} />
      </div>
    </div>
  )
}
