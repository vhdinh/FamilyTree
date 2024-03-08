const router = require('express').Router();
let Member = require('../models/member.model');

router.route('/').get((req, res) => {
    Member.find()
        .then(c => res.status(200).send(c))
        .catch(err => res.status(400).send(err));
});

router.route('/add-spouse').post((req, res) => {
    const newMember = new Member({
        rels: {
            spouses: [req.body.rel_datum.id]
        },
        data: req.body.datum.data
    });

    newMember.save()
        .then(async (r) => {
            Member.findByIdAndUpdate(req.body.rel_datum.id, {
                $set: {"rels.spouses": [r._id]}
            }).then((s) => {
                res.status(200).send(r);
            }).catch(err => res.status(400).send(err));
        })
        .catch(err => res.status(400).send(err));
});



module.exports = router;