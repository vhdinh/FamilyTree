import d3 from "../d3.js"
import {sortChildrenWithSpouses} from "./CalculateTree.handlers.js"
import {createNewPerson} from "../handlers/newPerson.js"

export default function CalculateTree({data_stash, main_id=null, is_vertical=true, node_separation=250, level_separation=150}) {
  data_stash = createRelsToAdd(data_stash)
  sortChildrenWithSpouses(data_stash)
  const main = main_id !== null
    ? data_stash.find(d => d.id === main_id)
    : (data_stash.find(d => d.default === true || d.data?.default === true) || data_stash[0]),
    tree_children = calculateTreePositions(main, 'children', false),
    tree_parents = calculateTreePositions(main, 'parents', true)

  data_stash.forEach(d => d.main = d === main)
  levelOutEachSide(tree_parents, tree_children)
  const tree = mergeSides(tree_parents, tree_children)
  setupChildrenAndParents({tree})
  setupSpouses({tree, node_separation})
  nodePositioning({tree, is_vertical})

  const dim = calculateTreeDim(tree, node_separation, level_separation, is_vertical)

  return {data: tree, data_stash, dim}

  function calculateTreePositions(datum, rt, is_ancestry) {
    const hierarchyGetter = rt === "children" ? hierarchyGetterChildren : hierarchyGetterParents,
      d3_tree = d3.tree().nodeSize([node_separation, level_separation]).separation(separation),
      root = d3.hierarchy(datum, hierarchyGetter).sort(function(a, b) {
      if (!is_ancestry && a.parent === b.parent && !sameBothParents(a, b)) {
        const diff = spouseGroupOrder(a, b)
        if (diff !== 0) return diff
      }
      return new Date(a.data.data.birthday) - new Date(b.data.data.birthday);
    });
    d3_tree(root);
    return root.descendants()

    function separation(a, b) {
      let offset = 1;
      if (!is_ancestry) {
        if (!sameParent(a, b)) offset+=.25
        if (someSpouses(a,b)) offset+=offsetOnPartners(a,b)
        if (sameParent(a, b) && !sameBothParents(a,b)) offset+=.125
      }
      return offset
    }

    function hasCh(d) {return !!d.children}
    function sameParent(a, b) {return a.parent === b.parent}
    function sameBothParents(a, b) {return (a.data.rels.father === b.data.rels.father) && (a.data.rels.mother === b.data.rels.mother)}
    function someChildren(a, b) {return hasCh(a) || hasCh(b)}
    function hasSpouses(d) {return d.data.rels.spouses && d.data.rels.spouses.length > 0}
    function someSpouses(a, b) {return hasSpouses(a) || hasSpouses(b)}

    function hierarchyGetterChildren(d) {
      return [...(d.rels.children || [])].map(id => data_stash.find(d => d.id === id))
    }

    function hierarchyGetterParents(d) {
      if (!d.rels?.hasOwnProperty("father") || !d.rels?.hasOwnProperty("mother")) return;
      return [d.rels?.father, d.rels?.mother]
        .filter(d => d).map(id => data_stash.find(d => d.id === id))
    }

    function offsetOnPartners(a,b) {
      return (Math.max((a.data.rels?.spouses || []).length, (b.data.rels?.spouses || []).length))*.5+.5
    }

    // Groups siblings by which of the shared parent's spouses is their other parent,
    // ordered to match the alternating left/right spouse placement in setupSpouses().
    function spouseGroupOrder(a, b) {
      const parent = a.parent.data
      if (!parent.rels?.spouses || parent.rels.spouses.length < 2) return 0
      const side = parent.data.gender === "M" ? -1 : 1,
        a_i = parent.rels.spouses.indexOf(otherParentId(a.data, parent)),
        b_i = parent.rels.spouses.indexOf(otherParentId(b.data, parent))
      return spouseSideOrder(a_i, side) - spouseSideOrder(b_i, side)
    }

    function otherParentId(child, parent) {
      return child.rels.father === parent.id ? child.rels.mother : child.rels.father
    }

    function spouseSideOrder(i, side) {
      if (i < 0) return 0
      const dist = Math.floor(i/2)+1,
        dir = i%2 === 0 ? -side : side
      return dist*dir
    }
  }

  function levelOutEachSide(parents, children) {
    const mid_diff = (parents[0].x - children[0].x) / 2
    parents.forEach(d => d.x-=mid_diff)
    children.forEach(d => d.x+=mid_diff)
  }

  function mergeSides(parents, children) {
    parents.forEach(d => {d.is_ancestry = true})
    parents.forEach(d => d.depth === 1 ? d.parent = children[0] : null)

    return [...children, ...parents.slice(1)];
  }
  function nodePositioning({tree, is_vertical}) {
    tree.forEach(d => {
      d.y *= (d.is_ancestry ? -1 : 1)
      if (!is_vertical) {
        const d_x = d.x; d.x = d.y; d.y = d_x
      }
    })
  }

  function setupSpouses({tree, node_separation}) {
    for (let i = tree.length; i--;) {
      const d = tree[i]
      if (!d.is_ancestry && d.data.rels?.spouses && d.data.rels?.spouses.length > 0){
        const side = d.data.data.gender === "M" ? -1 : 1;  // female on right
        const spouses = d.data.rels.spouses,
          n_primary = Math.ceil(spouses.length/2),
          n_secondary = Math.floor(spouses.length/2)
        d.x += (n_primary-n_secondary)/2*node_separation*side;
        spouses.forEach((sp_id, i) => {
          const spouse = {data: data_stash.find(d0 => d0.id === sp_id), added: true}
          const dist = Math.floor(i/2)+1,
            dir = i%2 === 0 ? -side : side  // alternate sides: 1st spouse opposite gender side, 2nd spouse same side, 3rd further opposite, etc.

          spouse.x = d.x+(node_separation*dist)*dir;
          spouse.y = d.y
          spouse.sx = (d.x+spouse.x)/2
          spouse.depth = d.depth;
          spouse.spouse = d;
          if (!d.spouses) d.spouses = []
          d.spouses.push(spouse)
          tree.push(spouse)

          tree.forEach(d0 => (
            (d0.data.rels?.father === d.data.id && d0.data.rels?.mother === spouse.data.id) ||
            (d0.data.rels?.mother === d.data.id && d0.data.rels?.father === spouse.data.id)
            ) ? d0.psx = spouse.sx : null
          )
        })
      }
      if (d.parents && d.parents.length === 2) {
        const p1 = d.parents[0],
          p2 = d.parents[1],
          midd = p1.x - (p1.x - p2.x)/2,
          x = (d,sp) => midd + (node_separation/2)*(d.x < sp.x ? 1 : -1)

        p2.x = x(p1, p2); p1.x = x(p2, p1)
      }
    }
  }

  function setupChildrenAndParents({tree}) {
    tree.forEach(d0 => {
      delete d0.children
      tree.forEach(d1 => {
        if (d1.parent === d0) {
          if (d1.is_ancestry) {
            if (!d0.parents) d0.parents = []
            d0.parents.push(d1)
          } else {
            if (!d0.children) d0.children = []
            d0.children.push(d1)
          }
        }
      })
    })
  }

  function calculateTreeDim(tree, node_separation, level_separation, is_vertical) {
    if (!is_vertical) [node_separation, level_separation] = [level_separation, node_separation]
    const w_extent = d3.extent(tree, d => d.x),
      h_extent = d3.extent(tree, d => d.y)
    return {
      width: w_extent[1] - w_extent[0]+node_separation, height: h_extent[1] - h_extent[0]+level_separation, x_off: -w_extent[0]+node_separation/2, y_off: -h_extent[0]+level_separation/2
    }
  }

  function createRelsToAdd(data) {
    const to_add_spouses = [];
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (d.rels?.children && d.rels?.children.length > 0) {
        if (!d.rels?.spouses) d.rels.spouses = []
        const is_father = d.data.gender === "M"
        let spouse

        d.rels.children.forEach(d0 => {
          const child = data.find(d1 => d1.id === d0)
          if (child.rels[is_father ? 'father' : 'mother'] !== d.id) return
          if (child.rels[!is_father ? 'father' : 'mother']) return
          if (!spouse) {
            spouse = createToAddSpouse(d)
            d.rels.spouses.push(spouse.id)
          }
          spouse.rels.children.push(child.id)
          child.rels[!is_father ? 'father' : 'mother'] = spouse.id
        })
      }
    }
    to_add_spouses.forEach(d => data.push(d))
    return data

    function createToAddSpouse(d) {
      const spouse = createNewPerson({
        data: {gender: d.data.gender === "M" ? "F" : "M"},
        rels: {spouses: [d.id], children: []}
      });
      spouse.to_add = true;
      to_add_spouses.push(spouse);
      return spouse
    }
  }

}
