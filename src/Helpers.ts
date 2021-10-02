import type { Readable, Writable } from "stream";

export type NonEmptyArray<T> = [T, ...Array<T>];

export type ElmTooling = {
  entrypoints?: NonEmptyArray<string>;
  tools?: {
    [name: string]: string;
  };
};

export const KNOWN_FIELDS: Array<keyof ElmTooling> = ["entrypoints", "tools"];

export type Env = Record<string, string | undefined>;

export type ReadStream = Readable & {
  isTTY: boolean;
  setRawMode: (mode: boolean) => void;
};

export type WriteStream = Writable & {
  isTTY: boolean;
};

export function toJSON(json: unknown): string {
  return `${JSON.stringify(json, null, 4)}\n`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type Either<Left, Right> =
  | { tag: "Left"; value: Left }
  | { tag: "Right"; value: Right };

export function partitionMap<T, Left, Right>(
  items: Array<T>,
  f: (
    item: T,
    index: number,
    leftSoFar: Array<Left>,
    rightSoFar: Array<Right>
  ) => Either<Left, Right>
): [Array<Left>, Array<Right>] {
  const left: Array<Left> = [];
  const right: Array<Right> = [];

  for (const [index, item] of items.entries()) {
    const either = f(item, index, left, right);
    switch (either.tag) {
      case "Left":
        left.push(either.value);
        break;
      case "Right":
        right.push(either.value);
        break;
    }
  }

  return [left, right];
}

export const HIDE_CURSOR = "\x1B[?25l";
export const SHOW_CURSOR = "\x1B[?25h";
export const RESET_COLOR = "\x1B[0m";

export function bold(string: string): string {
  return `${RESET_COLOR}\x1B[1m${string}${RESET_COLOR}`;
}

export function dim(string: string): string {
  return `${RESET_COLOR}\x1B[2m${string}${RESET_COLOR}`;
}

export function removeColor(string: string): string {
  return string.replace(/\x1B\[\dm/g, "");
}

export function indent(string: string): string {
  return string.replace(/^/gm, "    ");
}

export function printNumErrors(numErrors: number): string | undefined {
  return numErrors === 1 ? undefined : `${bold(numErrors.toString())} errors`;
}

// This can be replaced with `Array.prototype.flatMap` once Node.js is EOL
// 2021-04-30 and support for Node.js 10 is dropped.
export function flatMap<T, U>(
  array: Array<T>,
  callback: (value: T, index: number, array: Array<T>) => Array<U> | U
): Array<U> {
  const results: Array<U> = [];
  for (const [index, item] of array.entries()) {
    const result = callback(item, index, array);
    if (Array.isArray(result)) {
      results.push(...result);
    } else {
      results.push(result);
    }
  }
  return results;
}

// This can be replaced with `Object.fromEntries` once Node.js is EOL
// 2021-04-30 and support for Node.js 10 is dropped.
export function fromEntries<T>(
  entries: Iterable<readonly [number | string, T]>
): { [k: string]: T } {
  const result: { [k: string]: T } = {};
  for (const [key, value] of entries) {
    result[key] = value;
  }
  return result;
}

export function split(string: string, regex: RegExp): NonEmptyArray<string> {
  return string.split(regex) as NonEmptyArray<string>;
}

export function getOwn<T>(
  record: Record<string, T>,
  key: string
): T | undefined {
  return Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

export function isNonEmptyArray<T>(array: Array<T>): array is NonEmptyArray<T> {
  return array.length >= 1;
}

/**
 * More type safe version of `Array#join`.
 */
export function join(array: Array<string>, separator: string): string {
  return array.join(separator);
}

export function toError(arg: unknown): NodeJS.ErrnoException {
  return toError.jestWorkaround(arg);
}

// Workaround for https://github.com/facebook/jest/issues/2549
// In the tests we set this to always return `arg as Error`.
// istanbul ignore next
toError.jestWorkaround = (arg: unknown): NodeJS.ErrnoException =>
  arg instanceof Error
    ? arg
    : new Error(`Caught error not instanceof Error: ${String(arg)}`);
