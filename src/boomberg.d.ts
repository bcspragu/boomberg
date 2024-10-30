export interface User {
  id: number
  name: string | null
  createdAt: number
}

export interface TerminalNode {
  type: 'Terminal'
}

export interface StonkNode {
  type: 'Stonk'
}

export type SplitDirection = 'v' | 'h'

export interface SplitNode {
  type: 'Split'
  direction: SplitDirection
  children: [number, number]
}

export type LeafNode = {
  type: 'Leaf'
  node: TerminalNode | StonkNode
}

export type ViewNode = (SplitNode | LeafNode) & {
  id: number
}

export interface ViewLayout {
  nodes: Record<number, ViewNode>
  rootID: number
}

export interface StonkViewRequest {
  viewType: 'Stonk'
  ticker: string
}

export interface TerminalViewRequest {
  viewType: 'Terminal'
}

export interface CloseViewRequest {
  viewType: 'Close'
}

export type ViewRequest = StonkViewRequest | TerminalViewRequest | CloseViewRequest

export interface Terminal {
  shellPrefix: string
  contents: string[]
  cursorPosition: number
  showCursor: boolean
  shouldBlink: boolean
  historyPosition: number | null
  commandHistory: string[]
  tempHistory: string
}
