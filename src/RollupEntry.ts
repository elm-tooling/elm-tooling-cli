/* eslint-disable @typescript-eslint/explicit-function-return-type */

// This file is only used to get Rollup to output the files we want: One file
// per entrypoint, and one shared file.

export async function index() {
  return import("./index");
}

export async function getExecutable() {
  return import("./getExecutable");
}
