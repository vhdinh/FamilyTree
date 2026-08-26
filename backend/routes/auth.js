const router = require('express').Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const sendError = require('../utils/sendError');

// A 4-digit PIN has only 10,000 combinations, so the login route itself
// must be the thing that makes brute-forcing impractical.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, try again later' },
});

router.route('/login').post(loginLimiter, (req, res) => {
    const { pin } = req.body;

    if (typeof pin !== 'string' || pin !== process.env.ADMIN_PIN) {
        return res.status(401).send({ error: 'Incorrect PIN' });
    }
    console.log('---AUTH---LOGIN----', req.body);

    try {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.status(200).send({ token });
    } catch (err) {
        sendError(res, err, 500);
    }
});

module.exports = router;
