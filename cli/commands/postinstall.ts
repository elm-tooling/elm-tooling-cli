import * as fs from "fs";
import * as path from "path";

import type { Logger } from "../helpers/logger";
import { bold, dim, Env, findClosest, NonEmptyArray } from "../helpers/mixed";
import { isWindows, Tool } from "../helpers/parse";
import { symlinkShimWindows } from "../helpers/symlink-shim-windows";
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
  /* istanbul ignore if */
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
