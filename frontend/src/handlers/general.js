import d3 from "../d3.js"
import {checkIfRelativesConnectedWithoutPerson} from "./checkIfRelativesConnectedWithoutPerson.js"
import {createTreeDataWithMainNode} from "./newPerson.js"

export function moveToAddToAdded(datum, data_stash) {
  delete datum.to_add
  return datum
}

export function removeToAdd(datum, data_stash) {
  deletePerson(datum, data_stash)
  return false
}

export function deletePerson(datum, data_stash) {
  if (!checkIfRelativesConnectedWithoutPerson(datum, data_stash)) return {success: false, error: 'checkIfRelativesConnectedWithoutPerson'}
  executeDelete()
  return {success: true};

  function executeDelete() {
    data_stash.forEach(d => {
      for (let k in d.rels) {
        if (!d.rels.hasOwnProperty(k)) continue
        if (d.rels[k] === datum.id) {
          delete d.rels[k]
        } else if (Array.isArray(d.rels[k]) && d.rels[k].includes(datum.id)) {
          d.rels[k].splice(d.rels[k].findIndex(did => did === datum.id), 1)
        }
      }
    })
    data_stash.splice(data_stash.findIndex(d => d.id === datum.id), 1)
    data_stash.forEach(d => {if (d.to_add) deletePerson(d, data_stash)})  // full update of tree
    if (data_stash.length === 0) data_stash.push(createTreeDataWithMainNode({}).data[0])
  }
}

export function manualZoom({amount, svg, transition_time=500}) {
  const zoom = svg.__zoomObj
  d3.select(svg).transition().duration(transition_time || 0).delay(transition_time ? 100 : 0)  // delay 100 because of weird error of undefined something in d3 zoom
    .call(zoom.scaleBy, amount)
}

export function isAllRelativeDisplayed(d, data) {
  const r = d.data.rels,
    all_rels = [r.father, r.mother, ...(r.spouses || []), ...(r.children || [])].filter(v => v)
  return all_rels.every(rel_id => data.some(d => d.data.id === rel_id))
}

export function generateUUID() {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
  const objectId = timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => {
    return Math.floor(Math.random() * 16).toString(16);
  }).toLowerCase();

  return objectId;
}
