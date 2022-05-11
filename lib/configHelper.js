const _ = require('lodash');
const { BooleanUtils, isNumber } = require('./typesHelper');

const isEnabledInConfig = (configObj, nameOfSubObject, nameOfProperty) => {
	if (_.has(configObj, nameOfSubObject)) {
		/* istanbul ignore else */
		if (_.has(configObj[nameOfSubObject], nameOfProperty)) {
			const value = configObj[nameOfSubObject][nameOfProperty];
			/* istanbul ignore else */
			if (BooleanUtils.isBoolean(value)) {
				return BooleanUtils.getBoolean(value);
			}
		}
	}
	return false;
};

const findValue = (configObj, configTree) => {
	if (_.isEmpty(configObj)) {
		throw new Error('ConfigError: Config object cannot be empty or null');
	}
	if (!(!_.isEmpty(configTree) && _.isString(configTree) && _.includes(configTree, '.'))) {
		throw new Error(`ConfigError: Config tree string invalid ! Valid format: 'objA.objB.valueC'`);
	}
	const tree = configTree.split('.');
	return tree.reduce((stack, curr, index) => {
		if (index === 0) {
			/* istanbul ignore else */
			if (_.has(configObj, curr)) {
				return configObj[curr];
			}
		} else if (_.has(stack, curr)) {
			return stack[curr];
		}
		throw new Error(`ConfigError: Not found='${curr}', at index='${index}'`);
	}, {});
};

const getAsBoolean = (configObj, configTree) => {
	const value = findValue(configObj, configTree);
	if (BooleanUtils.isBoolean(value)) {
		return BooleanUtils.getBoolean(value);
	}
	throw new Error(`ConfigError ['configTree' is not a boolean value: '${value}']`);
};

const getAsNumber = (configObj, nameOfProperty) => {
	if (_.has(configObj, nameOfProperty)) {
		if (isNumber(configObj[nameOfProperty])) {
			return _.toNumber(configObj[nameOfProperty]);
		}
	}
	return -1;
};

module.exports = {
	isEnabledInConfig,
	getAsNumber,
	getAsBoolean
};
