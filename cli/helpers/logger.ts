import * as readline from "readline";
import type { Writable } from "stream";

import type { Env } from "./mixed";

export type Logger = {
  log: (message: string) => void;
  error: (message: string) => void;
  progress: (message: string) => void;
};

let previousProgress: number | undefined = undefined;

export function makeLogger({
  env,
  stdout,
  stderr,
}: {
  env: Env;
  stdout: Writable;
  stderr: Writable;
}): Logger {
  const NO_COLOR = "NO_COLOR" in env;
  const handleColor = (string: string): string =>
    NO_COLOR ? string.replace(/\x1B\[\dm/g, "") : string;

  return {
    log(message) {
      previousProgress = undefined;
      stdout.write(`${handleColor(message)}\n`);
    },
    error(message) {
      previousProgress = undefined;
      stderr.write(`${handleColor(message)}\n`);
    },
    /* istanbul ignore next */
    progress(passedMessage) {
      const message = handleColor(passedMessage);
      if (previousProgress !== undefined) {
        readline.moveCursor(stdout, 0, -previousProgress);
      }
      previousProgress = message.split("\n").length;
      stdout.write(`${message}\n`);
    },
  };
}
