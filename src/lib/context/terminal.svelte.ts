import { getContext, setContext } from 'svelte'
import { getUser } from './user.svelte'
import type { ViewRequest } from '../../boomberg'
import { getSSE, type SSE } from './sse.svelte'

export interface TerminalParams {
  shellPrefix: () => string
  setName: (name: string) => void
  showHelp: boolean
  sse: SSE
}

// This is for if a command 'blocks', it'll receive the events and return 'true' when it should unblock.
type BlockHandler = (e: KeyboardEvent) => { unblock: boolean }

interface ActionResponse {
  blockHandler: BlockHandler
}

interface ActionCommand {
  action: (args: string[]) => void | Promise<void> | ActionResponse | Promise<ActionResponse>
}

interface ParentCommand {
  subcommands: Record<string, Command>
}

type Command = (ActionCommand | ParentCommand) & {
  description: string
}

type RowContent =
  | string
  | { html: string }
  | { error: string }
  | { warn: string }
  | { loading: string }

export class Terminal {
  _shellPrefix: () => string
  _setName: (name: string) => void

  onNewPrompt: (() => void) | null = null
  onViewRequested: ((req: ViewRequest) => void) | null = null

  _commands: Record<string, Command>

  contents: RowContent[] = $state([])
  cursorPosition: number = $state(0)
  showCursor: boolean = $state(true)
  shouldBlink: boolean = $state(false)
  historyPosition: number | null = $state(null)
  commandHistory: string[] = $state([])
  tempHistory: string = $state('')
  sse: SSE

  activeBlockHandler: BlockHandler | null = null

  constructor(params: TerminalParams) {
    this._shellPrefix = params.shellPrefix
    this._setName = params.setName
    this.sse = params.sse
    this.contents = params.showHelp
      ? [
          'Welcome to your Boomberg terminal!',
          '',
          {
            html: 'This is your one-stop shop for <del>feeding all your money into a thinly veiled casino</del> all your stonk-transacting needs!',
          },
          '',
          "Type 'help' then hit <Enter> to get started.",
          '',
          this.shellPrefix,
        ]
      : [this.shellPrefix]
    this.cursorPosition = this.shellPrefix.length
    this._commands = this.makeCommands()
  }

  get shellPrefix(): string {
    return this._shellPrefix()
  }

