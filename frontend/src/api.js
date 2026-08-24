const ADMIN_SESSION_KEY = 'ft_admin_token';

export function getAdminToken() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY);
}

export function setAdminToken(token) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, token);
}

export function clearAdminToken() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

// Wraps fetch for admin-only (mutating) requests: adds the Authorization
// header and redirects the caller to handle a 401 by logging the admin out.
export async function authFetch(path, options = {}) {
    const token = getAdminToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${process.env.REACT_APP_API}${path}`, { ...options, headers });
    if (res.status === 401) {
        clearAdminToken();
        window.dispatchEvent(new Event('ft-admin-unauthorized'));
    }
    return res;
}
