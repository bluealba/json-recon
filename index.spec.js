"use strict";

const { reconciliate } = require("./index.js");

describe("reconciliate", () => {
	const before = require("./test/simpsons-before.json");
	const after = require("./test/simpsons-after.json");

	it("differences are showing", () => {
		const result = reconciliate({
			remove: [],
			add: [],
			ignore: [],
			rename: [],
			map: []
		})(before, after)

		expect(result.diff).toHaveLength(11);
		expectDifference(result, "characters.0.firstName").toHaveSides("Homer", "Homer J.");
		expectDifference(result, "characters.0.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "characters.1.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "characters.2.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "characters.3.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "creators").toHaveSides(undefined, ["Matt Groening"]);
		expectDifference(result, "characters.0.age").toHaveSides(40, undefined);
		expectDifference(result, "characters.1.age").toHaveSides(38, undefined);
		expectDifference(result, "characters.2.age").toHaveSides(10, undefined);
		expectDifference(result, "characters.3.age").toHaveSides(8, undefined);
		expectDifference(result, "characters.4.age").toHaveSides(1, undefined);
	});

	it("marking a path as 'add' excludes it from the right-hand side of the difference", () => {
		const result = reconciliate({
			remove: [],
			add: ["creators"],
			ignore: [],
			rename: [],
			map: []
		})(before, after)

		expect(result.diff).toHaveLength(10);
		expectDifference(result, "characters.0.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "characters.0.firstName").toHaveSides("Homer", "Homer J.");
		expectDifference(result, "characters.1.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "characters.2.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "characters.3.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "characters.0.age").toHaveSides(40, undefined);
		expectDifference(result, "characters.1.age").toHaveSides(38, undefined);
		expectDifference(result, "characters.2.age").toHaveSides(10, undefined);
		expectDifference(result, "characters.3.age").toHaveSides(8, undefined);
		expectDifference(result, "characters.4.age").toHaveSides(1, undefined);
	});

	it("marking a path as 'add' excludes it from the left-hand side of the difference", () => {
		const result = reconciliate({
			remove: [],
			add: ["characters.[].age"],
			ignore: [],
			rename: [],
			map: []
		})(before, after)

		expect(result.diff).toHaveLength(11);
		expectDifference(result, "characters.0.firstName").toHaveSides("Homer", "Homer J.");
		expectDifference(result, "characters.0.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "characters.1.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "characters.2.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "characters.3.address.line1").toHaveSides("742 Evergreen Terrace", "742 Evergreen Tr");
		expectDifference(result, "characters.0.age").toHaveSides(40, undefined);
		expectDifference(result, "characters.1.age").toHaveSides(38, undefined);
		expectDifference(result, "characters.2.age").toHaveSides(10, undefined);
		expectDifference(result, "characters.3.age").toHaveSides(8, undefined);
		expectDifference(result, "characters.4.age").toHaveSides(1, undefined);
	});

	it("marking a path as 'ignore' excludes it from the both sides of the difference", () => {
		const result = reconciliate({
			remove: [],
			add: [],
			ignore: ["characters.[].address.line1"],
			rename: [],
			map: []
		})(before, after)

		expect(result.diff).toHaveLength(7);
		expectDifference(result, "characters.0.firstName").toHaveSides("Homer", "Homer J.");
		expectDifference(result, "characters.0.age").toHaveSides(40, undefined);
		expectDifference(result, "characters.1.age").toHaveSides(38, undefined);
		expectDifference(result, "characters.2.age").toHaveSides(10, undefined);
		expectDifference(result, "characters.3.age").toHaveSides(8, undefined);
		expectDifference(result, "characters.4.age").toHaveSides(1, undefined);
	});

	it("marking a path as 'map' transforms value prior to compare it", () => {
		const result = reconciliate({
			remove: [],
			add: [],
			ignore: [],
			rename: [],
			map: [
				["characters.[].address.line1", value => value.substring(0, 13) + " Tr"]
			]
		})(before, after)

		expect(result.diff).toHaveLength(8);
		expectDifference(result, "characters.0.firstName").toHaveSides("Homer", "Homer J.");
		expectDifference(result, "creators").toHaveSides(undefined, ["Matt Groening"]);
		expectDifference(result, "characters.0.age").toHaveSides(40, undefined);
		expectDifference(result, "characters.1.age").toHaveSides(38, undefined);
		expectDifference(result, "characters.2.age").toHaveSides(10, undefined);
		expectDifference(result, "characters.3.age").toHaveSides(8, undefined);
		expectDifference(result, "characters.4.age").toHaveSides(1, undefined);
	});

})

function expectDifference(result, path) {
	const expectation = expect(result.diff.find(each => each.path === path));
	expectation.toHaveSides = (left, right) => {
		expectation.toHaveProperty("lhs", left);
		expectation.toHaveProperty("rhs", right);
	}
	return expectation;
}