  async handleKeydown(e: KeyboardEvent) {
    if (this.activeBlockHandler) {
      const { unblock } = this.activeBlockHandler(e)
      if (unblock) {
        this.activeBlockHandler = null
        return
      }
    }
    // Keys to ignore
    switch (e.key) {
      case 'Shift':
      case 'Meta':
      case 'Escape':
      case 'Tab':
      case 'Alt':
      case 'Control':
        return
    }

    const lastRow = this.contents[this.contents.length - 1]

    // Only allow operating on text rows.
    if (typeof lastRow !== 'string') {
      return
    }

    if (e.key === 'Backspace') {
      if (this.cursorPosition <= this.shellPrefix.length) {
        return
      }
      this.contents[this.contents.length - 1] =
        lastRow.substring(0, this.cursorPosition - 1) + lastRow.substring(this.cursorPosition)
      this.cursorPosition--
      return
    }
    if (e.key === 'Delete') {
      if (this.cursorPosition >= lastRow.length) {
        return
      }
      this.contents[this.contents.length - 1] =
        lastRow.substring(0, this.cursorPosition) + lastRow.substring(this.cursorPosition + 1)
      return
    }
    if (e.key === 'ArrowLeft') {
      if (this.cursorPosition <= this.shellPrefix.length) {
        return
      }
      this.cursorPosition--
      return
    }
    if (e.key === 'ArrowRight') {
      if (this.cursorPosition >= lastRow.length) {
        return
      }
      this.cursorPosition++
      return
    }
    if (e.key === 'ArrowUp') {
      if (this.historyPosition !== null) {
        if (this.historyPosition > 0) {
          this.historyPosition--
        } else {
          return
        }
      } else if (this.commandHistory.length > 0) {
        this.tempHistory = lastRow
        this.historyPosition = this.commandHistory.length - 1
      } else {
        return
      }
      this.contents[this.contents.length - 1] =
        `${this.shellPrefix}${this.commandHistory[this.historyPosition]}`
      this.cursorPosition = lastRow.length
      return
    }
    if (e.key === 'ArrowDown') {
      if (this.historyPosition === null) {
        return
      }
      if (this.historyPosition < this.commandHistory.length - 1) {
        this.historyPosition++
        this.contents[this.contents.length - 1] =
          `${this.shellPrefix}${this.commandHistory[this.historyPosition]}`
      } else {
        this.historyPosition = this.contents.length
        this.contents[this.contents.length - 1] = `${this.tempHistory}`
      }
      this.cursorPosition = lastRow.length
      return
    }
    if (e.key === 'Enter') {
      const { newPrompt } = await this.runCommand(lastRow.substring(this.shellPrefix.length))
      if (newPrompt) {
        this.newPrompt()
      }
      return
    }
    if (e.ctrlKey && e.key === 'c') {
      this.contents[this.contents.length - 1] = this.contents[this.contents.length - 1] + '^C'
      this.newPrompt()
      return
    }

    // We might eventually want to capture some of these, but for now, we're
    // just hogging normal browser behaviors.
    if (e.ctrlKey) {
      return
    }
    if (e.metaKey) {
      return
    }
    if (e.altKey) {
      return
    }

    e.preventDefault()

    // Enter the key verbatim
    this.addChar(e.key)
  }

  addChar(c: string) {
    const lastRow = this.contents[this.contents.length - 1]
    if (typeof lastRow !== 'string') {
      return
    }
    this.contents[this.contents.length - 1] =
      lastRow.substring(0, this.cursorPosition) + c + lastRow.substring(this.cursorPosition)
    this.cursorPosition++
  }

  newPrompt() {
    this.contents.push(this.shellPrefix)
    this.cursorPosition = this.shellPrefix.length
    this.historyPosition = null
    if (this.onNewPrompt) {
      this.onNewPrompt()
    }
  }

  async runCommand(rawCmd: string): Promise<{ newPrompt: boolean }> {
    this.commandHistory.push(rawCmd)
    const parts = rawCmd
      .trim()
      .split(' ')
      .filter((v) => v)
    if (!parts[0]) {
      return { newPrompt: true }
    }

    let cmds = this._commands
    for (let i = 0; i < parts.length; i++) {
      const cmd = cmds[parts[i]]
      if (!cmd) {
        this.addMessage(
          i === 0 ? `unknown command: ${parts[i]}` : `unknown subcommand: ${parts[i]}`,
        )
        return { newPrompt: true }
      }

      // Command has a direct action, run it.
      if ('action' in cmd) {
        const resp = await Promise.resolve(cmd.action(parts.slice(i + 1)))
        if (resp) {
          this.activeBlockHandler = resp.blockHandler
          return { newPrompt: false }
        }
        return { newPrompt: true }
      }

      cmds = cmd.subcommands
      if (i === parts.length - 1) {
        const help = this._commands['help'] as ActionCommand
        help.action(parts)
        return { newPrompt: true }
      }
    }
    return { newPrompt: true }
  }

  viewRequested(req: ViewRequest) {
    if (this.onViewRequested) {
      this.onViewRequested(req)
    }
  }

