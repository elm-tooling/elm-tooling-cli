import * as fs from "fs";
import * as path from "path";

export type NonEmptyArray<T> = [T, ...T[]];

export type ElmTooling = {
  entrypoints?: NonEmptyArray<string>;
  tools?: {
    [name: string]: string;
  };
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function findClosestElmTooling(
  dir: string = process.cwd()
): string | undefined {
  const file = path.join(dir, "elm-tooling.json");
  return fs.existsSync(file)
    ? file
    : dir === path.parse(dir).root
    ? undefined
    : findClosestElmTooling(path.dirname(dir));
}
