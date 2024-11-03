<script lang="ts">
  import { onMount, type Snippet } from 'svelte'
  import '../app.css'
  import type { LayoutData } from './$types'
  import { setUser } from '$lib/context/user.svelte'
  import { initTerminals } from '$lib/context/terminal.svelte'
  import { initStatusBar } from '$lib/context/statusbar.svelte'
  import { connectSSE } from '$lib/context/sse.svelte'

  let { data, children }: { data: LayoutData; children: Snippet } = $props()

  setUser(data.user)
  initTerminals()
  const bar = initStatusBar()
  onMount(() => {
    connectSSE()
  })
</script>

<div class="flex h-full w-full flex-col">
  <div class="flex-1">{@render children()}</div>
  <div
    class="flex justify-between overflow-hidden truncate text-ellipsis whitespace-pre bg-green-400 p-1 font-mono text-lg font-bold leading-none text-black"
  >
    <div>{bar.leftMessage}</div>
    <div>{bar.centerMessage}</div>
    <div>{bar.rightMessage}</div>
  </div>
</div>
