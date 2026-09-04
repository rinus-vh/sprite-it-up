import { useCallback, useEffect, useState } from 'react'

import { checkModelStatus, checkServer } from '@/machinery/serverClient.js'
import { ServerContext } from './ServerContext.jsx'

/**
 * Tracks whether the local generation server is up and which stages it loaded.
 *
 * `available` is null until the first check resolves, so the UI can show
 * "checking" rather than flashing an error on load.
 */
export function ServerContextProvider({ children }) {
  const [available, setAvailable] = useState(null)
  const [capabilities, setCapabilities] = useState([])
  const [engine, setEngine] = useState(null)
  const [checking, setChecking] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [model, setModel] = useState(null)

  const apply = useCallback(
    (result) => {
      setAvailable(result.ok)
      setCapabilities(result.capabilities)
      setEngine(result.engine)
      if (result.ok) {
        setSetupOpen(false)
        checkModelStatus().then(setModel)
      } else {
        setModel(null)
      }
    },
    [],
  )

  const recheck = useCallback(
    async () => {
      setChecking(true)
      const result = await checkServer()
      apply(result)
      setChecking(false)

      return result.ok
    },
    [apply],
  )

  // The check on mount subscribes to an external system (the server), so the
  // state update belongs in the promise callback rather than the effect body.
  useEffect(
    () => {
      let cancelled = false
      checkServer().then(result => { if (!cancelled) apply(result) })

      return () => { cancelled = true }
    },
    [apply],
  )

  const value = {
    available,
    capabilities,
    engine,
    model,
    refreshModel: useCallback(() => checkModelStatus().then(setModel), []),
    checking,
    recheck,
    setupOpen,
    openSetup: useCallback(() => setSetupOpen(true), []),
    closeSetup: useCallback(() => setSetupOpen(false), []),
    logOpen,
    openLog: useCallback(() => setLogOpen(true), []),
    closeLog: useCallback(() => setLogOpen(false), []),
  }

  return (
    <ServerContext.Provider {...{ value }}>
      {children}
    </ServerContext.Provider>
  )
}
