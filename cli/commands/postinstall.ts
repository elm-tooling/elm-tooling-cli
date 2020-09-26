import * as fs from "fs";
import * as path from "path";

import type { Logger } from "../helpers/logger";
import {
  bold,
  dim,
  Env,
  EXECUTABLE,
  findClosest,
  NonEmptyArray,
} from "../helpers/mixed";
import { isWindows, Tool } from "../helpers/parse";
import download from "./download";

export default async function postinstall(
  cwd: string,
  env: Env,
  logger: Logger
): Promise<number> {
  if ("NO_ELM_TOOLING_POSTINSTALL" in env) {
    return 0;
  }

  const result = await download(cwd, env, logger);

  switch (result.tag) {
    case "Exit":
      return result.statusCode;
    case "Success":
      return linkTools(cwd, logger, result.tools);
  }
}

function linkTools(
  cwd: string,
  logger: Logger,
  tools: NonEmptyArray<Tool>
): number {
  const nodeModulesPath = findClosest("node_modules", cwd);
  // istanbul ignore if
  if (nodeModulesPath === undefined) {
    logger.error(
      "No node_modules/ folder found. Install your npm dependencies before running this script."
    );
    return 1;
  }

  const nodeModulesBinPath = path.join(nodeModulesPath, ".bin");
  try {
    fs.mkdirSync(nodeModulesBinPath, { recursive: true });
  } catch (errorAny) {
    const error = errorAny as Error & { code?: number };
    logger.error(`Failed to create ${nodeModulesBinPath}:\n${error.message}`);
    return 1;
  }

  for (const tool of tools) {
    const linkPath = path.join(nodeModulesBinPath, tool.name);

    // Just like npm, these overwrite whatever links are already in
    // `node_modules/.bin/`. Most likely it’s either old links from for example
    // the `elm` npm package, or links from previous runs of this script.
    const [linkPathPresentationString, what] = isWindows
      ? // istanbul ignore next
        [symlinkShimWindows(tool, linkPath), "shims"]
      : [symlink(tool, linkPath), "link"];

    if (linkPathPresentationString instanceof Error) {
      logger.error(linkPathPresentationString.message);
      return 1;
    }

    logger.log(
      `${bold(`${tool.name} ${tool.version}`)} ${what} created: ${dim(
        `${linkPathPresentationString} -> ${tool.absolutePath}`
      )}`
    );
  }

  return 0;
}

function symlink(tool: Tool, linkPath: string): string | Error {
  try {
    fs.unlinkSync(linkPath);
  } catch (errorAny) {
    const error = errorAny as Error & { code?: string };
    if (error.code !== "ENOENT") {
      return new Error(
        `Failed to remove old link for ${tool.name} at ${linkPath}:\n${error.message}`
      );
    }
  }

  try {
    fs.symlinkSync(tool.absolutePath, linkPath);
  } catch (errorAny) /* istanbul ignore next */ {
    const error = errorAny as Error & { code?: number };
    return new Error(
      `Failed to create link for ${tool.name} at ${linkPath}:\n${error.message}`
    );
  }

  return linkPath;
}

// istanbul ignore next
function symlinkShimWindows(tool: Tool, linkPath: string): string | Error {
  const shLinkPath = linkPath;
  const cmdLinkPath = `${linkPath}.cmd`;
  const ps1LinkPath = `${linkPath}.ps1`;
  const linkPathPresentationString = `${linkPath}{,.cmd,.ps1}`;

  const shScript = makeShScript(tool.absolutePath);
  const cmdScript = makeCmdScript(tool.absolutePath);
  const ps1Script = makePs1Script(tool.absolutePath);

  try {
    fs.unlinkSync(shLinkPath);
    fs.unlinkSync(cmdLinkPath);
    fs.unlinkSync(ps1LinkPath);
  } catch (errorAny) {
    const error = errorAny as Error & { code?: string };
    if (error.code !== "ENOENT") {
      return new Error(
        `Failed to remove old shims for ${tool.name} at ${linkPathPresentationString}:\n${error.message}`
      );
    }
  }

  try {
    fs.writeFileSync(shLinkPath, shScript);
    fs.chmodSync(shLinkPath, EXECUTABLE);
    fs.writeFileSync(cmdLinkPath, cmdScript);
    fs.chmodSync(cmdLinkPath, EXECUTABLE);
    fs.writeFileSync(ps1LinkPath, ps1Script);
    fs.chmodSync(ps1LinkPath, EXECUTABLE);
  } catch (errorAny) {
    const error = errorAny as Error & { code?: number };
    return new Error(
      `Failed to create shims for ${tool.name} at ${linkPathPresentationString}:\n${error.message}`
    );
  }

  return linkPathPresentationString;
}

// Windows-style paths works fine, at least in Git bash.
export function makeShScript(toolAbsolutePath: string): string {
  return lf(`
#!/bin/sh
${toolAbsolutePath
  .split(/(')/)
  .map((segment) =>
    segment === "" ? "" : segment === "'" ? "\\'" : `'${segment}'`
  )
  .join("")} "$@"
`);
}

// Note: Paths on Windows cannot contain `"`.
export function makeCmdScript(toolAbsolutePath: string): string {
  return crlf(`
@ECHO off
"${toolAbsolutePath}" %*
`);
}

// The shebang is for PowerShell on unix: https://github.com/npm/cmd-shim/pull/34
export function makePs1Script(toolAbsolutePath: string): string {
  return lf(`
#!/usr/bin/env pwsh
& '${toolAbsolutePath.replace(/'/g, "''")}' $args
`);
}

function lf(string: string): string {
  return `${string.trim()}\n`;
}

function crlf(string: string): string {
  return lf(string).replace(/\n/g, "\r\n");
}
