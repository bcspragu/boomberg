<script lang="ts">
  import { type Snippet } from 'svelte'
  import '../app.css'
  import type { LayoutData } from './$types'
  import { setUser } from '$lib/context/user.svelte'
  import { initTerminals } from '$lib/context/terminal.svelte'
    import { initStatusBar } from '$lib/context/statusbar.svelte'

  let { data, children }: { data: LayoutData; children: Snippet } = $props()

  setUser(data.user)
  initTerminals()
  const bar = initStatusBar()
</script>

<div class="h-full w-full flex flex-col">
  <div class="flex-1">{@render children()}</div>
  <div class="whitespace-pre bg-green-400 p-1 font-mono leading-none text-black font-bold text-lg flex justify-between">
    <div>{bar.leftMessage}</div>
    <div>{bar.centerMessage}</div>
    <div>{bar.rightMessage}</div>
  </div>
</div>
