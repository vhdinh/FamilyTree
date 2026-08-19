import './App.css';
import { useEffect, useRef, useState } from "react";
import createStore from "./createStore";
import d3AnimationView from "./view/View.d3Animation";
import Card from './view/elements/Card';
import { AddRelative } from "./AddRelativeTree/AddRelativeTree.AddRelative";
import Form from "./view/elements/Form";
import { generateUUID } from "./handlers/general";
import { findRelationPath, chooseHighlightRoot } from "./CalculateTree/findRelationPath";
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import LinkIcon from '@mui/icons-material/Link';
// import data from './mockdata.json';

const ADMIN_SESSION_KEY = 'ft_admin_session';

function App() {
    const container = useRef();
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true');
    const [showAdminPin, setShowAdminPin] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [pinError, setPinError] = useState(false);
    const [findRelationOpen, setFindRelationOpen] = useState(false);
    const [findRelationFrom, setFindRelationFrom] = useState(null);
    const [relationQuery, setRelationQuery] = useState("");
    const [relationResult, setRelationResult] = useState(null);
    const searchContainerRef = useRef(null);
    const storeRef = useRef(null);
    const viewRef = useRef(null);
    const pinInputRef = useRef(null);
    const relationSearchRef = useRef(null);

    const formatMemberName = (m) => `${m?.data?.firstName || ''} ${m?.data?.middleName || ''} ${m?.data?.lastName || ''}`.replace(/\s+/g, ' ').trim();

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

    const enableAdmin = () => {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        setIsAdmin(true);
    };

    const disableAdmin = () => {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        setIsAdmin(false);
    };

    const handleSettingsClick = () => {
        if (isAdmin) disableAdmin();
        else setShowAdminPin(true);
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        if (pinInput === process.env.REACT_APP_ADMIN_PIN) {
            enableAdmin();
            closeAdminPin();
        } else {
            setPinError(true);
            setPinInput("");
        }
    };

    useEffect(() => {
        if (!storeRef.current) return;
        storeRef.current.update.isAdmin(isAdmin);
        storeRef.current.update.tree({ tree_position: 'inherit' });
    }, [isAdmin]);

    useEffect(() => {
        if (!findRelationOpen) return;
        relationSearchRef.current?.focus();
        function handleEscape(event) {
            if (event.key === "Escape") closeFindRelation();
        }
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [findRelationOpen]);

    const openFindRelation = (datum) => {
        setFindRelationFrom({ id: datum.id, name: formatMemberName(datum) });
        setRelationQuery("");
        setFindRelationOpen(true);
    };

    const closeFindRelation = () => {
        setFindRelationOpen(false);
        setFindRelationFrom(null);
        setRelationQuery("");
    };

    const clearRelationHighlight = () => {
        viewRef.current?.clearHighlight();
        setRelationResult(null);
    };

    const handleRelationPick = (member) => {
        const store = storeRef.current, view = viewRef.current;
        if (!store || !view || !findRelationFrom) return;
        const data_stash = store.getData();
        const path = findRelationPath(data_stash, findRelationFrom.id, member.id);
        const fromName = findRelationFrom.name;

        closeFindRelation();

        if (!path) {
            setRelationResult({ status: 'not-found', fromName, toName: formatMemberName(member) });
            return;
        }

        const { root, full_coverage } = chooseHighlightRoot(data_stash, path);
        store.update.mainId(root);
        store.update.tree({ tree_position: 'fit' });
        view.highlightPath(path, { dashed: !full_coverage });

        const chain = path.map(id => ({ id, name: formatMemberName(data_stash.find(x => x.id === id)) }));
        setRelationResult({
            status: full_coverage ? 'found' : 'partial',
            chain,
            fromName,
            toName: formatMemberName(member),
        });
    };

    const centerOnMember = (id) => {
        viewRef.current?.centerOn(id);
    };

    const relationFilteredMembers = relationQuery.trim() === "" || !findRelationFrom
        ? []
        : members.filter(m => {
            if (m.id === findRelationFrom.id) return false;
            return formatMemberName(m).toLowerCase().includes(relationQuery.toLowerCase());
        });

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
        const card_dim = { w: 280, h: 70, text_x: 75, text_y: 15, img_w: 60, img_h: 60, img_x: 5, img_y: 5 };
        const card_display = cardDisplay(),
            card_edit = cardEditParams();

        const store = createStore({
            data: members,
            node_separation: 310,
            level_separation: 150,
            isAdmin,
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
                findRelation: ({ d }) => openFindRelation(d.data),
                onNavigate: () => clearRelationHighlight(),
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
        viewRef.current = view;
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
                                    className={`navbar-icon-btn ${isAdmin ? 'navbar-icon-btn-active' : ''}`}
                                    onClick={handleSettingsClick}
                                    title={isAdmin ? "Admin mode on (click to turn off)" : "Admin Settings"}
                                >
                                    {isAdmin ? <LockOpenIcon fontSize="large" /> : <SettingsIcon fontSize="large" />}
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

                            {findRelationOpen && findRelationFrom && (
                                <div className="relation-search-overlay" onClick={closeFindRelation}>
                                    <div className="relation-search-modal" onClick={(e) => e.stopPropagation()}>
                                        <div className="relation-search-header">
                                            <LinkIcon fontSize="small" />
                                            <h3 className="relation-search-title">Find Relation</h3>
                                            <button
                                                type="button"
                                                className="relation-search-close"
                                                onClick={closeFindRelation}
                                                title="Close"
                                                aria-label="Close"
                                            >
                                                <ClearIcon fontSize="small" />
                                            </button>
                                        </div>
                                        <p className="relation-search-subtitle">
                                            Show how <strong>{findRelationFrom.name}</strong> is related to...
                                        </p>
                                        <input
                                            ref={relationSearchRef}
                                            type="text"
                                            className="relation-search-input"
                                            placeholder="Search for a family member..."
                                            value={relationQuery}
                                            onChange={(e) => setRelationQuery(e.target.value)}
                                        />
                                        {relationQuery.trim() !== "" && (
                                            <ul className="relation-search-results">
                                                {relationFilteredMembers.length > 0 ? (
                                                    relationFilteredMembers.map((member) => (
                                                        <li
                                                            key={member.id}
                                                            className="relation-search-item"
                                                            onClick={() => handleRelationPick(member)}
                                                        >
                                                            {formatMemberName(member)}
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="relation-search-no-results">No family members found</li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}

                            {relationResult && (
                                <div className="relation-result-banner">
                                    <LinkIcon fontSize="small" className="relation-result-icon" />
                                    <div className="relation-result-text">
                                        {relationResult.status === 'not-found' ? (
                                            <span>No relation found between <strong>{relationResult.fromName}</strong> and <strong>{relationResult.toName}</strong>.</span>
                                        ) : (
                                            <>
                                                <span className="relation-result-chain">
                                                    {relationResult.chain.map((item, i) => (
                                                        <span key={item.id}>
                                                            {i > 0 && <span className="relation-result-arrow"> → </span>}
                                                            <button
                                                                type="button"
                                                                className="relation-result-name"
                                                                onClick={() => centerOnMember(item.id)}
                                                            >
                                                                {item.name}
                                                            </button>
                                                        </span>
                                                    ))}
                                                </span>
                                                {relationResult.status === 'partial' && (
                                                    <span className="relation-result-caveat">Dashed line: some connecting relatives aren't shown in this view.</span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <button
                                        className="relation-result-close"
                                        onClick={clearRelationHighlight}
                                        title="Clear highlight"
                                        aria-label="Clear highlight"
                                    >
                                        <ClearIcon fontSize="small" />
                                    </button>
                                </div>
                            )}
                        </>
                    )
            }
        </>
    );
}

export default App;
