// Member data (names, links, avatar ids) comes from the API and is rendered
// by building HTML/SVG strings and assigning them via innerHTML — never
// interpolate it into a template without passing it through these first.

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[c]));
}

// Only allow http(s) URLs through into href/src attributes, blocking
// javascript: and other script-bearing schemes.
export function sanitizeUrl(value) {
    const url = String(value ?? '').trim();
    if (!url) return '';
    try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url;
    } catch {
        // not a parseable absolute/relative URL
    }
    return '';
}

// The avatar field is meant to hold a Google Drive file id, not an arbitrary
// URL/string, so validate its shape before splicing it into the thumbnail URL.
export function sanitizeDriveId(value) {
    const id = String(value ?? '').trim();
    return /^[a-zA-Z0-9_-]+$/.test(id) ? id : '';
}
