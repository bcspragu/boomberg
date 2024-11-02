<script lang="ts">
  import { type Snippet } from 'svelte'
  import '../app.css'
  import type { LayoutData } from './$types'
  import { setUser } from '$lib/context/user.svelte'
  import { initTerminals } from '$lib/context/terminal.svelte'

  let { data, children }: { data: LayoutData; children: Snippet } = $props()

  setUser(data.user)
  initTerminals()
</script>

{@render children()}
