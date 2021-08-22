const assert = require("assert");
const elmToolingCli = require("elm-tooling");
const getExecutable = require("elm-tooling/getExecutable");

assert.strictEqual(typeof elmToolingCli, "function");
assert.strictEqual(typeof getExecutable, "function");
