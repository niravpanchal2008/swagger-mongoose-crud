// Purpose : map every key to its value

var map = (req) =>
    Object.keys(req.query).reduce((prev, curr) => {
        prev[curr] = req.query[curr];
        return prev;
    }, {});

module.exports = { map: map };
