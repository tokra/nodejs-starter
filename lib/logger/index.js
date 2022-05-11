/* eslint-disable arrow-body-style */
require('le_node');
const mkdirp = require('mkdirp');
const config = require('config').get('logging');
const winston = require('winston');
const morgan = require('morgan');
const util = require('util');
const prettyBytes = require('pretty-bytes');
const prettyMilliseconds = require('pretty-ms');
const _ = require('lodash');
const os = require('os');

const { isEnabledInConfig } = require('../configHelper');
const { BooleanUtils } = require('../typesHelper');
const {
	getRequestIP,
	getTookTime,
	getResponseContentLength,
	getResponseStatusCode,
	getRequestUrl,
	getRequestMethod,
	getRequestUserAgent,
	getRequestId,
	getAdopterId,
	getRequestReferrer,
	getRequestOrigin
} = require('../expressHelper');
const { generateTemplateString } = require('../stringUtils');

const loadGeoRegion = (conf = {}) => {
	if (isEnabledInConfig(conf, 'trace', 'region')) {
		const { geoRegion = '' } = conf;
		return geoRegion.length === 0 ? '' : `[region:${geoRegion}]`;
	}
	return '';
};

/** perf: init these vars once */
const GEO_REGION = loadGeoRegion(config);
const IS_ENABLED_TRACKING_ORIGIN = isEnabledInConfig(config, 'trace', 'origin');
const IS_ENABLED_TRACKING_REFERER = isEnabledInConfig(config, 'trace', 'referer');
const IS_ENABLED_TRACKING_REMOTE_CLIENT_IP = isEnabledInConfig(config, 'trace', 'remoteClientIP');
const IS_ENABLED_TRACKING_USER_AGENT = isEnabledInConfig(config, 'trace', 'userAgent');
const HOSTNAME = os.hostname();

const getGeoRegion = () => GEO_REGION;
const getHostname = () => HOSTNAME;

const format = (name, value) => {
	const template = generateTemplateString(_.get(config, 'trace.tokensFormat'));
	if (_.isNumber(value)) {
		value = _.toString(value); /* eslint-disable-line no-param-reassign */
	}
	return _.isEmpty(value) ? '' : template({ name, value });
};

/** Supported tokens:
 * hostName
 * reqMethod,
 * respStatus,
 * respTime,
 * geoRegion,
 * contentLength,
 * reqOrigin,
 * reqReferrer,
 * reqIp,
 * reqUa,
 * reqId,
 * reqUrl,
 * appId
 */
