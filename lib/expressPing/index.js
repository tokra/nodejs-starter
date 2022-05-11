const app = require('express')();
const _ = require('lodash');

/**
 * This curry fn is for defining custom route handler.
 * @param {String} statusMsg optional param to pass return status message, defaults to: 'App is active'
 * @returns nothing
 */
const pingHandler =
	(statusMsg = 'App is active') =>
	(req, res) => {
		if (!_.isNil(statusMsg) && !_.isEmpty(statusMsg) && _.isString(statusMsg)) {
			res.status(200);
			res.send(statusMsg);
		} else {
			res.sendStatus(200);
		}
	};

/**
 * This is default handler with predefined default /ping route
 * @returns registered app handler on /ping route
 */
const ping = () => {
	app.disable('x-powered-by');
	return app.get('/ping', (req, res) => {
		res.sendStatus(200);
	});
};

module.exports = {
	ping,
	pingHandler
};
