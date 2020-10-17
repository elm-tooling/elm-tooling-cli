import * as fs from "fs";
import * as path from "path";

import { bold, dim, indent } from "./mixed";
import { isWindows, Tool } from "./parse";

type LinkResult = "AllGood" | "Created" | Error;

type UnlinkResult = "DidNothing" | "Removed" | Error;

type Strategy =
  | { tag: "Link"; linkPath: string }
  | { tag: "Shims"; items: Array<[string, string]> };

export function linkTool(
  cwd: string,
  nodeModulesBinPath: string,
  tool: Tool
): string | Error {
  const { linkPathPresentationString, what, strategy } = linkHelper(
    cwd,
    nodeModulesBinPath,
    tool
  );

  const result = linkToolWithStrategy(tool, strategy);

  if (result instanceof Error) {
    return new Error(result.message);
  }

  switch (result) {
    case "AllGood":
      return `${bold(`${tool.name} ${tool.version}`)}: ${dim("all good")}`;

    case "Created":
      return `${bold(`${tool.name} ${tool.version}`)} ${what} created: ${dim(
        `${linkPathPresentationString} -> ${tool.absolutePath}`
      )}\n${indent(`To run: npx ${tool.name}`)}`;
  }
}

// Just like npm, these overwrite whatever links are already in
// `node_modules/.bin/`. Most likely it’s either old links from for example the
// `elm` npm package, or links from previous runs of this script.
function linkToolWithStrategy(tool: Tool, strategy: Strategy): LinkResult {
  switch (strategy.tag) {
    case "Link":
      return symlink(tool, strategy.linkPath);

    // istanbul ignore next
    case "Shims":
      return symlinkShimWindows(tool, strategy.items);
  }
}

export function unlinkTool(
  cwd: string,
  nodeModulesBinPath: string,
  tool: Tool
): string | Error | undefined {
  const { linkPathPresentationString, what, strategy } = linkHelper(
    cwd,
    nodeModulesBinPath,
    tool
  );

  const result = unlinkToolWithStrategy(tool, strategy);

  // istanbul ignore if
  if (result instanceof Error) {
    return new Error(result.message);
  }

  switch (result) {
    case "DidNothing":
      return undefined;

    case "Removed":
      return `${bold(`${tool.name} ${tool.version}`)} ${what} removed: ${dim(
        `${linkPathPresentationString}`
      )}`;
  }
}

// These only remove things that are created by elm-tooling itself (or seem to
// be). For example, if the user has installed elm-json with npm we shouldn’t
// remove that link.
function unlinkToolWithStrategy(tool: Tool, strategy: Strategy): UnlinkResult {
  switch (strategy.tag) {
    case "Link":
      return removeSymlink(tool, strategy.linkPath);

    // istanbul ignore next
    case "Shims":
      return removeSymlinkShimWindows(tool, strategy.items);
  }
}

function linkHelper(
  cwd: string,
  nodeModulesBinPath: string,
  tool: Tool
): {
  linkPathPresentationString: string;
  what: string;
  strategy: Strategy;
} {
  const linkPath = path.join(nodeModulesBinPath, tool.name);
  const relativeLinkPath = path.relative(cwd, linkPath);
  const possiblyRelativeLinkPath = relativeLinkPath.startsWith("node_modules")
    ? relativeLinkPath
    : linkPath;

  return isWindows
    ? // istanbul ignore next
      {
        linkPathPresentationString: `${possiblyRelativeLinkPath}{,.cmd,.ps1}`,
        what: "shims",
        strategy: {
          tag: "Shims",
          items: [
            [linkPath, makeShScript(tool.absolutePath)],
            [`${linkPath}.cmd`, makeCmdScript(tool.absolutePath)],
            [`${linkPath}.ps1`, makePs1Script(tool.absolutePath)],
          ],
        },
      }
    : {
        linkPathPresentationString: possiblyRelativeLinkPath,
        what: "link",
        strategy: { tag: "Link", linkPath },
      };
}

function symlink(tool: Tool, linkPath: string): LinkResult {
  try {
    if (fs.readlinkSync(linkPath) === tool.absolutePath) {
      return "AllGood";
    }
  } catch (_error) {
    // Continue below.
  }

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
    const error = errorAny as Error;
    return new Error(
      `Failed to create link for ${tool.name} at ${linkPath}:\n${error.message}`
    );
  }

  return "Created";
}

function removeSymlink(tool: Tool, linkPath: string): UnlinkResult {
  try {
    if (fs.readlinkSync(linkPath) === tool.absolutePath) {
      fs.unlinkSync(linkPath);
      return "Removed";
    }
  } catch (errorAny) {
    const error = errorAny as Error & { code?: string };
    // If the path exists but is something else, let it be.
    // If the path does not exist there’s nothing to do.
    // istanbul ignore if
    if (error.code !== "EINVAL" && error.code !== "ENOENT") {
      return new Error(
        `Failed to remove old link for ${tool.name} at ${linkPath}:\n${error.message}`
      );
    }
  }
  return "DidNothing";
}

// istanbul ignore next
function symlinkShimWindows(
  tool: Tool,
  items: Array<[string, string]>
): LinkResult {
  try {
    if (
      items.every(
        ([itemPath, content]) => fs.readFileSync(itemPath, "utf8") === content
      )
    ) {
      return "AllGood";
    }
  } catch (_error) {
    // Continue below.
  }

  for (const [itemPath] of items) {
    try {
      fs.unlinkSync(itemPath);
    } catch (errorAny) {
      const error = errorAny as Error & { code?: string };
      if (error.code !== "ENOENT") {
        return new Error(
          `Failed to remove old shim for ${tool.name} at ${itemPath}:\n${error.message}`
        );
      }
    }
  }

  for (const [itemPath, content] of items) {
    try {
      fs.writeFileSync(itemPath, content);
    } catch (errorAny) {
      const error = errorAny as Error;
      return new Error(
        `Failed to create shim for ${tool.name} at ${itemPath}:\n${error.message}`
      );
    }
  }

  return "Created";
}

// istanbul ignore next
function removeSymlinkShimWindows(
  tool: Tool,
  items: Array<[string, string]>
): UnlinkResult {
  let didNothing = true;

  for (const [itemPath, content] of items) {
    try {
      if (fs.readFileSync(itemPath, "utf8") === content) {
        fs.unlinkSync(itemPath);
        didNothing = false;
      }
    } catch (errorAny) {
      const error = errorAny as Error & { code?: string };
      // If the path exists but isn’t a file, let it be.
      // If the path does not exists there’s nothing to do.
      if (error.code !== "EISDIR" && error.code !== "ENOENT") {
        return new Error(
          `Failed to remove old shim for ${tool.name} at ${itemPath}:\n${error.message}`
        );
      }
    }
  }

  return didNothing ? "DidNothing" : "Removed";
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
