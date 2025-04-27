module.exports = function(request, response) {
    /**
     * Integration of SQLITE3 dependencies
     */
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('./db/data.db');

    /**
     * File containing the necessary configurations for the proper functioning of the system
     */
    const config = require('../config');

    /**
     * Vonage API SDK
     */
    const Vonage = require('@vonage/server-sdk');
    const vonage = new Vonage({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret
    });

    /**
     * Retrieving the posted variables to send the SMS
     */
    var to = request.body.to || null;
    var user = request.body.user || null;
    var service = request.body.service + 'sms';

    /**
     * If any variable is missing, transmit the error and prevent the system from functioning
     */
    if (to == null || user == null || service == null) {
        return response.status(200).json({
            error: 'Please post all the information needed.'
        });
    }

    if (config[service] == undefined) {
        return response.status(200).json({
            error: 'The service wasn\'t recognized.'
        });
    }

    if (!to.match(/^\d{8,14}$/g)) {
        return response.status(200).json({
            error: 'Bad phone number.'
        });
    }

    /**
     * Vonage API to send the SMS
     */
    vonage.message.sendSms(config.callerid, to, config[service], (err, res) => {
        if (err) {
            return response.status(200).json({
                error: 'There was a problem with your SMS. ' + err.message
            });
        } else {
            const smsid = res.messages[0]['message-id'];

            response.status(200).json({
                smsid
            });

            /**
             * Add the sent SMS to the Sqlite3 database
             */
            db.run(`INSERT INTO sms(smssid, user, itsfrom, itsto, content, service, date) VALUES(?, ?, ?, ?, ?, ?, ?)`, [smsid, user, config.callerid, to, config[service], service, Date.now()], function(err) {
                if (err) {
                    return console.log(err.message);
                }
            });
        }
    });
};