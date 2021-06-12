/* eslint-disable jest/expect-expect */

import { run as runAllDownloads } from "../scripts/TestAllDownloads";
import { run as runGetExecutable } from "../scripts/TestGetExecutable";
import { run as runIntegration } from "../scripts/TestIntegration";

jest.setTimeout(20000);

// Wait a little bit after finishing the script to increase the chance of Jest
// printing its stuff below the script output.
function wrap(f: () => Promise<unknown>): () => Promise<void> {
  return async () => {
    await f();
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  };
}

const ENV_NAME = "SCRIPTS_COVERAGE";

if (ENV_NAME in process.env) {
  test("TestAllDownloads.ts", wrap(runAllDownloads));
  test("TestIntegration.ts", wrap(runIntegration));
  test("TestGetExecutable.ts", wrap(runGetExecutable));
} else {
  test(`Scripts.test.ts is a no-op unless the env var ${ENV_NAME} is set`, () => {
    // Do nothing
  });
}
