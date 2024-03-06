const mongoose = require('mongoose');
const {ObjectId} = require("mongodb");

const Schema = mongoose.Schema;

const memberSchema = new Schema({
    rels: {
        spouses: [{ type : ObjectId, ref: 'Member' }],
        father: {type : ObjectId, ref: 'Member' },
        mother: {type : ObjectId, ref: 'Member' },
        children:  [{ type : ObjectId, ref: 'Member' }],
    },
    data: {
        firstName: String,
        lastName: String,
        birthday: String,
        gender: String,
        link: String
    }
}, {
    timestamps: true,
});

memberSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;