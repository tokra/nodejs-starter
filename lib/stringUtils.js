/**
 * Produces a function which uses template strings to do simple interpolation from objects.
 *
 * Usage:
 *    var makeMeKing = generateTemplateString('${name} is now working in ${company}!');
 *
 *    console.log(makeMeKing({ name: 'Tomas', company: 'tokra.io'}));
 *    // Logs 'Tomas is now working in tokra.io!'
 *
 * Source:
 *    https://stackoverflow.com/questions/29182244/convert-a-string-to-a-template-string
 */
/* eslint-disable no-useless-escape */
/* eslint-disable arrow-body-style */
const generateTemplateString = (() => {
	const cache = {};
	const generateTemplate = (template) => {
		let fn = cache[template];
		/* istanbul ignore else */
		if (!fn) {
			// Replace ${expressions} (etc) with ${map.expressions}.
			const sanitized = template
				.replace(/\$\{([\s]*[^;\s\{]+[\s]*)\}/g, (_, match) => {
					return `\$\{map.${match.trim()}\}`; /* eslint-disable-line no-useless-escape */
				})
				// Afterwards, replace anything that's not ${map.expressions}' (etc) with a blank string.
				.replace(/(\$\{(?!map\.)[^}]+\})/g, '');

			fn = Function('map', `return \`${sanitized}\``); /* eslint-disable-line no-new-func */
		}
		return fn;
	};
	return generateTemplate;
})();

module.exports = {
	generateTemplateString
};
