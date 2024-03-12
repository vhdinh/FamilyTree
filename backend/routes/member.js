const router = require('express').Router();
let Member = require('../models/member.model');
const {ObjectId} = require("mongodb");

router.route('/').get((req, res) => {
    Member.find()
        .then(c => res.status(200).send(c))
        .catch(err => res.status(400).send(err));
});

router.route('/edit/:id').post((req, res) => {
    console.log(`route: /edit/${req.body.id}/ `, req.body);
    Member.findByIdAndUpdate(req.body.id, {data: req.body.data})
        .then((r) => res.status(200).send(r))
        .catch(err => res.status(400).send(err));
});

router.route('/add-new').post(async (req, res) => {
    const newMember = new Member(req.body);
    console.log('route: /add-new: ', newMember);
    newMember.save()
        .then((r) => {
            console.log('route: /add-new saved');
            // Update spouse relations
            Member.findOneAndUpdate(
                { _id: { $in: r.rels.spouses }},
                { $set: {"rels.spouses": [r._id] }},)
                .then((s) => {
                    // Update children relations
                    if (r.data.gender === 'F') {
                         Member.updateMany(
                            { _id: { $in: r.rels.children }},
                            { $set: {"rels.mother": r._id }}
                        ).then((t) => res.status(200).send(r))
                             .catch(err => res.status(400).send(err));
                    } else {
                         Member.updateMany(
                            { _id: { $in: r.rels.children }},
                            { $set: {"rels.father": r._id }}
                        ).then((u) => res.status(200).send(r))
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
            spouses: [req.body.rel_datum.id],
            children: [],
        },
        data: req.body.datum.data,
        _id: new ObjectId(req.body.datum.id),
    });
    console.log('route: /add-spouse: ', req.body);

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
                    ).then((t) => res.status(200).send(r))
                        .catch(err => res.status(400).send(err));
                } else {
                    Member.updateMany(
                        { _id: { $in: spouse.rels.children }},
                        { $set: {"rels.father": r._id }}
                    ).then((u) => res.status(200).send(r))
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
        data: req.body.datum.data,
        _id: new ObjectId(req.body.datum.id),
    });
    console.log('route: /add-parent: ', newParent);

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

router.route('/add-kid').post((req, res) => {
    const newKid = new Member({
        data: req.body.data,
        rels: req.body.rels,
        _id: new ObjectId(req.body.id),
    })
    console.log('route: /add-kid: ', newKid);

    newKid.save()
        .then(async (r) => {
            // Update parents to contain kid's id
            if (r.rels?.father && r.rels?.father.toString().split('-').length === 1) {
                console.log('route: /add-kid newKid saved , adding-father');
                await Member.findByIdAndUpdate(r.rels.father, {
                    $push: { 'rels.children': r._id}
                })
            }
            if (r.rels?.mother && r.rels?.mother.toString().split('-').length === 1) {
                console.log('route: /add-kid newKid saved, adding mother');
                await Member.findByIdAndUpdate(r.rels.mother, {
                    $push: { 'rels.children': r._id}
                })

                // const mom = await Member.findById(r.rels.mother);
                // // update mother's spouse to add kid
                // Member.findByIdAndUpdate(mom.rels.spouse[0], {
                //     $set: {"rels.children": [r._id]}
                // })
            }
            console.log('route: /add-kid done adding newKid, father, and mother')
            res.status(200).send(r);
        })
        .catch(err => res.status(400).send(err));
})

router.route('/delete/:id').post(async (req, res) => {
    console.log(`route: /delete/${req.body.id}`)

    await Member.findByIdAndDelete(req.body.id);
    console.log(`Member ${req.body.id} deleted`);
    // delete father relation
    await Member.updateMany({"rels.father": req.body.id}, {
        $unset: { "rels.father": ""}
    });
    console.log(`Member ${req.body.id} father updated`);

    // delete mother relation
    await Member.updateMany({"rels.mother": req.body.id}, {
        $unset: { "rels.mother": ""}
    });
    console.log(`Member ${req.body.id} mother updated`);

    // delete children relation
    await Member.updateMany(
        { "rels.children": { "$in" : [req.body.id]}},
        { $pull: { "rels.children": req.body.id  }}
    )
    console.log(`Member ${req.body.id} chilren updated`);

    // delete spouse relation
    await Member.updateMany(
        { "rels.spouses": { "$in" : [req.body.id]}},
        { $pull: { "rels.spouses": req.body.id  }}
    )
    console.log(`Member ${req.body.id} spouse updated`);

    res.status(200).send({message: 'removed member'});
});

module.exports = router;