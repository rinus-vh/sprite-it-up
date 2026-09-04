import { createContext, useContext } from 'react'

export const EditorContext = createContext(null)

export function useEditorContext() {
  return useContext(EditorContext)
}
