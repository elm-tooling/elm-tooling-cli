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

    try {
      const target = fs.readlinkSync(linkPath);
      if (target === tool.absolutePath) {
        console.error(
          `${bold(`${tool.name} ${tool.version}`)} link already exists: ${dim(
            `${linkPath} -> ${target}`
          )}`
        );
        continue;
      } else {
        console.error(wrongSymlinkError(linkPath, target, tool.absolutePath));
        return 1;
      }
    } catch (errorAny) {
      const error = errorAny as Error & { code?: string };
      switch (error.code) {
        case "ENOENT":
          // Does not exist yet – move on.
          break;
        case "EINVAL":
          console.error(
            `${linkPath} already exists, but is not a link to ${tool.absolutePath}\n${error.message}\nRemove it and try again.`
          );
          return 1;
        default:
          console.error(`Failed to create ${linkPath}:\n${error.message}`);
          return 1;
      }
    }

    try {
      fs.symlinkSync(tool.absolutePath, linkPath);
    } catch (errorAny) {
      const error = errorAny as Error & { code?: number };
      console.error(`Failed to create ${linkPath}: ${error.message}`);
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

function wrongSymlinkError(linkPath: string, actual: string, expected: string) {
  return `
${linkPath} already exists, but links to something else.
Expected: ${expected}
Actual:   ${actual}
Remove it and try again.
`.trim();
}
