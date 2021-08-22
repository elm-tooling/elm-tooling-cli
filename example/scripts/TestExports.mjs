import assert from "assert";
import elmToolingCli from "elm-tooling";
import getExecutable from "elm-tooling/getExecutable";

assert.strictEqual(typeof elmToolingCli, "function");
assert.strictEqual(typeof getExecutable, "function");
