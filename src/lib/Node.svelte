<script lang="ts">
  import { Pane, Splitpanes } from 'svelte-splitpanes'
  import type { ViewLayout, ViewRequest } from '../boomberg'
  import Terminal from './Terminal.svelte'
  import Self from './Node.svelte'
  import Stonk from './Stonk.svelte'

  interface Props {
    layout: ViewLayout
    nodeID: number
    viewRequested: (id: number, req: ViewRequest) => void
  }

  const { layout, nodeID, viewRequested }: Props = $props()

  const node = $derived(layout.nodes[nodeID])

  const close = () => {
    viewRequested(nodeID, { viewType: 'Close' })
  }
</script>

{#snippet theNode()}
  {#if node.type === 'Leaf'}
    <button
      onclick={close}
      class="absolute right-0 top-0 z-10 mr-2 mt-2 cursor-pointer font-mono text-xl font-bold text-green-400"
    >
      x
    </button>
    {#if node.node.type === 'Terminal'}
      <Terminal
        id={node.id}
        showHelp={node.node.showHelp}
        viewRequested={(req) => viewRequested(node.id, req)}
      />
    {:else if node.node.type === 'Stonk'}
      <Stonk />
    {/if}
  {:else if node.type === 'Split'}
    <Splitpanes
      theme="terminal"
      horizontal={node.direction === 'h'}
      dblClickSplitter={false}
      pushOtherPanes={false}
    >
      {#each node.children as childNode}
        <Self {layout} nodeID={childNode} {viewRequested} />
      {/each}
    </Splitpanes>
  {/if}
{/snippet}

{#if nodeID === layout.rootID}
  {@render theNode()}
{:else}
  <Pane class="relative">
    {@render theNode()}
  </Pane>
{/if}

<style lang="scss">
  $hover-size: -20px;

  :global {
    .splitpanes.terminal {
      .splitpanes__pane {
        background-color: black;
      }
      .splitpanes__splitter {
        background-color: theme('colors.green.400');
        position: relative;
        &:before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          transition: opacity 0.4s;
          background-color: rgba(0, 255, 0, 0.3);
          opacity: 0;
          z-index: 1;
        }
        &:hover:before {
          opacity: 1;
        }
        &.splitpanes__splitter__active {
          z-index: 2; /* Fix an issue of overlap fighting with a near hovered splitter */
        }
      }
    }
    .terminal {
      &.splitpanes--vertical > .splitpanes__splitter:before {
        left: $hover-size;
        right: $hover-size;
        height: 100%;
        cursor: col-resize;
      }
      &.splitpanes--horizontal > .splitpanes__splitter:before {
        top: $hover-size;
        bottom: $hover-size;
        width: 100%;
        cursor: row-resize;
      }
    }
  }
</style>
