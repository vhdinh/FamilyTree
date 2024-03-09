const router = require('express').Router();
let Member = require('../models/member.model');

router.route('/').get((req, res) => {
    Member.find()
        .then(c => res.status(200).send(c))
        .catch(err => res.status(400).send(err));
});

router.route('/add-new').post(async (req, res) => {
    console.log('/add-new ', req.body);
    const newMember = new Member(req.body);
    newMember.save()
        .then((r) => {
            // Update spouse relations
            Member.findOneAndUpdate(
                { _id: { $in: r.rels.spouses }},
                { $set: {"rels.spouses": [r._id] }},
                { returnNewDocument: true} )
                .then((s) => {
                    // Update children relations
                    if (r.data.gender === 'F') {
                         Member.updateMany(
                            { _id: { $in: r.rels.children }},
                            { $set: {"rels.mother": r._id }}
                        ).then((t) => res.status(200).send(t))
                             .catch(err => res.status(400).send(err));
                    } else {
                         Member.updateMany(
                            { _id: { $in: r.rels.children }},
                            { $set: {"rels.father": r._id }}
                        ).then((u) => res.status(200).send(u))
                             .catch(err => res.status(400).send(err));
                    }
                })
                .catch(err => res.status(400).send(err));
    })
        .catch(err => res.status(400).send(err));
});

router.route('/add-spouse').post((req, res) => {
    const newSpouse = new Member({
        rels: {
            spouses: [req.body.rel_datum.id]
        },
        data: req.body.datum.data
    });

    newSpouse.save()
        .then(async (r) => {
            Member.findByIdAndUpdate(req.body.rel_datum.id, {
                $set: {"rels.spouses": [r._id]}
            }).then(async (s) => {

                const spouse = await Member.findById(req.body.rel_datum.id);

                // Update children relations
                if (spouse.data.gender === 'F') {
                    Member.updateMany(
                        { _id: { $in: spouse.rels.children }},
                        { $set: {"rels.mother": r._id }}
                    ).then((t) => res.status(200).send(t))
                        .catch(err => res.status(400).send(err));
                } else {
                    Member.updateMany(
                        { _id: { $in: spouse.rels.children }},
                        { $set: {"rels.father": r._id }}
                    ).then((u) => res.status(200).send(u))
                        .catch(err => res.status(400).send(err));
                }
            }).catch(err => res.status(400).send(err));
        })
        .catch(err => res.status(400).send(err));
});

router.route('/add-parent').post((req, res) => {
    const newParent = new Member({
        rels: {
            children: [req.body.rel_datum.id]
        },
        data: req.body.datum.data
    });
    console.log(newParent);

    newParent.save()
        .then(async (r) => {
            Member.findByIdAndUpdate(req.body.rel_datum.id, {
                $set: { [`rels.${req.body.datum.data.gender === 'M' ? 'father' : 'mother'}`]: r._id}
            }).then((s) => {
                res.status(200).send(r);
            }).catch(err => res.status(400).send(err));
        })
        .catch(err => res.status(400).send(err));
});



module.exports = router;