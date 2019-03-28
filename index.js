"use strict";
const { curry, over, lensProp, pipe, sortBy, prop, map, groupWith, equals, head } = require("ramda");
const transform = require("@bluealba/object-transform");
const calculateDiff = require("deep-diff");
const chalk = require("chalk");

const reconciliate = curry((rules, before, after) => {
	const beforeNormalized = normalizeBefore(rules)(before);
	const afterNormalized = normalizeAfter(rules)(after);

	const result =  calculateDiff(beforeNormalized, afterNormalized);
	const diff = pipe(
		map(over(lensProp("path"), path => path.join("."))),
		sortBy(prop("path"))
	)(result);

	return new DiffResult(diff);
})

class DiffResult {
	constructor(diff) {
		this.diff = diff;
	}

	/**
	 * Consolidate all the differences that match a given expression into a single occurrence
	 */
	consolidate(expression) {
		const regexp = new RegExp("^" + expression
			.replace(/\./g, "\\.") //dots are textual dots
			.replace(/\[\]/g, "(\\d+)") //square brackets match any index in an array, it creates a capturing group
			.replace(/\*/g, "([\\w\\d\\.]+)")); //star match any piece of path, it creates a capturing group

		const consolidatedDiff = pipe(
			map(each => Object.assign({}, each, { groupPath: each.path.replace(regexp, expression) })),
			sortBy(each => `${each.groupPath} ${JSON.stringify(each.rhs)} ${JSON.stringify(each.lhs)}`),
			groupWith((each1, each2) => {
				return equals(each1.groupPath, each2.groupPath)
					&& equals(each1.lhs, each2.lhs)
					&& equals(each1.rhs, each2.rhs)
			}),
			map(group => ({
				path: group.length > 1 ? head(group).groupPath : head(group).path,
				lhs: head(group).lhs,
				rhs: head(group).rhs,
				times: group
			}))
		)(this.diff)

		return new DiffResult(consolidatedDiff)
	}

	printDiff() {
		return pipe(
			map(each => {
				let line = `${chalk.yellow(each.path)} -> ${chalk.grey(JSON.stringify(each.lhs))} ${chalk.white(JSON.stringify(each.rhs))}`
				if (each.times && each.times.length > 1) {
					line = `${line} ${chalk.yellow(`(${each.times.length} times)`)}`
				}
				return line;
			})
		)(this.diff).join("\n");
	}
}


function normalizeBefore(rules) {
	const transformations = [
		...(rules.remove || []).map(path => ({ type: "exclude", path })),
		...(rules.ignore || []).map(path => ({ type: "exclude", path })),
		...(rules.rename || []).map(([path, toPath]) => ({ type: "rename", path, toPath })),
		...(rules.map || []).map(([path, fn]) => ({ type: "map", path, fn }))
	];
	return transform(transformations);
}

function normalizeAfter(rules) {
	const transformations = [
		...(rules.add || []).map(path => ({ type: "exclude", path })),
		...(rules.ignore || []).map(path => ({ type: "exclude", path }))
	];
	return transform(transformations);
}

module.exports = {
	reconciliate
}
