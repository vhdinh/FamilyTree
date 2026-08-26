const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const cors = require("cors");
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

// Render (and most PaaS hosts) sit behind a single reverse proxy that sets
// X-Forwarded-For. Trusting exactly one hop lets express-rate-limit read the
// real client IP without trusting arbitrary spoofed headers from the client.
app.set('trust proxy', 1);

const corsOptions = {
    AccessControlAllowOrigin: '*',
    origin: `${process.env.UI_URL}`,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
}

app.use(cors(corsOptions));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }))


main().catch(err => console.log(err));

async function main() {
    const required = ['MONGODB_URL', 'UI_URL', 'JWT_SECRET', 'ADMIN_PIN'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length) {
        console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URL);

    const memberRouter = require('./routes/member');
    const authRouter = require('./routes/auth');
    app.use('/member', memberRouter);
    app.use('/auth', authRouter);

    app.listen(port, () => {
        console.log(`App listening on port ${port}`)
    })
    // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
};
