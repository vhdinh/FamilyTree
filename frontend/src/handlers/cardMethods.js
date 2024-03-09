import {toggleAllRels, toggleRels} from "../CalculateTree/CalculateTree.handlers.js"
import AddRelativeTree from "../AddRelativeTree/AddRelativeTree.js"
import {deletePerson, moveToAddToAdded} from "./general.js"

export function cardChangeMain(store, {card, d}) {
  toggleAllRels(store.getTree().data, false)
  store.update.mainId(d.data.id)
  store.update.tree({tree_position: 'inherit'})
  return true
}

export function cardEdit(store, {card, d, cardEditForm}) {
  const datum = d.data,
    postSubmit = (props) => {
    if (datum.to_add) moveToAddToAdded(datum, store.getData())
      if (props && props.delete) {
        if (datum.main) store.update.mainId(null)
        deletePerson(datum, store.getData())
      }
        if (!props) {
            // Simple POST request with a JSON body using fetch
            const dataToSend = {
                data: datum.data,
                rels: datum.rels
            }
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            };
            fetch(`${process.env.REACT_APP_API}/member/add-new`, requestOptions)
                .then(res => res.json())
                .then((r) => {
                    console.log('ADDED-NEW', r);

                }).catch((e) => {
                console.log('ERROR-ADDING-NEW', e);
            });
        }
        store.update.tree()
    }
  cardEditForm({datum, postSubmit, store})
}

export function cardShowHideRels(store, {card, d}) {
  d.data.hide_rels = !d.data.hide_rels
  toggleRels(d, d.data.hide_rels)
  store.update.tree({tree_position: 'inherit'})
}