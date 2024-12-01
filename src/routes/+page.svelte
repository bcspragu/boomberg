<script lang="ts">
  import Node from '../lib/Node.svelte'
  import type { SplitNode, ViewLayout, ViewNode, ViewRequest } from '../boomberg'
  import { deleteTerminalFn } from '$lib/context/terminal.svelte'

  let nextNodeID: number = 2
  let deleteTerminal = deleteTerminalFn()
  let viewLayout: ViewLayout = $state({
    rootID: 1,
    nodes: {
      1: {
        id: 1,
        type: 'Leaf',
        node: {
          type: 'Terminal',
          showHelp: true,
        },
      },
    },
  })

  const findParent = (id: number): (SplitNode & { id: number }) | null => {
    const nodes: number[] = [viewLayout.rootID]
    while (nodes.length > 0) {
      const nodeID = nodes.pop()!
      const node = viewLayout.nodes[nodeID]
      if (node.type === 'Split') {
        if (node.children.includes(id)) {
          return node
        }
        nodes.push(...node.children)
      }
    }
    return null
  }

  const newNodeForRequest = (newID: number, req: ViewRequest): ViewNode => {
    switch (req.viewType) {
      case 'Terminal':
        return {
          id: newID,
          type: 'Leaf',
          node: {
            type: 'Terminal',
            showHelp: false,
          },
        }
      case 'Stonk':
        return {
          id: newID,
          type: 'Leaf',
          node: {
            type: 'Stonk',
            seed: req.seed,
            ticker: req.ticker,
          },
        }
      case 'Close':
        throw new Error("closing isn't about creating a new node!")
    }
  }

  const removeNode = (id: number) => {
    // Algorithm: Find parent, if any, and replace it with other sibling
    const p = findParent(id)
    if (!p) {
      // No parent, we're root, we can't be removed.
      return
    }
    // If we're at index 1, return index 0. If we're at index 0, return index 1
    const siblingID = p.children[1 - p.children.findIndex((v) => v === id)]
    // Now find our parent's parent, to do the replacement.
    const gp = findParent(p.id)
    if (gp) {
      // Replace parent ID with promoted sibling ID
      const parentIndex = gp.children.findIndex((v) => v === p.id)
      gp.children[parentIndex] = siblingID
    } else {
      // Make the sibling the new root.
      viewLayout.rootID = siblingID
    }
    delete viewLayout.nodes[p.id]
    delete viewLayout.nodes[id]
    deleteTerminal(id) // Harmless if the node isn't a terminal
  }

  const viewRequested = (id: number, req: ViewRequest) => {
    // Algorithm: Find parent of this node, if any, and make requesting node and new
    // node its children.

    if (req.viewType === 'Close') {
      return removeNode(id)
    }

    const newChildID = nextNodeID++
    const newParentID = nextNodeID++
    const newChild: ViewNode = newNodeForRequest(newChildID, req)
    const newParent: ViewNode = {
      id: newParentID,
      type: 'Split',
      direction: 'h',
      children: [id, newChildID],
    }
    viewLayout.nodes[newChildID] = newChild
    viewLayout.nodes[newParentID] = newParent

    const p = findParent(id)
    if (p === null) {
      // Means we were the root, and this new node is the new root.
      viewLayout.rootID = newParentID
    } else {
      for (let i = 0; i < p.children.length; i++) {
        if (p.children[i] === id) {
          p.children[i] = newParentID
          break
        }
      }
    }
  }
</script>

<Node layout={viewLayout} nodeID={viewLayout.rootID} {viewRequested} />
