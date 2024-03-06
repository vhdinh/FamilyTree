const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const cors = require("cors");
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

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
    await mongoose.connect(process.env.MONGODB_URL);

    const memberRouter = require('./routes/member');
    app.use('/member', memberRouter);

    app.listen(port, () => {
        console.log(`App listening on port ${port}`)
    })
    // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
};
