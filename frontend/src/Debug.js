import React, {useEffect, useState} from 'react';

function Debug() {
    const [members, setMembers] = useState([]);

    useEffect(() => {
        // Simple GET request with a JSON body using fetch
        fetch(`${process.env.REACT_APP_API}/member`)
            .then(res => res.json())
            .then((r) => {
                setMembers(r);
            });
    }, []);

    return (
        <><pre>{JSON.stringify(members, null, 2) }</pre></>
    )
}

export default Debug;