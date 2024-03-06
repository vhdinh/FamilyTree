import './App.css';
import {useEffect, useRef} from "react";
import createStore from "./createStore";
import d3AnimationView from "./view/View.d3Animation";
import Card from './view/elements/Card';
import {data} from "./data";
import {AddRelative} from "./AddRelativeTree/AddRelativeTree.AddRelative";
import Form from "./view/elements/Form";

function App() {
  const container = useRef();

    const cardDisplay = () => {
        const d1 = d => `${d.data['first name'] || ''} ${d.data['last name'] || ''}`,
            d2 = d => `${d.data['birthday'] || ''}`
        d1.create_form = "{first name} {last name}"
        d2.create_form = "{birthday}"

        return [d1, d2]
    }

    const  cardEditParams = () => {
        return [
            {type: 'text', placeholder: 'first name', key: 'first name'},
            {type: 'text', placeholder: 'last name', key: 'last name'},
            {type: 'text', placeholder: 'birthday', key: 'birthday'},
            {type: 'text', placeholder: 'avatar', key: 'avatar'}
        ]
    }



  useEffect(() => {
    if (!container.current) return;
    const cont = document.querySelector("#FamilyChart");
    const card_dim = {w:220,h:70,text_x:75,text_y:15,img_w:60,img_h:60,img_x:5,img_y:5};
    const card_display = cardDisplay(),
          card_edit = cardEditParams();

    const store = createStore({
          data: data(),
          node_separation: 250,
          level_separation: 150
        }),
        view = d3AnimationView({
          store,
          cont: cont,
        }),
        UserCard = Card({
          store,
          svg: view.svg,
          card_dim: card_dim,
          card_display: [
            (d) => `${d.data["first name"] || ""} ${d.data["last name"] || ""}`,
            (d) => `${d.data["birthday"] || ""}`
          ],
          cardEditForm,
          addRelative: AddRelative({store, cont, card_dim, cardEditForm, labels: {mother: 'Add mother'}}),
          mini_tree: true,
          link_break: false
        });

      function cardEditForm(props) {
          const postSubmit = props.postSubmit;
          props.postSubmit = (ps_props) => {postSubmit(ps_props)}
          const el = document.querySelector('#form_modal'),
              modal = M.Modal.getInstance(el),
              edit = {el, open:()=>modal.open(), close:()=>modal.close()}
          Form({...props, card_edit, card_display, edit})
      }

    view.setCard(UserCard);
    store.setOnUpdate((props) => view.update(props || {}));
    store.update.tree({ initial: true });

  }, [container])

  return <div className="f3" id="FamilyChart" ref={container}></div>;
}

export default App;