  addMessage(msg: RowContent | RowContent[]) {
    const lastRow = this.contents[this.contents.length - 1]
    if (lastRow !== '') {
      this.contents.push('')
    }

    const pushMessage = (m: RowContent) => {
      if (typeof m === 'string') {
        this.contents.push(`  ${m}`)
      } else if ('html' in m) {
        this.contents.push({ html: `  ${m.html}` })
      } else if ('warn' in m) {
        this.contents.push({ warn: `  ${m.warn}` })
      } else if ('error' in m) {
        this.contents.push({ error: `  ${m.error}` })
      } else if ('loading' in m) {
        this.contents.push(m)
      }
    }

    if (Array.isArray(msg)) {
      for (const m of msg) {
        pushMessage(m)
      }
    } else {
      pushMessage(msg)
    }
    this.contents.push('')
  }

  makeCommands(): Record<string, Command> {
    return {
      echo: {
        description: 'echo the input back to you',
        action: (args: string[]) => {
          this.addMessage(args.join(' '))
        },
      },
      clear: {
        description: 'clear the screen',
        action: () => {
          this.contents = []
        },
      },
      exit: {
        description: 'Close this terminal',
        action: () => {
          this.viewRequested({ viewType: 'Close' })
        },
      },
      stonk: {
        description: 'manage stonks',
        subcommands: {
          view: {
            description: 'view a stonk',
            action: (args: string[]) => {
              // TODO: Set the seed based on stonk info
              this.viewRequested({ viewType: 'Stonk', ticker: args[0], seed: args[0] })
            },
          },
        },
      },
      terminal: {
        description: 'manage your Boomberg terminal(s)',
        subcommands: {
          new: {
            description: 'create a new terminal',
            action: () => {
              this.viewRequested({ viewType: 'Terminal' })
            },
          },
        },
      },
      game: {
        description: 'actions related to setting up a game',
        subcommands: {
          lobby: {
            description: "view the lobby the game you're in",
            action: async () => {
              const removeListener = this.sse.onUserJoined((ev) => {
                for (const u of ev.users) {
                  console.log('TODO: render this list of users', u)
                }
              })

              await fetch('/api/game:lobby', { method: 'POST' })

              console.log('TODO: Figure out when to call', removeListener)

              return {
                blockHandler: () => {
                  return { unblock: true }
                },
              }
            },
          },
          start: {
            description: 'start a game',
            action: () => {
              fetch('/api/game:start', { method: 'POST' })
            },
          },
          new: {
            description: 'create a new game',
            action: async (args: string[]) => {
              const force = args.length > 0 && args[0] === '--force'
              const resp = await fetch('/api/game:create', {
                method: 'POST',
                body: JSON.stringify({ force }),
                headers: {
                  'content-type': 'application/json',
                },
              })
              if (!resp.ok) {
                this.addMessage({ error: 'Error while trying to make a new game' })
                return
              }
              const { code, desc, existingGames, error } = await resp.json()
              if (error) {
                this.addMessage({ error: `Couldn't make a new game: ${error}` })
                return
              }
              if (existingGames) {
                const egs = existingGames as { ticker: string }[]
                if (egs.length === 1) {
                  this.addMessage({
                    warn: `You're in a game already, join that with: game join $${egs[0].ticker}`,
                  })
                } else if (egs.length > 0) {
                  this.addMessage([
                    `You're in a few ongoing games, join one of those instead with: game join <ticker>`,
                    '',
                    ...egs.map((g) => `$${g.ticker}`),
                  ])
                } else {
                  this.addMessage('Error while making a new game (no existing games?)')
                }
                return
              }
              if (!code || !desc) {
                this.addMessage('Error while making a new game (no game code?)')
                return
              }

              this.addMessage([
                `New game created, your game code is $${code} (${desc})`,
                '',
                `Others can join with 'game join $${code}'`,
                '',
                `When everyone is in, run 'game start'`,
                '',
                `You can check who's in the lobby with 'game lobby'`,
              ])
            },
          },
          join: {
            description: "join someone else's game",
            action: async (args: string[]) => {
              if (args.length === 0) {
                this.addMessage('you need to specify a game code')
                return
              }
              const force = args.length >= 2 && args[1] === '--force'

              const resp = await fetch('/api/game:join', {
                method: 'POST',
                body: JSON.stringify({
                  gameTicker: args[0],
                  force,
                }),
                headers: {
                  'content-type': 'application/json',
                },
              })
              if (!resp.ok) {
                this.addMessage({ error: 'Error while trying to join game' })
                return
              }
              const { existingGames, error } = await resp.json()
              if (error) {
                this.addMessage({ error: `Couldn't make a new game: ${error}` })
                return
              }
              if (existingGames) {
                const egs = existingGames as { ticker: string }[]
                if (egs.length === 1) {
                  this.addMessage({
                    warn: `You're in a game already, join that with: game join $${egs[0].ticker}`,
                  })
                } else if (egs.length > 0) {
                  this.addMessage([
                    `You're in a few ongoing games, join one of those instead with: game join <ticker>`,
                    '',
                    ...egs.map((g) => `$${g.ticker}`),
                  ])
                } else {
                  this.addMessage('Error while making a new game (no existing games?)')
                }
                return
              }
              this.addMessage('Joined game!')
            },
          },
          watch: {
            description: 'get an overview of an in-progress game',
            action: () => {
              console.log('unimplemented!')
            },
          },
        },
      },
      user: {
        description: 'actions related to your Boomberg account',
        subcommands: {
          setname: {
            description: 'set your trader name',
            action: async (args: string[]) => {
              if (args.length === 0) {
                this.addMessage('you need to specify a name')
                return
              }
              if (args.length > 1) {
                this.addMessage("your trader name can't have any spaces in it")
                return
              }

              this.addMessage(`Setting name to ${args[0]}...`)
              const resp = await fetch('/api/user:setname', {
                method: 'POST',
                body: JSON.stringify({ name: args[0] }),
                headers: {
                  'content-type': 'application/json',
                },
              })
              if (!resp.ok) {
                this.addMessage({ error: 'Error while setting name' })
                return
              }
              const { newName, error } = await resp.json()
              if (error) {
                this.addMessage({ error: `Invalid name: ${error}` })
                return
              }
              if (!newName || typeof newName !== 'string') {
                this.addMessage({ error: 'Error while setting name' })
                return
              }
              this._setName(newName)
              this.addMessage({
                warn: `Note: you can't change your name once the game begins, choose carefully`,
              })
            },
          },
        },
      },
      help: {
        description: 'show this help text',
        action: (args: string[]) => {
          let cmds = this._commands
          let root = true
          for (const arg of args) {
            if (cmds[arg] && 'subcommands' in cmds[arg]) {
              root = false
              cmds = cmds[arg].subcommands
            }
          }
          let longestName = 0
          for (const name in cmds) {
            if (name.length > longestName) {
              longestName = name.length
            }
          }
          this.addMessage([
            root ? 'List of commands' : `List of '${args.join(' ')}' subcommands`,
            '',
            ...Object.entries(cmds).map(
              ([name, cmd]) =>
                `${name}: ${' '.repeat(longestName - name.length)}${cmd.description}`,
            ),
          ])
        },
      },
    }
  }
}

export const initTerminals = () => {
  setContext('terms', {})
}

export const deleteTerminalFn = (): ((id: number) => void) => {
  const terms = getContext('terms') as Record<number, Terminal>
  return (id: number) => {
    delete terms[id]
  }
}

export const getOrInitTerminal = (id: number, showHelp: boolean): Terminal => {
  const terms = getContext('terms') as Record<number, Terminal>
  const user = getUser()
  const sse = getSSE()
  const traderName = $derived(user.name ?? `trader${user.id}`)
  const shellPrefix = $derived(`${traderName}@boom $ `)

  if (!terms[id]) {
    terms[id] = new Terminal({
      shellPrefix: () => shellPrefix,
      setName: (name: string) => {
        user.name = name
      },
      showHelp,
      sse,
    })
  }
  return terms[id]
}
