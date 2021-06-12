/* eslint-disable @typescript-eslint/explicit-function-return-type */

export async function index() {
  return import("./index");
}

export async function getExecutable() {
  return import("./getExecutable");
}
