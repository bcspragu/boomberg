import { getContext, setContext } from 'svelte'

export class StatusBar {
  leftMessage = $state('')
  centerMessage = $state('')
  rightMessage = $state('')
}

export const initStatusBar = (): StatusBar => {
  const statusBar = new StatusBar()
  statusBar.leftMessage = 'LEFT '.repeat(4)
  statusBar.centerMessage = 'CENTER '.repeat(4)
  statusBar.rightMessage = 'RIGHT '.repeat(4)
  setContext('statusbar', statusBar)
  return statusBar
}

export type StatusBarLoc = 'left' | 'center' | 'right'

export const updateStatusBar = (msg: string, loc: StatusBarLoc) => {
  const sb = getContext('statusbar') as StatusBar
  switch (loc) {
    case 'left':
      sb.leftMessage = msg
      break
    case 'center':
      sb.centerMessage = msg
      break
    case 'right':
      sb.rightMessage = msg
      break
  }
}
