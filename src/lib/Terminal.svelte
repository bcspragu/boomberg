<script lang="ts">
  import { onMount } from 'svelte'
  import { getOrInitTerminal } from '$lib/context/terminal.svelte'
  import type { ViewRequest } from '../boomberg'

  interface Props {
    id: number
    viewRequested: (req: ViewRequest) => void
  }

  let { id, viewRequested }: Props = $props()

  let terminalEl: HTMLDivElement
  let lastRowEl: HTMLDivElement | null = $state(null)
  const term = getOrInitTerminal(id)
  term.onNewPrompt = () => {
    if (!lastRowEl) {
      return
    }
    lastRowEl.scrollTop = lastRowEl.scrollHeight
    lastRowEl.scrollIntoView({
      behavior: 'instant',
      block: 'end',
    })
  }
  term.onViewRequested = viewRequested

  onMount(() => {
    terminalEl.focus()
    if (!term.shouldBlink) {
      return
    }
    const t = setInterval(() => {
      term.showCursor = !term.showCursor
    }, 500)

    return () => clearInterval(t)
  })

  const onkeydown = async (e: KeyboardEvent) => {
    await term.handleKeydown(e)
  }

  const lastRowWithCursor = $derived.by(() => {
    if (term.contents.length === 0) {
      return null
    }
    const row = term.contents[term.contents.length - 1]
    if (!term.showCursor) {
      return row
    }
    if (term.cursorPosition >= row.length) {
      return row + '█'
    }
    return row.substring(0, term.cursorPosition) + '█' + row.substring(term.cursorPosition + 1)
  })
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  {onkeydown}
  bind:this={terminalEl}
  tabindex="0"
  class="flex h-full w-full flex-col overflow-y-auto whitespace-pre bg-black p-4 font-mono leading-none text-green-400"
>
  {#each term.contents as row, i}
    {#if i < term.contents.length - 1}
      <div>
        {#if row}{row}{:else}&nbsp;{/if}
      </div>
    {/if}
  {/each}
  {#if lastRowWithCursor}
    <div bind:this={lastRowEl}>{lastRowWithCursor}</div>
  {/if}
</div>
