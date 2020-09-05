import * as fs from "fs";
import * as path from "path";

import { bold, dim, findClosest, NonEmptyArray } from "../helpers/mixed";
import type { Tool } from "../helpers/parse";
import download from "./download";

export default async function postinstall(): Promise<number> {
  const result = await download();
  switch (result.tag) {
    case "Exit":
      return result.statusCode;
    case "Success":
      return linkTools(result.tools);
  }
}

function linkTools(tools: NonEmptyArray<Tool>): number {
  console.error(bold("Links:"));

  const nodeModulesPath = findClosest("node_modules");
  if (nodeModulesPath === undefined) {
    console.error(
      "No node_modules/ folder found. Install your npm dependencies before running this script."
    );
    return 1;
  }

  const nodeModulesBinPath = path.join(nodeModulesPath, ".bin");
  try {
    fs.mkdirSync(nodeModulesBinPath, { recursive: true });
  } catch (errorAny) {
    const error = errorAny as Error & { code?: number };
    console.error(`Failed to create ${nodeModulesBinPath}: ${error.message}`);
  }

  for (const tool of tools) {
    const linkPath = path.join(nodeModulesBinPath, tool.name);

    // Just like npm, just overwrite whatever links are already in
    // `node_modules/.bin/`. Most likely it’s either old links from for example
    // the `elm` npm package, or links from previous runs of this script.
    try {
      fs.unlinkSync(linkPath);
    } catch (errorAny) {
      const error = errorAny as Error & { code?: string };
      if (error.code !== "ENOENT") {
        console.error(
          `Failed to remove old link for ${tool.name} at ${linkPath}: ${error.message}`
        );
        return 1;
      }
    }

    try {
      fs.symlinkSync(tool.absolutePath, linkPath);
    } catch (errorAny) {
      const error = errorAny as Error & { code?: number };
      console.error(
        `Failed to create link for ${tool.name} at ${linkPath}: ${error.message}`
      );
      return 1;
    }

    console.error(
      `${bold(`${tool.name} ${tool.version}`)} link created: ${dim(
        `${linkPath} -> ${tool.absolutePath}`
      )}`
    );
  }

  return 0;
}
