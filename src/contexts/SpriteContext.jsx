import { createContext, useContext } from 'react'

export const SpriteContext = createContext(null)

export function useSpriteContext() {
  return useContext(SpriteContext)
}
