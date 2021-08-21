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

export type Json =
  | Array<Json>
  | boolean
  | number
  | string
  | { [key: string]: Json }
  | null
  | undefined;

// Like `JSON.stringify(json, null, 4)` but:
// - With a trailing newline.
// - Arrays of primitives are printed in a single line if they fit.
export function toJSON(json: Json): string {
  return `${toJSONHelper(json, 0, "")}\n`;
}

const MAX_WIDTH = 80;
const INDENT = 4;

function toJSONHelper(json: Json, level: number, prefix: string): string {
  const i = " ".repeat(INDENT * level);
  const i2 = " ".repeat(INDENT * (level + 1));
  if (Array.isArray(json)) {
    if (json.length === 0) {
      return "[]";
    }
    if (json.every((item) => typeof item !== "object" || item === null)) {
      const string = `[ ${json
        .map((item) => (item === undefined ? "null" : JSON.stringify(item)))
        .join(", ")} ]`;
      // -1 to account for commas.
      if (string.length <= MAX_WIDTH - INDENT * level - prefix.length - 1) {
        return string;
      }
    }
    return `[\n${json
      .map((item) => i2 + toJSONHelper(item, level + 1, ""))
      .join(",\n")}\n${i}]`;
  } else if (typeof json === "object" && json !== null) {
    const keys = Object.keys(json);
    if (keys.length === 0) {
      return "{}";
    }
    return `{\n${Object.entries(json)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => {
        const start = `${JSON.stringify(key)}: `;
        return `${i2}${start}${toJSONHelper(item, level + 1, start)}`;
      })
      .join(",\n")}\n${i}}`;
  } else {
    return json === undefined ? "null" : JSON.stringify(json);
  }
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

export function partitionMapNonEmpty<T, Left, Right>(
  items: NonEmptyArray<T>,
  f: (
    item: T,
    index: number,
    leftSoFar: Array<Left>,
    rightSoFar: Array<Right>
  ) => Either<Left, Right>
):
  | { tag: "Both"; left: NonEmptyArray<Left>; right: NonEmptyArray<Right> }
  | { tag: "OnlyLeft"; left: NonEmptyArray<Left> }
  | { tag: "OnlyRight"; right: NonEmptyArray<Right> } {
  const [left, right] = partitionMap(items, f);
  return !isNonEmptyArray(left)
    ? { tag: "OnlyRight", right: right as NonEmptyArray<Right> }
    : !isNonEmptyArray(right)
    ? { tag: "OnlyLeft", left }
    : { tag: "Both", left, right };
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

export const elmToolingJsonDocumentationLink = `${dim(
  "Specification:"
)}\n${indent("https://elm-tooling.github.io/elm-tooling-cli/spec")}`;

export function printNumErrors(numErrors: number): string {
  return `${bold(numErrors.toString())} error${numErrors === 1 ? "" : "s"}`;
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

export function mapNonEmptyArray<T, U>(
  array: NonEmptyArray<T>,
  f: (item: T, index: number) => U
): NonEmptyArray<U> {
  return array.map(f) as NonEmptyArray<U>;
}

/**
 * More type safe version of `Array#join`.
 */
export function join(array: Array<string>, separator: string): string {
  return array.join(separator);
}
