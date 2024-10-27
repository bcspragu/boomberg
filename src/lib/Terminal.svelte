<script lang="ts">
	import { onMount } from "svelte";

	interface Props {
	  name: string
	}

	let { name: traderName }: Props = $props(); 

	interface ActionCommand {
	  action: (args: string[]) => void | Promise<void>
	}

	interface ParentCommand {
	  subcommands: Record<string, Command>
	}

	type Command  = (ActionCommand | ParentCommand) & {
	  description: string
	}

	const makeCommands = (): Record<string, Command> => {
      return {
    	  'echo': {
    	    description: 'echo the input back to you',
    	    action: (args: string[]) => {
            contents.push(args.join(' '))
    	    }
    	  },
    	  'clear': {
    	    description: 'clear the screen',
    	    action: (_args: string[]) => {
            contents = []
    	    },
    	  },
    	  'game': {
          description: 'actions related to setting up a game',
          subcommands: {
            'start': {
              description: 'start a new game',
              action: () => {
                fetch('/api/game:start', {method: 'POST'})
              }
            },
            'join': {
              description: 'join someone else\'s game',
              action: () => {
                fetch('/api/game:join', {method: 'POST'})
              }
            },
            'watch': {
              description: 'get an overview of an in-progress game',
              action: () => {
                console.log('unimplemented!')
              }
            },
          },
    	  },
    	  'user': {
          description: 'actions related to your Boomberg account',
          subcommands: {
            'setname': {
              description: 'set your trader name',
              action: async (args: string[]) => {
                if (args.length === 0) {
                  contents.push('you need to specify a name')
                  return
                }
                if (args.length > 1) {
                  contents.push('your trader name can\'t have any spaces in it')
                  return
                }

                contents.push(`Setting name to ${args[0]}...`)
                const resp = await fetch('/api/user:setname', {
                  method: 'POST',
                  body: JSON.stringify({name: args[0]}),
            			headers: {
            				'content-type': 'application/json'
            			}
                })
                if (!resp.ok) {
                  contents.push('Error while setting name')
                  return
                }
                const { newName, error } = await resp.json()
                if (error) {
                  contents.push(`Invalid name: ${error}`)
                  return
                }
                if (!newName || typeof(newName) !== 'string') {
                  contents.push('Error while setting name')
                  return
                }
              	shellPrefix = `${newName}@boom $ `
              }
            },
          },
    	  },
    	  'help': {
    	    description: 'show this help text',
    	    action: (args: string[]) => {
    	      let cmds = commands
    	      let root = true
    	      for (const arg of args) {
    	        if (cmds[arg] && 'subcommands' in cmds[arg]) {
      	        root = false
    	          cmds = cmds[arg].subcommands
    	        }
    	      }
            contents.push(' ')
            if (root) {
              contents.push('List of commands:')
            } else {
              contents.push(`List of '${args.join(' ')}' subcommands:`)
            }
            contents.push(' ')
            let longestName = 0
            for (const name in cmds) {
              if (name.length > longestName) {
                longestName = name.length
              }
            }
            for (const name in cmds) {
              const cmd = cmds[name]
              contents.push(`  ${name}: ${'\xa0'.repeat(longestName - name.length)}${cmd.description}`)
            }
            contents.push(' ')
    	    }
    	  }
    	}
	}

	let shellPrefix = $state(`${traderName}@boom $ `)
  let contents: string[] = $state([
    'Welcome to your Boomberg terminal!',
    ' ',
    'Type \'help\' then hit <Enter> to get started.',
    ' ',
    // svelte-ignore state_referenced_locally
    shellPrefix,
  ])
  // svelte-ignore state_referenced_locally
  let cursorPosition = $state(shellPrefix.length);
  let showCursor = $state(true);
  let shouldBlink = $state(false);
  let terminal: HTMLDivElement;
  let lastRowEl: HTMLDivElement;
  let historyPosition: number | null = $state(null)
  let commandHistory: string[] = $state([])
  let tempHistory = $state("")
	const commands = makeCommands()

  onMount(() => {
    terminal.focus()
    if (!shouldBlink) {
      return
    }
    const t = setInterval(() => {
      showCursor = !showCursor
    }, 500)

    return () => clearInterval(t)
  })

  const runCommand = async (rawCmd: string) => {
    commandHistory.push(rawCmd)
    const parts = rawCmd.trim().split(' ').filter((v) => v)
    if (!parts[0]) {
      return
    }

    let cmds = commands
    for (let i = 0; i < parts.length; i++) {
      const cmd = cmds[parts[i]]
      if (!cmd) {
        if (i === 0) {
          contents.push(`unknown command: ${parts[i]}`)
        } else {
          contents.push(`unknown subcommand: ${parts[i]}`)
        }
        return
      }

      // Command has a direct action, run it.
      if ('action' in cmd) {
        await Promise.resolve(cmd.action(parts.slice(i+1)))
        return
      }

      cmds = cmd.subcommands
      if (i === parts.length - 1) {
        const help = commands['help'] as ActionCommand
        help.action(parts)
        return
      }
    }
  }

  const newPrompt = () => {
    contents.push(shellPrefix)
    cursorPosition = shellPrefix.length
    historyPosition = null
    lastRowEl.scrollTop = lastRowEl.scrollHeight
    lastRowEl.scrollIntoView({
      behavior: 'instant',
      block: 'end',
    })
  }

  const addChar = (c: string) => {
    const lastRow = contents[contents.length-1]
    contents[contents.length-1] = lastRow.substring(0, cursorPosition) + c + lastRow.substring(cursorPosition);
    cursorPosition++
  }

  const onkeydown = async (e: KeyboardEvent) => {
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

    const lastRow = contents[contents.length-1]
    if (e.key === 'Backspace') {
      if (cursorPosition <= shellPrefix.length) {
        return
      }
      contents[contents.length-1] = lastRow.substring(0, cursorPosition-1) + lastRow.substring(cursorPosition);
      cursorPosition--
      return
    }
    if (e.key === 'Delete') {
      if (cursorPosition >= lastRow.length) {
        return
      }
      contents[contents.length-1] = lastRow.substring(0, cursorPosition) + lastRow.substring(cursorPosition + 1);
      return
    }
    if (e.key === 'ArrowLeft') {
      if (cursorPosition <= shellPrefix.length) {
        return
      }
      cursorPosition--
      return
    }
    if (e.key === 'ArrowRight') {
      if (cursorPosition >= lastRow.length) {
        return
      }
      cursorPosition++
      return
    }
    if (e.key === 'ArrowUp') {
      if (historyPosition !== null) {
        if (historyPosition > 0) {
          historyPosition--
        } else {
          return
        }
      } else {
        tempHistory = contents[contents.length-1]
        historyPosition = commandHistory.length-1
      }
      contents[contents.length-1] = `${shellPrefix}${commandHistory[historyPosition]}`
      cursorPosition = contents[contents.length-1].length
      return
    }
    if (e.key === 'ArrowDown') {
      if (historyPosition === null) {
        return
      }
      if (historyPosition < commandHistory.length-1) {
        historyPosition++
        contents[contents.length-1] = `${shellPrefix}${commandHistory[historyPosition]}`
      } else {
        historyPosition = contents.length
        contents[contents.length-1] = `${tempHistory}`
      }
      cursorPosition = contents[contents.length-1].length
      return
    }
    if (e.key === 'Enter') {
      await runCommand(contents[contents.length-1].substring(shellPrefix.length))
      newPrompt()
      return
    }
    if (e.ctrlKey && e.key === 'c') {
      contents[contents.length-1] = contents[contents.length-1] + '^C'
      newPrompt()
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
    addChar(e.key)
  }

  const lastRowWithCursor = $derived.by(() => {
    const row = contents[contents.length-1]
    if (!showCursor) {
      return row
    }
    if (cursorPosition >= row.length) {
      return row + '█'
    }
    return row.substring(0, cursorPosition) + '█' + row.substring(cursorPosition + 1);
  })
</script>

<!-- svelte-ignore state_referenced_locally -->
<!-- svelte-ignore state_referenced_locally -->
<!-- svelte-ignore state_referenced_locally -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div {onkeydown} bind:this={terminal} tabindex="0" class="font-mono w-full h-full bg-black text-green-400 flex flex-col leading-none p-4 overflow-y-auto whitespace-pre">
  {#each contents as row, i}
    {#if i < contents.length - 1}
      <div class="">{row}</div>
    {/if}
  {/each}
  <div bind:this={lastRowEl}>{lastRowWithCursor}</div>
</div>
