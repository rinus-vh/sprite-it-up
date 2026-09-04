import { createContext, useContext } from 'react'

export const ServerContext = createContext(null)

export function useServerContext() {
  return useContext(ServerContext)
}
