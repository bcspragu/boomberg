import { getContext, setContext } from 'svelte'
import { getUser } from './user.svelte'
import type { ViewRequest } from '../../boomberg'

export interface TerminalParams {
  shellPrefix: () => string
  setName: (name: string) => void
}

interface ActionCommand {
  action: (args: string[]) => void | Promise<void>
}

interface ParentCommand {
  subcommands: Record<string, Command>
}

type Command = (ActionCommand | ParentCommand) & {
  description: string
}

export class Terminal {
  _shellPrefix: () => string
  _setName: (name: string) => void

  onNewPrompt: ((() => void) | null) = null
  onViewRequested: (((req: ViewRequest) => void) | null) = null

  _commands: Record<string, Command>
  
  contents: string[] = $state([])
  cursorPosition: number = $state(0)
  showCursor: boolean = $state(true)
  shouldBlink: boolean = $state(false)
  historyPosition: number | null = $state(null)
  commandHistory: string[] = $state([])
  tempHistory: string = $state('')

  constructor(params: TerminalParams) {
    this._shellPrefix = params.shellPrefix
    this._setName = params.setName
    this.contents = [
      'Welcome to your Boomberg terminal!',
      '',
      "Type 'help' then hit <Enter> to get started.",
      '',
      this.shellPrefix,
    ]
    this.cursorPosition = this.shellPrefix.length
    this._commands = this.makeCommands()
  }

  get shellPrefix(): string {
    return this._shellPrefix()
  }

  async handleKeydown(e: KeyboardEvent) {
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
        this.tempHistory = this.contents[this.contents.length - 1]
        this.historyPosition = this.commandHistory.length - 1
      } else {
        return
      }
      this.contents[this.contents.length - 1] = `${this.shellPrefix}${this.commandHistory[this.historyPosition]}`
      this.cursorPosition = this.contents[this.contents.length - 1].length
      return
    }
    if (e.key === 'ArrowDown') {
      if (this.historyPosition === null) {
        return
      }
      if (this.historyPosition < this.commandHistory.length - 1) {
        this.historyPosition++
        this.contents[this.contents.length - 1] = `${this.shellPrefix}${this.commandHistory[this.historyPosition]}`
      } else {
        this.historyPosition = this.contents.length
        this.contents[this.contents.length - 1] = `${this.tempHistory}`
      }
      this.cursorPosition = this.contents[this.contents.length - 1].length
      return
    }
    if (e.key === 'Enter') {
      await this.runCommand(this.contents[this.contents.length - 1].substring(this.shellPrefix.length))
      this.newPrompt()
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

  async runCommand(rawCmd: string) {
    this.commandHistory.push(rawCmd)
    const parts = rawCmd
      .trim()
      .split(' ')
      .filter((v) => v)
    if (!parts[0]) {
      return
    }

    let cmds = this._commands
    for (let i = 0; i < parts.length; i++) {
      const cmd = cmds[parts[i]]
      if (!cmd) {
        this.addMessage(i === 0 ? `unknown command: ${parts[i]}` : `unknown subcommand: ${parts[i]}`)
        return
      }

      // Command has a direct action, run it.
      if ('action' in cmd) {
        await Promise.resolve(cmd.action(parts.slice(i + 1)))
        return
      }

      cmds = cmd.subcommands
      if (i === parts.length - 1) {
        const help = this._commands['help'] as ActionCommand
        help.action(parts)
        return
      }
    }
  }

  viewRequested(req: ViewRequest) {
    if (this.onViewRequested) {
      this.onViewRequested(req)
    }
  }

  addMessage(msg: string | string[]) {
    this.contents.push('')
    if (Array.isArray(msg)) {
      this.contents.push(...msg.map((m) => `  ${m}`))
    } else {
      this.contents.push(`  ${msg}`)
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
              this.viewRequested({ viewType: 'Stonk', ticker: args[0] })
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
                  body: JSON.stringify({force}),
                  headers: {
                    'content-type': 'application/json',
                  }
              })
              if (!resp.ok) {
                this.addMessage('Error while trying to make a new game')
                return
              }
              const { code, desc, existingGames, error } = await resp.json()
              if (error) {
                this.addMessage(`Couldn't make a new game: ${error}`)
                return
              }
              if (existingGames) {
                const egs = existingGames as {ticker: string}[]
                if (egs.length === 1) {
                  this.addMessage(`You're in a game already, join that with: game join $${egs[0].ticker}`)
                } else if (egs.length > 0) {
                  this.addMessage([
                    `You're in a few ongoing games, join one of those instead with: game join <ticker>`,
                    '',
                    ...egs.map((g) => `$${g.ticker}`)
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
              ])
            },
          },
          join: {
            description: "join someone else's game",
            action: () => {
              fetch('/api/game:join', { method: 'POST' })
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
                this.addMessage('Error while setting name')
                return
              }
              const { newName, error } = await resp.json()
              if (error) {
                this.addMessage(`Invalid name: ${error}`)
                return
              }
              if (!newName || typeof newName !== 'string') {
                this.addMessage('Error while setting name')
                return
              }
              this._setName(newName)
              this.addMessage(
                `Note: you can't change your name once the game begins, choose carefully`,
              )
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
            ...Object.entries(cmds).map(([name, cmd]) => `${name}: ${' '.repeat(longestName - name.length)}${cmd.description}`)
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

export const getOrInitTerminal = (id: number): Terminal => {
  const terms = getContext('terms') as Record<number, Terminal>
  const user = getUser()
  const traderName = $derived(user.name ?? `trader${user.id}`)
  const shellPrefix = $derived(`${traderName}@boom $ `)

  if (!terms[id]) {
    terms[id] = new Terminal({
      shellPrefix: () => shellPrefix,
      setName: (name: string) => { user.name = name },
    })
  }
  return terms[id]
}
