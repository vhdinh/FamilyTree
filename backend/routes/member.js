const router = require('express').Router();
let Member = require('../models/member.model');
const {ObjectId} = require("mongodb");
const requireAdmin = require('../middleware/requireAdmin');
const sendError = require('../utils/sendError');

// Route params are always strings, but require the strict 24-hex-char shape
// so a malformed id fails fast with a clean 400 instead of a Mongoose CastError.
const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
// findByIdAndUpdate/save() don't run schema casting on $set values, so a
// wrong-shaped `data` (e.g. a plain string) would otherwise overwrite the
// whole subdocument as-is instead of being rejected.
const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

router.route('/').get((req, res) => {
    Member.find()
        .then(c => res.status(200).send(c))
        .catch(err => sendError(res, err));
});

router.route('/edit/:id').post(requireAdmin, async (req, res) => {
    console.log(`route: /edit/${req.params.id}/ `, req.body);
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).send({ error: 'Invalid member id' });
    }
    if (!isPlainObject(req.body.data)) {
        return res.status(400).send({ error: 'data must be an object' });
    }
    try {
        if (req.body.default === true) {
            // Unset the currently default member before assigning the new one
            await Member.updateMany(
                { _id: { $ne: req.params.id }, default: true },
                { $set: { default: false } }
            );
        }
        const r = await Member.findByIdAndUpdate(
            req.params.id,
            { data: req.body.data, default: !!req.body.default },
            { new: true }
        );
        res.status(200).send(r);
    } catch (err) {
        sendError(res, err);
    }
});

router.route('/add-new').post(requireAdmin, async (req, res) => {
    // Allowlist fields explicitly so the caller can't set _id, default,
    // or any other undeclared top-level field via the request body.
    const newMember = new Member({
        data: req.body.data,
        rels: req.body.rels,
    });
    console.log('route: /add-new: ', newMember);
    newMember.save()
        .then((r) => {
            console.log('route: /add-new saved');
            // Update spouse relations
            Member.findOneAndUpdate(
                { _id: { $in: r.rels.spouses }},
                { $addToSet: {"rels.spouses": r._id }},)
                .then((s) => {
                    // Update children relations
                    if (r.data.gender === 'F') {
                         Member.updateMany(
                            { _id: { $in: r.rels.children }},
                            { $set: {"rels.mother": r._id }}
                        ).then((t) => res.status(200).send(r))
                             .catch(err => sendError(res, err));
                    } else {
                         Member.updateMany(
                            { _id: { $in: r.rels.children }},
                            { $set: {"rels.father": r._id }}
                        ).then((u) => res.status(200).send(r))
                             .catch(err => sendError(res, err));
                    }
                })
                .catch(err => sendError(res, err));
    })
        .catch(err => sendError(res, err));
});

router.route('/add-spouse').post(requireAdmin, (req, res) => {
    let newSpouse;
    try {
        newSpouse = new Member({
            rels: {
                spouses: [req.body.rel_datum.id],
                children: [],
            },
            data: req.body.datum.data,
            _id: new ObjectId(req.body.datum.id),
        });
    } catch (err) {
        return sendError(res, err);
    }
    console.log('route: /add-spouse: ', req.body);

    newSpouse.save()
        .then((r) => {
            // Add the new spouse without clobbering any existing spouses
            Member.findByIdAndUpdate(req.body.rel_datum.id, {
                $addToSet: {"rels.spouses": r._id}
            }).then(() => res.status(200).send(r))
                .catch(err => sendError(res, err));
        })
        .catch(err => sendError(res, err));
});

router.route('/add-parent').post(requireAdmin, (req, res) => {
    let newParent;
    try {
        newParent = new Member({
            rels: {
                children: [req.body.rel_datum.id]
            },
            data: req.body.datum.data,
            _id: new ObjectId(req.body.datum.id),
        });
    } catch (err) {
        return sendError(res, err);
    }
    console.log('route: /add-parent: ', newParent);

    newParent.save()
        .then(async (r) => {
            Member.findByIdAndUpdate(req.body.rel_datum.id, {
                $set: { [`rels.${req.body.datum.data.gender === 'M' ? 'father' : 'mother'}`]: r._id}
            }).then((s) => {
                res.status(200).send(r);
            }).catch(err => sendError(res, err));
        })
        .catch(err => sendError(res, err));
});

router.route('/add-kid').post(requireAdmin, (req, res) => {
    let newKid;
    try {
        newKid = new Member({
            data: req.body.data,
            rels: req.body.rels,
            _id: new ObjectId(req.body.id),
        })
    } catch (err) {
        return sendError(res, err);
    }
    console.log('route: /add-kid: ', newKid);

    newKid.save()
        .then(async (r) => {
            // Update parents to contain kid's id
            if (r.rels?.father) {
                console.log('route: /add-kid newKid saved , adding-father');
                await Member.findByIdAndUpdate(r.rels.father, {
                    $push: { 'rels.children': r._id}
                })
            }
            if (r.rels?.mother) {
                console.log('route: /add-kid, adding mother');
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
        .catch(err => sendError(res, err));
})

router.route('/delete/:id').post(requireAdmin, async (req, res) => {
    console.log(`route: /delete/${req.params.id}`)
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).send({ error: 'Invalid member id' });
    }
    const id = req.params.id;

    try {
        await Member.findByIdAndDelete(id);
        console.log(`Member ${id} deleted`);
        // delete father relation
        await Member.updateMany({"rels.father": id}, {
            $unset: { "rels.father": ""}
        });
        console.log(`Member ${id} father updated`);

        // delete mother relation
        await Member.updateMany({"rels.mother": id}, {
            $unset: { "rels.mother": ""}
        });
        console.log(`Member ${id} mother updated`);

        // delete children relation
        await Member.updateMany(
            { "rels.children": { "$in" : [id]}},
            { $pull: { "rels.children": id  }}
        )
        console.log(`Member ${id} chilren updated`);

        // delete spouse relation
        await Member.updateMany(
            { "rels.spouses": { "$in" : [id]}},
            { $pull: { "rels.spouses": id  }}
        )
        console.log(`Member ${id} spouse updated`);

        res.status(200).send({message: 'removed member'});
    } catch (err) {
        sendError(res, err);
    }
});

module.exports = router;