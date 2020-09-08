/* eslint-disable no-console */
import * as readline from "readline";

export type Logger = {
  log: (message: string) => void;
  error: (message: string) => void;
  progress: (message: string) => void;
};

let previousProgress: number | undefined = undefined;

export const logger: Logger = {
  log: (message) => {
    previousProgress = undefined;
    console.log(message);
  },
  error: (message) => {
    previousProgress = undefined;
    console.error(message);
  },
  progress: (message) => {
    if (previousProgress !== undefined) {
      readline.moveCursor(process.stderr, 0, -previousProgress);
    }
    previousProgress = message.split("\n").length;
    console.log(message);
  },
};