const prepareMorganTokens = (conf) => {
	_.get(conf, 'trace.enabledTokens', '')
		.split(',')
		.forEach((token) => {
			switch (_.toLower(token)) {
				case 'hostname':
					/* istanbul ignore next: no need to test */
					morgan.token('hostname', () => format('Hostname', HOSTNAME));
					break;
				case 'reqmethod':
					/* istanbul ignore next: no need to test */
					morgan.token('reqmethod', (req) => format('Request-Method', getRequestMethod(req)));
					break;
				case 'respstatus':
					/* istanbul ignore next: no need to test */
					morgan.token('respstatus', (res) => {
						return format('Response-Status', getResponseStatusCode(res));
					});
					break;
				case 'resptime':
					/* istanbul ignore next: no need to test */
					morgan.token('resptime', (req, res) => format('Took', prettyMilliseconds(getTookTime(req, res))));
					break;
				case 'georegion':
					/* istanbul ignore next: no need to test */
					morgan.token('georegion', () => GEO_REGION);
					break;
				case 'contentlength':
					/* istanbul ignore next: no need to test */
					morgan.token('contentlength', (res) => format('Content-Length', prettyBytes(getResponseContentLength(res))));
					break;
				case 'reqorigin':
					/* istanbul ignore next: no need to test */
					morgan.token('reqorigin', (req) =>
						IS_ENABLED_TRACKING_ORIGIN ? format('Origin', getRequestOrigin(req)) : ''
					);
					break;
				case 'reqreferrer':
					/* istanbul ignore next: no need to test */
					morgan.token('reqreferrer', (req) =>
						IS_ENABLED_TRACKING_REFERER ? format('Referrer', getRequestReferrer(req)) : ''
					);
					break;
				case 'reqip':
					/* istanbul ignore next: no need to test */
					morgan.token('reqip', (req) => {
						return IS_ENABLED_TRACKING_REMOTE_CLIENT_IP ? format('Request-IP', getRequestIP(req)) : '';
					});
					break;
				case 'requa':
					/* istanbul ignore next: no need to test */
					morgan.token('requa', (req) => {
						return IS_ENABLED_TRACKING_USER_AGENT ? format('UA', getRequestUserAgent(req)) : '';
					});
					break;
				case 'reqid':
					/* istanbul ignore next: no need to test */
					morgan.token('reqid', (req) => format('Request-ID', getRequestId(req)));
					break;
				case 'requrl':
					/* istanbul ignore next: no need to test */
					morgan.token('requrl', (req) => format('Request-Url', getRequestUrl(req)));
					break;
				case 'appid':
					/* istanbul ignore next: no need to test */
					morgan.token('appid', (req) => format('Adopter-ID', getAdopterId(req)));
					break;
				default:
					/* istanbul ignore next: no need to test */
					break;
			}
		});
};
prepareMorganTokens(config);

/** these levels are used:
 *{
 *  error: 0,
 *  warn: 1,
 *  info: 2,
 *  verbose: 3,
 *  debug: 4,
 *  silly: 5
 *} */

const { categories, color, timestamp } = config; // Grabbing our logger category config

const formatLevelUpperCase = winston.format((info) => {
	_.set(info, 'level', info.level.toUpperCase());
	return info;
});

const formatCustomTypes = ({ isColorized = true } = {}) =>
	winston.format((info) => {
		if (info.message instanceof Object || info.message instanceof Array) {
			_.set(
				info,
				'message',
				util.inspect(info.message, {
					showHidden: false,
					depth: null,
					colors: isColorized
				})
			);
		}
		return info;
	});

const formatOutput = () =>
	winston.format.printf(
		(info) =>
			`${info.timestamp ? `${info.timestamp} ` : ''}[${info.level}] ${info.label ? `(${info.label}) ` : ''}${
				info.message
			}`
	);

const transportConsole = ({
	level = 'debug',
	label = '',
	isLevelUpperCase = true,
	isColorized = true,
	isTimestamped = true
} = {}) => {
	const formats = [];
	formats.push(
		winston.format.label({
			label
		})
	);
	/* istanbul ignore else */
	if (isLevelUpperCase === true) {
		formats.push(formatLevelUpperCase());
	}
	formats.push(
		formatCustomTypes({
			isColorized
		})()
	);
	/* istanbul ignore else */
	if (isColorized === true) {
		formats.push(winston.format.colorize());
	}
	/* istanbul ignore else */
	if (isTimestamped === true) {
		formats.push(winston.format.timestamp());
	}
	formats.push(formatOutput());

	return new winston.transports.Console({
		level,
		format: winston.format.combine(...formats)
	});
};

const transportFile = ({ dirname = './logs', level = 'debug', label = '' } = {}) =>
	new winston.transports.File({
		level,
		dirname,
		filename: `${label || 'application'}.log`,
		format: winston.format.combine(
			winston.format.label({ label }),
			formatLevelUpperCase(),
			formatCustomTypes()(),
			winston.format.timestamp(),
			formatOutput()
		)
	});

/* istanbul ignore next */
const transportLogentries = (logentriesToken, { level = 'debug' } = {}) =>
	new winston.transports.Logentries({
		token: logentriesToken,
		level,
		levels: {
			error: 0,
			warn: 1,
			info: 2,
			verbose: 3,
			debug: 4,
			silly: 5
		}
	});

