import './App.css';
import {useEffect, useRef, useState} from "react";
import createStore from "./createStore";
import d3AnimationView from "./view/View.d3Animation";
import Card from './view/elements/Card';
import {AddRelative} from "./AddRelativeTree/AddRelativeTree.AddRelative";
import Form from "./view/elements/Form";
import {generateUUID} from "./handlers/general";
import RefreshIcon from '@mui/icons-material/Refresh';
// import data from './mockdata.json';

function App() {
  const container = useRef();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);

    const getMembers = () => {
        // setMembers(data);
        // setLoading(false);
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
    }, [loading])

    const cardDisplay = () => {
        const d1 = d => `${d.data['firstName'] || ''} ${d.data['lastName'] || ''}`,
            d2 = d => `${d.data['birthday'] || ''}`,
            d3 = d => `${d.data['link'] || ''}`
        d1.create_form = "{firstName} {lastName}"
        d2.create_form = "{birthday}"
        d3.create_form = "{link}"

        return [d1, d2, d3]
    }

    const  cardEditParams = () => {
        return [
            {type: 'text', placeholder: 'first name', key: 'firstName'},
            {type: 'text', placeholder: 'last name', key: 'lastName'},
            {type: 'text', placeholder: 'birthday', key: 'birthday'},
            {type: 'text', placeholder: 'avatar', key: 'avatar'},
            {type: 'text', placeholder: 'link', key: 'link'},
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
            (d) => `${d.data["birthday"] || ""}`,
            (d) => `${d.data["link"] || ""}`
          ],
          cardEditForm,
          addRelative: AddRelative({store, cont, card_dim, cardEditForm, labels: {mother: 'Add mother'}}),
          mini_tree: true,
          link_break: false
        });

      function cardEditForm(props) {
          const postSubmit = props.postSubmit;
          props.postSubmit = (ps_props) => {
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

    const addNewUser = () => {
        // handle submit
        // Simple POST request with a JSON body using fetch
        const randomId = generateUUID()
        const dataToSend = {
            "rels": {
                "spouses": [],
                "children": []
            },
            "data": {
                "firstName": "First",
                "lastName": "User",
                "birthday": "01/01/1980",
                "gender": "M"
            },
            id: randomId,
        }
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
        };
        fetch(`${process.env.REACT_APP_API}/member/add-new`, requestOptions)
            .then(res => res.json())
            .then((r) => {
                console.log('new-member-added: ', r);
            }).catch((e) => {
            console.log('new-member-failed-to-add: ', e);
        }).finally(() => setLoading(!loading));
    }

    if (loading) return;

  return (
      <>
          {
              !members || !members.length ?
                  (<>
                      <button onClick={() => addNewUser()}>add first user</button>
                  </>) : (
                      <>
                          <div className="f3" id="FamilyChart" ref={container} />
                          <RefreshIcon
                              style={{
                                  position: 'absolute',
                                  right: 0,
                                  bottom: 0,
                                  color: 'white',
                                  margin: '12px',
                              }}
                              fontSize={'large'}
                              onClick={() => window.location.reload()}
                          />
                      </>
                  )
          }
      </>
  );
}

export default App;
