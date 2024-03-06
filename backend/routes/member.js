const router = require('express').Router();
let Member = require('../models/member.model');

router.route('/').get((req, res) => {
    Member.find()
        .then(c => res.json(c))
        .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/add').post((req, res) => {
    console.log('route /add:', req.body);
    // const fName = req.body.firstName;
    // const lName = req.body.lastName;
    // const birthday = req.body.birthday

    const newMember = new Member({
        rels: {},
        data: {
            firstName: 'Vu',
            lastName: 'Dinh',
            birthday: '05/18/1988',
        }
    });

    newMember.save()
        .then((r) => {
            console.log('user-saved:', r);
            res.json(`Vu has been added`)
            // res.json(`${fName} ${lName} has been added`)
        })
        .catch(err => res.status(400).json('error-saving-user: ' + err));
});

module.exports = router;