mkdirp.sync(config.dir);

const container = new winston.Container({
	silent: config.silent
});

_.forEach(_.entries(categories), ([category, transports]) => {
	const isColorized = BooleanUtils.getBoolean(color);
	const isTimestamped = BooleanUtils.getBoolean(timestamp);
	const loggerTransports = [];
	_.forEach(transports, (transport) => {
		switch (transport) {
			case 'Console':
				loggerTransports.push(transportConsole({ level: config.level, label: category, isColorized, isTimestamped }));
				break;
			case 'File':
				loggerTransports.push(transportFile({ level: config.level, label: category, dirname: config.dir }));
				break;
			/* istanbul ignore next */
			case 'Logentries':
				if (config.logentriesEnabled) {
					loggerTransports.push(transportLogentries(config.logentriesToken, { level: config.level }));
				}
				break;
			default:
				break;
		}
	});
	container.add(category, {
		transports: loggerTransports
	});
});

let loggerMorgan;
/* istanbul ignore else */
if (container.has('performance')) {
	loggerMorgan = container.get('performance');
} else {
	container.add('morgan', { transports: [transportConsole({ category: 'performance' })] });
	loggerMorgan = container.get('morgan');
}

let loggerAkamai;

/* istanbul ignore if */
if (_.isEqual(_.toString(config.akamaiLoggingEnabled), 'true')) {
	if (container.has('akamai')) {
		loggerAkamai = container.get('akamai');
		if (loggerAkamai.transports && loggerAkamai.transports.length === 0) {
			loggerAkamai = undefined;
		}
	} else {
		loggerAkamai = loggerMorgan;
	}
}

const getLogger = (logger) => container.get(logger);

const getLoggerContainer = () => container;

/** Supported tokens:
 * hostName
 * reqMethod,
 * respStatus,
 * respTime,
 * geoRegion,
 * contentLength,
 * reqOrigin,
 * reqReferrer,
 * reqIp,
 * reqUa,
 * reqId,
 * reqUrl,
 * appId
 */
const customMorganFormat = (tokens, req, res) => {
	const msg = _.get(config, 'trace.enabledTokens', '')
		.split(',')
		.map((token) => {
			switch (_.toLower(token)) {
				case 'hostname':
					return tokens.hostname();
				case 'reqmethod':
					return tokens.reqmethod(req, res);
				case 'respstatus':
					return tokens.respstatus(res);
				case 'resptime':
					return tokens.resptime(req, res);
				case 'georegion':
					return tokens.georegion(req, res);
				case 'contentlength':
					return tokens.contentlength(res);
				case 'reqorigin':
					return tokens.reqorigin(req);
				case 'reqreferrer':
					return tokens.reqreferrer(req);
				case 'reqip':
					return tokens.reqip(req);
				case 'requa':
					return tokens.requa(req);
				case 'reqid':
					return tokens.reqid(req, res);
				case 'requrl':
					return tokens.requrl(req, res);
				case 'appid':
					return tokens.appid(req, res);
				default:
					return '';
			}
		})
		.filter((data) => data && data.length > 0)
		.join(' ');
	return msg;
};

/* istanbul ignore next */
const getMorganLogger = () => {
	return morgan(customMorganFormat, {
		stream: {
			write: (message) => {
				if (!_.isEmpty(_.trim(message))) {
					if (message.includes('akamai')) {
						if (loggerAkamai) {
							loggerAkamai.info(_.trim(message));
						}
						return;
					}
					loggerMorgan.info(_.trim(message)); // Morgan adds a line break, remove it
				}
			}
		}
	});
};

const getConsoleLogger = ({ level, label } = {}) =>
	winston.createLogger({
		transports: [transportConsole({ level, label })]
	});

module.exports = {
	getLogger,
	getLoggerContainer,
	getMorganLogger,
	getConsoleLogger,
	getGeoRegion,
	getHostname
};
