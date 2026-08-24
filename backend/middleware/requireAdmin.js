const jwt = require('jsonwebtoken');

module.exports = function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).send({ error: 'Admin authentication required' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload.role !== 'admin') throw new Error('wrong role');
        next();
    } catch (err) {
        return res.status(401).send({ error: 'Invalid or expired admin session' });
    }
};
