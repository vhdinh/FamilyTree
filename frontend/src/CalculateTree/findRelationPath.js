import CalculateTree from "./CalculateTree.js"

// Shortest path between two members over the full family graph, treating
// father/mother/children/spouses as undirected edges. Returns an ordered
// array of member ids from `from_id` to `to_id`, or null if disconnected.
export function findRelationPath(data_stash, from_id, to_id) {
  if (!from_id || !to_id) return null
  if (from_id === to_id) return [from_id]

  const by_id = new Map(data_stash.map(d => [d.id, d]))
  if (!by_id.has(from_id) || !by_id.has(to_id)) return null

  const visited = new Set([from_id]),
    prev = new Map(),
    queue = [from_id]

  while (queue.length) {
    const current = queue.shift()
    if (current === to_id) break
    getNeighbors(by_id.get(current)).forEach(n => {
      if (visited.has(n)) return
      visited.add(n)
      prev.set(n, current)
      queue.push(n)
    })
  }

  if (!visited.has(to_id)) return null

  const path = [to_id]
  let cur = to_id
  while (cur !== from_id) {
    cur = prev.get(cur)
    path.push(cur)
  }
  path.reverse()
  return path

  function getNeighbors(d) {
    const r = d?.rels || {}
    return [r.father, r.mother, ...(r.children || []), ...(r.spouses || [])].filter(Boolean)
  }
}

// The rendered tree only ever shows one root's ancestry + descendants + spouses.
// Try each node along the path as that root and pick the smallest tree that
// still contains every member on the path (falling back to best partial
// coverage if no single root shows the whole path).
export function chooseHighlightRoot(data_stash, path) {
  const candidates = path.map(id => {
    const {data: tree_data} = CalculateTree({data_stash, main_id: id})
    const ids_in_tree = new Set(tree_data.map(t => t.data.id))
    const coverage = path.filter(pid => ids_in_tree.has(pid)).length
    return {id, coverage, size: tree_data.length}
  })
  const full = candidates.filter(c => c.coverage === path.length)
  const pool = full.length > 0 ? full : candidates
  pool.sort((a, b) => b.coverage - a.coverage || a.size - b.size)
  return {root: pool[0].id, full_coverage: full.length > 0}
}
