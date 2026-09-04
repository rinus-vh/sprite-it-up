import { Download, Grid3x3, Image, Pencil, Play, Sparkles } from 'lucide-react'
import {
  Grid, Header, MinimizedPanelsMenu, MinimizedPanelsMenuContextProvider, Panel, usePanelManager,
} from '@6njp/prototype-library'
import { getThemeVariables, ThemeContextProvider } from '@6njp/prototype-library/machinery'

import { ServerLogModal } from '@/features/ServerLogModal.jsx'
import { ServerSetupModal } from '@/features/ServerSetupModal.jsx'
import { EditPanelContent } from '@/features/panels/EditPanelContent.jsx'
import { ExportPanelContent } from '@/features/panels/ExportPanelContent.jsx'
import { GeneratePanelContent } from '@/features/panels/GeneratePanelContent.jsx'
import { InputPanelContent } from '@/features/panels/InputPanelContent.jsx'
import { OutputPanelContent } from '@/features/panels/OutputPanelContent.jsx'

import { EditorContextProvider } from '@/contexts/EditorContextProvider.jsx'
import { useServerContext } from '@/contexts/ServerContext.jsx'
import { ServerContextProvider } from '@/contexts/ServerContextProvider.jsx'
import { SpriteContextProvider } from '@/contexts/SpriteContextProvider.jsx'

import styles from './App.module.css'

export default function App() {
  const [isDark, setIsDark] = React.useState(true)
  const theme = isDark ? 'dark' : 'light'

  return (
    <ThemeContextProvider {...{ theme }}>
      <ServerContextProvider>
        <SpriteContextProvider>
          <EditorContextProvider>
            <MinimizedPanelsMenuContextProvider>
              <main style={getThemeVariables(theme)} className={styles.app}>
                <AppShell
                  onToggleTheme={() => setIsDark(prev => !prev)}
                  {...{ isDark }}
                />
              </main>
            </MinimizedPanelsMenuContextProvider>
          </EditorContextProvider>
        </SpriteContextProvider>
      </ServerContextProvider>
    </ThemeContextProvider>
  )
}

/**
 * Everything below the providers.
 *
 * The panels are declared and managed here rather than inside the grid, so the
 * header can reach them: its menu is the dashboard, and every panel — including
 * one you closed or minimised — is one click away from being back on the grid.
 */
function AppShell({ isDark, onToggleTheme }) {
  const panels = useAppPanels()

  const menuItems = panels.map(panel => ({
    label: panel.title,
    icon: panel.icon,
    onClick: panel.manager.open,
  }))

  return (
    <>
      <Header
        title='Sprite It Up'
        logo={Grid3x3}
        layoutClassName={styles.headerLayout}
        {...{ isDark, onToggleTheme, menuItems }}
      />

      <Grid layoutClassName={styles.gridLayout}>
        {panels.map(({ id, title, minWidth, minHeight, defaultWidth, defaultHeight, Content, manager }) => (
          manager.visible && (
            <Panel
              isCloseable
              isMinimizable
              key={id}
              onClose={manager.close}
              onMinimize={manager.minimize}
              {...{ title, minWidth, minHeight, defaultWidth, defaultHeight }}
            >
              <Content />
            </Panel>
          )
        ))}
      </Grid>

      <MinimizedPanelsMenu layoutClassName={styles.minimizedMenuLayout} />

      <SetupModal />

      <LogModal />
    </>
  )
}

/**
 * The panel roster, in grid order.
 *
 * One `usePanelManager` call each rather than a loop: hooks have to run in a
 * fixed order, and a roster this size reads better spelled out than hidden
 * behind an abstraction.
 */
function useAppPanels() {
  // Input and Generate are the flow, so they are on the grid from the start.
  // Preview, Edit and Export each wait to be asked for from the header menu
  // rather than taking grid room up front — now that every panel has a menu
  // item, an empty panel explaining what it would show earns nothing.
  const input = usePanelManager('input', 'Input')
  const generate = usePanelManager('generate', 'Generate')
  const output = usePanelManager('output', 'Preview', { defaultVisible: false })
  const edit = usePanelManager('edit', 'Edit', { defaultVisible: false })
  const exportPanel = usePanelManager('export', 'Export', { defaultVisible: false })

  return [
    {
      id: 'input',
      title: 'Input',
      icon: Image,
      minWidth: 4,
      minHeight: 5,
      Content: InputPanelContent,
      manager: input,
    },
    {
      id: 'generate',
      title: 'Generate',
      icon: Sparkles,
      minWidth: 4,
      minHeight: 6,
      Content: GeneratePanelContent,
      manager: generate,
    },
    {
      id: 'output',
      title: 'Preview',
      icon: Play,
      minWidth: 5,
      minHeight: 6,
      Content: OutputPanelContent,
      manager: output,
    },
    {
      id: 'edit',
      title: 'Edit',
      icon: Pencil,
      // A pixel canvas plus a toolbar and a palette column needs real room —
      // cramped, the sprite ends up smaller than the buttons around it.
      minWidth: 6,
      minHeight: 7,
      defaultWidth: 8,
      defaultHeight: 8,
      Content: EditPanelContent,
      manager: edit,
    },
    {
      id: 'export',
      title: 'Export',
      icon: Download,
      minWidth: 3,
      minHeight: 3,
      Content: ExportPanelContent,
      manager: exportPanel,
    },
  ]
}

function LogModal() {
  const { logOpen, closeLog } = useServerContext()

  return <ServerLogModal isOpen={logOpen} onClose={closeLog} />
}

function SetupModal() {
  const { setupOpen, closeSetup, recheck, checking, available } = useServerContext()

  // Offer the steps unprompted when the first check comes back negative.
  const [dismissed, setDismissed] = React.useState(false)
  const isOpen = setupOpen || (available === false && !dismissed)

  return (
    <ServerSetupModal
      onClose={() => { setDismissed(true); closeSetup() }}
      onCheckAgain={recheck}
      {...{ isOpen, checking }}
    />
  )
}
