// TODO: Implement the layout-wide terminal metadata store, for saving terminal information across rerenders as splits change.
import { getContext, setContext } from 'svelte'

export interface TerminalParams {
  get shellPrefix(): string
}

export class Terminal {
  shellPrefix: string
  contents: string[] = $state([])
  cursorPosition: number = $state(0)
  showCursor: boolean = $state(true)
  shouldBlink: boolean = $state(false)
  historyPosition: number | null = $state(null)
  commandHistory: string[] = $state([])
  tempHistory: string = $state('')

  constructor(params: TerminalParams) {
    this.shellPrefix = params.shellPrefix
    this.contents = [
      'Welcome to your Boomberg terminal!',
      ' ',
      "Type 'help' then hit <Enter> to get started.",
      ' ',
      params.shellPrefix,
    ]
  }
}

export const initTerminals = (ts?: Record<number, Terminal>) => {
  setContext('terms', ts ?? {})
}

export const getOrInitTerminal = (id: number): Terminal => {
  const terms = getContext('terms') as Record<number, Terminal>
  if (!terms[id]) {
  }
  return terms[id]
}
