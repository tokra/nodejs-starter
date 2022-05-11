const _ = require('lodash');

class BooleanUtils {
	static isBoolean(arg) {
		return [true, false, 'true', 'false'].includes(arg);
	}

	static getBoolean(arg) {
		return this.isBoolean(arg) ? arg === true || arg === 'true' : undefined;
	}
}

const isNumber = (num) => {
	if (_.isString(num)) {
		if (_.isEmpty(num) || _.isEmpty(_.trim(num))) {
			return false;
		}
		const result = _.toNumber(num);
		return !_.isNaN(result) && _.isNumber(result);
	}
	return _.isNumber(num);
};

const getNumber = (num) => {
	if (_.isNil(num)) {
		throw new Error('Argument cannot be null!');
	}
	if (isNumber(num)) {
		return _.toNumber(num);
	}
	throw new Error(`Not a number: ${num}`);
};

function isJson(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}

module.exports = {
	BooleanUtils,
	isNumber,
	isJson,
	getNumber
};
