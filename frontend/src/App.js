import './App.css';
import { useEffect, useRef, useState } from "react";
import createStore from "./createStore";
import d3AnimationView from "./view/View.d3Animation";
import Card from './view/elements/Card';
import { AddRelative } from "./AddRelativeTree/AddRelativeTree.AddRelative";
import Form from "./view/elements/Form";
import { generateUUID } from "./handlers/general";
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
// import data from './mockdata.json';

function App(props) {
    const container = useRef();
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAdminPin, setShowAdminPin] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [pinError, setPinError] = useState(false);
    const searchContainerRef = useRef(null);
    const storeRef = useRef(null);
    const pinInputRef = useRef(null);

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

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (!showAdminPin) return;
        pinInputRef.current?.focus();
        function handleEscape(event) {
            if (event.key === "Escape") closeAdminPin();
        }
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [showAdminPin]);

    const closeAdminPin = () => {
        setShowAdminPin(false);
        setPinInput("");
        setPinError(false);
    };

    const handlePinChange = (e) => {
        setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4));
        setPinError(false);
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (pinInput === process.env.REACT_APP_ADMIN_PIN) {
            window.location.href = `${process.env.REACT_APP_UI_URL}/admin`;
        } else {
            setPinError(true);
            setPinInput("");
        }
    };

    const cardDisplay = () => {
        const d1 = d => `${d.data['firstName'] || ''} ${d.data['middleName'] || ''} ${d.data['lastName'] || ''}`,
            d2 = d => `${d.data['birthday'] || ''}`,
            d3 = d => `${d.data['link'] || ''}`
        d1.create_form = "{firstName} {middleName} {lastName}"
        d2.create_form = "{birthday}"
        d3.create_form = "{link}"

        return [d1, d2, d3]
    }

    const cardEditParams = () => {
        return [
            { type: 'text', placeholder: 'first name', key: 'firstName' },
            { type: 'text', placeholder: 'middle name', key: 'middleName' },
            { type: 'text', placeholder: 'last name', key: 'lastName' },
            { type: 'text', placeholder: 'birthday', key: 'birthday' },
            { type: 'text', placeholder: 'avatar', key: 'avatar' },
            { type: 'text', placeholder: 'link', key: 'link' },
        ]
    }

    useEffect(() => {
        if (!container.current || loading || !members) return;
        const cont = document.querySelector("#FamilyChart");
        const card_dim = { w: 220, h: 70, text_x: 75, text_y: 15, img_w: 60, img_h: 60, img_x: 5, img_y: 5 };
        const card_display = cardDisplay(),
            card_edit = cardEditParams();

        const store = createStore({
            data: members,
            node_separation: 250,
            level_separation: 150,
            isAdmin: props.isAdmin,
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
                    (d) => `${d.data["firstName"] || ""} ${d.data["middleName"] || ""} ${d.data["lastName"] || ""}`,
                    (d) => `${d.data["birthday"] || ""}`,
                    (d) => `${d.data["link"] || ""}`
                ],
                cardEditForm,
                addRelative: AddRelative({ store, cont, card_dim, cardEditForm, labels: { mother: 'Add mother' } }),
                mini_tree: true,
                link_break: false,
            });

        function cardEditForm(props) {
            const postSubmit = props.postSubmit;
            props.postSubmit = (ps_props) => {
                postSubmit(ps_props)
            }
            const el = document.querySelector('#form_modal'),
                modal = M.Modal.getInstance(el),
                edit = { el, open: () => modal.open(), close: () => modal.close() }
            return Form({ ...props, card_edit, card_display, edit })
        }

        view.setCard(UserCard);
        store.setOnUpdate((props) => view.update(props || {}));
        storeRef.current = store;
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
                "middleName": "Middle",
                "lastName": "Last",
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

    const handleMemberSelect = (member) => {
        if (storeRef.current) {
            storeRef.current.update.mainId(member.id);
            storeRef.current.update.tree();
        }
        setSearchQuery("");
        setShowDropdown(false);
    };

    const filteredMembers = searchQuery.trim() === ""
        ? []
        : members.filter(m => {
            const fullName = `${m.data?.firstName || ""} ${m.data?.middleName || ""} ${m.data?.lastName || ""}`.toLowerCase();
            return fullName.includes(searchQuery.toLowerCase());
        });

    if (loading) return (
        <div
            style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: '#3b5560',
                color: 'white',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    width: '100%',
                    textAlign: 'center',
                }}
            >
                Spinning up server, may take up to 30 secs...

            </div>
        </div>
    );

    return (
        <>
            {
                !members || !members.length ?
                    (<>
                        <button onClick={() => addNewUser()}>add first user</button>
                    </>) : (
                        <>
                            {/* Top Navigation Bar */}
                            <div className="top-navbar">
                                {/* Left: Refresh Button */}
                                <button
                                    className="navbar-icon-btn refresh-btn"
                                    onClick={() => window.location.reload()}
                                    title="Refresh Page"
                                >
                                    <RefreshIcon fontSize="large" />
                                </button>

                                {/* Center: Search Input Bar */}
                                <div className="search-container" ref={searchContainerRef}>
                                    <div className="search-input-wrapper">
                                        {/* <span className="search-icon-left">
                                            <SearchIcon />
                                        </span> */}
                                        <input
                                            type="text"
                                            className="search-input"
                                            placeholder="Search for a family member..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setShowDropdown(true);
                                            }}
                                            onFocus={() => setShowDropdown(true)}
                                        />
                                        {searchQuery && (
                                            <button
                                                className="search-clear-btn"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    setShowDropdown(false);
                                                }}
                                                title="Clear Search"
                                            >
                                                <ClearIcon fontSize="small" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Dropdown Results */}
                                    {showDropdown && searchQuery.trim() !== "" && (
                                        <ul className="search-dropdown">
                                            {filteredMembers.length > 0 ? (
                                                filteredMembers.map((member) => (
                                                    <li
                                                        key={member.id}
                                                        className="search-item"
                                                        onClick={() => handleMemberSelect(member)}
                                                    >
                                                        <div style={{ position: 'relative', width: '36px', height: '36px', marginRight: '12px', flexShrink: 0 }}>
                                                            {/* Placeholder fallback in the background */}
                                                            <div
                                                                className={`search-item-avatar placeholder-${member.data?.gender || 'M'}`}
                                                                style={{ margin: 0, position: 'absolute', top: 0, left: 0 }}
                                                            >
                                                                {(member.data?.firstName || "?")[0]}
                                                            </div>

                                                            {/* Image rendered on top if avatar is defined */}
                                                            {member.data?.avatar && (
                                                                <img
                                                                    src={`https://drive.google.com/thumbnail?id=${member.data.avatar}&sz=w100`}
                                                                    alt={member.data.firstName}
                                                                    className="search-item-avatar"
                                                                    style={{ margin: 0, position: 'absolute', top: 0, left: 0, zIndex: 1 }}
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="search-item-info">
                                                            <span className="search-item-name">
                                                                {member.data?.firstName || ""} {member.data?.middleName || ""} {member.data?.lastName || ""}
                                                            </span>
                                                            <span className="search-item-meta">
                                                                {member.data?.birthday ? `Born: ${member.data.birthday}` : "No birthday listed"}
                                                            </span>
                                                        </div>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="search-no-results">No family members found</li>
                                            )}
                                        </ul>
                                    )}
                                </div>

                                {/* Right: Settings Button */}
                                <button
                                    className="navbar-icon-btn"
                                    onClick={() => setShowAdminPin(true)}
                                    title="Admin Settings"
                                >
                                    <SettingsIcon fontSize="large" />
                                </button>
                            </div>

                            <div className="f3" id="FamilyChart" ref={container} />

                            {showAdminPin && (
                                <div className="admin-pin-overlay" onClick={closeAdminPin}>
                                    <div className="admin-pin-modal" onClick={(e) => e.stopPropagation()}>
                                        <div className="admin-pin-header">
                                            <LockIcon fontSize="small" />
                                            <h3 className="admin-pin-title">Admin Access</h3>
                                        </div>
                                        <p className="admin-pin-subtitle">Enter PIN to continue</p>
                                        <form onSubmit={handlePinSubmit}>
                                            <input
                                                ref={pinInputRef}
                                                type="password"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={4}
                                                autoComplete="off"
                                                className={`admin-pin-input ${pinError ? 'admin-pin-input-error' : ''}`}
                                                value={pinInput}
                                                onChange={handlePinChange}
                                                placeholder="••••"
                                            />
                                            {pinError && <div className="admin-pin-error">Incorrect PIN, try again</div>}
                                            <div className="admin-pin-actions">
                                                <button type="button" className="admin-pin-cancel" onClick={closeAdminPin}>
                                                    Cancel
                                                </button>
                                                <button type="submit" className="admin-pin-submit" disabled={pinInput.length !== 4}>
                                                    Unlock
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </>
                    )
            }
        </>
    );
}

export default App;
