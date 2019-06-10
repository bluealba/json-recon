"use strict";
const { curry, over, lensProp, pipe, sortBy, prop, map, groupWith, equals, head } = require("ramda");
const transform = require("@bluealba/object-transform");
const calculateDiff = require("deep-diff");
const chalk = require("chalk");
const { lensPath, view } = require("ramda");

const reconciliate = curry((rules, before, after) => {
	const beforeNormalized = normalizeBefore(rules)(before);
	const afterNormalized = normalizeAfter(rules)(after);

	const result =  calculateDiff(beforeNormalized, afterNormalized) || [];
	const diff = pipe(
		map(over(lensProp("path"), path => path.join("."))),
		sortBy(prop("path"))
	)(result);

	return new DiffResult(diff, before, after);
})

class DiffResult {
	constructor(diff, before, after, displayPathReplacers = []) {
		this.diff = diff;
		this.before = before;
		this.after = after;
		this.displayPathReplacers = displayPathReplacers;
	}

	parseExpression(expression) {
		//TODO: WIP, not sure about the notation. It only needs to replace captured groups!
		return expression
			.replace(/\./g, "\\.") //dots are textual dots
			.replace(/\[\]/g, "\\d+") //square brackets match any index in an array, this won't work!
			.replace(/\?/g, "[\\w\\d]+") //quotation mark matches any key
	}

	getValue(path) {
		const splitPath = path.split(".").map(x => x.match(/^\d+$/) ? parseInt(x) : x);
		return view(lensPath(splitPath))(this.before);
	}

	/**
	 * Consolidate all the differences that match a given expression into a single occurrence
	 */
	consolidate(expression) {
		const regexp = new RegExp(`^${this.parseExpression(expression)}`);

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

		return new DiffResult(consolidatedDiff, this.before, this.after, this.displayPathReplacers)
	}

	displayKey(expression, keyExtractor) {
		const regexp = new RegExp(`^(${this.parseExpression(expression)})\\.([\\d\\w]+)(.*)$`);

		const displayPathReplacer = path => {
			if (path.match(regexp)) {
				const keyHolderPath = path.replace(regexp, `$1.$2`);
				const keyHolder = this.getValue(keyHolderPath);
				const extractedKey = keyExtractor(keyHolder);
				return path.replace(regexp, `$1.${extractedKey}$3`)
			} else {
				return path;
			}
		}

		return new DiffResult(this.diff, this.before, this.after, [...this.displayPathReplacers, displayPathReplacer])
	}

	printDiff() {
		return pipe(
			map(each => {
				let path = this.displayPathReplacers.reduce((path, replacer) => replacer(path), each.path);
				let line = `${chalk.yellow(path)} -> ${chalk.grey(JSON.stringify(each.lhs))} ${chalk.white(JSON.stringify(each.rhs))}`
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
