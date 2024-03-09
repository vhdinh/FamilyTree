import './App.css';
import {useEffect, useRef, useState} from "react";
import createStore from "./createStore";
import d3AnimationView from "./view/View.d3Animation";
import Card from './view/elements/Card';
import {AddRelative} from "./AddRelativeTree/AddRelativeTree.AddRelative";
import Form from "./view/elements/Form";
import {generateUUID} from "./handlers/general";
import { v4 as uuidv4 } from 'uuid';

function App() {
  const container = useRef();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState();

    const getMembers = () => {
        // Simple GET request with a JSON body using fetch
        fetch(`${process.env.REACT_APP_API}/member`)
            .then(res => res.json())
            .then((r) => {
                setMembers(r);
                setLoading(false);
            });
    }

    useEffect(() => {
        getMembers();
    }, [])

    const cardDisplay = () => {
        const d1 = d => `${d.data['firstName'] || ''} ${d.data['lastName'] || ''}`,
            d2 = d => `${d.data['birthday'] || ''}`
        d1.create_form = "{firstName} {lastName}"
        d2.create_form = "{birthday}"

        return [d1, d2]
    }

    const  cardEditParams = () => {
        return [
            {type: 'text', placeholder: 'first name', key: 'firstName'},
            {type: 'text', placeholder: 'last name', key: 'lastName'},
            {type: 'text', placeholder: 'birthday', key: 'birthday'},
            {type: 'text', placeholder: 'avatar', key: 'avatar'}
        ]
    }

  useEffect(() => {
    if (!container.current || loading || !members) return;
    const cont = document.querySelector("#FamilyChart");
    const card_dim = {w:220,h:70,text_x:75,text_y:15,img_w:60,img_h:60,img_x:5,img_y:5};
    const card_display = cardDisplay(),
          card_edit = cardEditParams();

    const store = createStore({
          data: members,
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
            (d) => `${d.data["firstName"] || ""} ${d.data["lastName"] || ""}`,
            (d) => `${d.data["birthday"] || ""}`
          ],
          cardEditForm,
          addRelative: AddRelative({store, cont, card_dim, cardEditForm, labels: {mother: 'Add mother'}}),
          mini_tree: true,
          link_break: false
        });

      function cardEditForm(props) {
          const postSubmit = props.postSubmit;
          props.postSubmit = (ps_props) => {
              console.log('ps_props', ps_props);
              postSubmit(ps_props)
          }
          const el = document.querySelector('#form_modal'),
              modal = M.Modal.getInstance(el),
              edit = {el, open:()=>modal.open(), close:()=>modal.close()}
           return Form({...props, card_edit, card_display, edit})
      }

    view.setCard(UserCard);
    store.setOnUpdate((props) => view.update(props || {}));
    store.update.tree({ initial: true });

  }, [container, loading])

    const addVu = () => {
        // handle submit
        // Simple POST request with a JSON body using fetch
        const randomId = uuidv4()
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({id: randomId}),
        };
        fetch(`${process.env.REACT_APP_API}/member/add`, requestOptions)
            .then(res => res.json())
            .then((r) => {
                console.log('RRR', r.includes('error-invalid-phone'));

            }).catch((e) => {
            console.log('caughtttt', e);
        }).finally(() => setLoading(false));
    }

  return (
      <>
          {/*<button onClick={() => addVu()}>add</button>*/}
          <div className="f3" id="FamilyChart" ref={container}></div>
      </>
  );
}

export default App;
