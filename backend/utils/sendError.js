// Never send raw Mongo/Mongoose error objects to the client — they can carry
// stack traces, schema paths, and query internals. Log the full error server
// side and return a generic message instead.
module.exports = function sendError(res, err, status = 400) {
    console.error(err);
    res.status(status).send({ error: 'Something went wrong. Please try again.' });
};
