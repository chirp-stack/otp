module.exports = function(request, response) {
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('./db/data.db');
    const config = require('../config');
    const { Vonage } = require('@vonage/server-sdk');
    //const fs = require('fs');
    //const privatekey = fs.readFileSync(('./private.key', 'utf8'));
    //const privatekey = require('../private.key')
    const vonage = new Vonage({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        applicationId: config.appid,
        privateKey: config.privateKeyPath
    });

    var to = request.body.to || null;
    var user = request.body.user || null;
    var service = request.body.service || null;
    var name = request.body.name || null;
    var callId = null;

    if (to == null || user == null || service == null) {
        return response.status(200).json({
            error: 'Please post all the information needed.'
        });
    }

    if (config[service + 'filepath'] == undefined) {
        return response.status(200).json({
            error: "The service wasn't recognized."
        });
    }

    if (!to.match(/^\d{8,14}$/g)) {
        return response.status(200).json({
            error: 'Bad phone number.'
        });
    }

    const ncco = [
        {
            action: "stream",
            streamUrl: [config.serverurl + '/voice']
        },
        {   action: "input",
            eventUrl: [config.serverurl + '/status'],
        }
    ];

    vonage.calls.create({
        to: [{ type: 'phone', number: to }],
        from: { type: 'phone', number: config.callerid },
        ncco: ncco
    }, (err, res) => {
        if (err) {
            return response.status(200).json({
                error: 'There was a problem with your call. ' + err.message
            });
        } else {
            callId = res.uuid;

            db.get('SELECT callSid FROM calls WHERE callSid = ?', [callId], (err, row) => {
                if (err) {
                    return console.log(err.message);
                }

                if (!row) {
                    db.run(`INSERT INTO calls(callSid, user, service, itsto, name) VALUES(?, ?, ?, ?, ?)`, [callId, user, service, to, name], function(err) {
                        if (err) {
                            return console.log(err.message);
                        }
                    });
                } else {
                    db.run(`UPDATE calls SET user = ?, service = ?, itsto = ?, name = ? WHERE callSid = ?`, [user, service, to, callId, name], function(err) {
                        if (err) {
                            return console.log(err.message);
                        }
                    });
                }
            });

            response.status(200).json({
                callId
            });
        }
    });
};