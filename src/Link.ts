import * as fs from "fs";
import * as path from "path";

import { bold, dim, indent, join, NonEmptyArray, toError } from "./Helpers";
import { isWindows, Tool } from "./Parse";
import {
  absolutePathFromString,
  Cwd,
  LinkPath,
  NodeModulesBinPath,
  ShimPath,
  ToolPath,
} from "./PathHelpers";

type LinkResult = Error | "AllGood" | "Created";

type UnlinkResult = Error | "DidNothing" | "Removed";

type Strategy =
  | { tag: "Link"; linkPath: LinkPath }
  | { tag: "Shims"; items: NonEmptyArray<Shim> };

type Shim = {
  shimPath: ShimPath;
  code: string;
};

export function linkTool(
  cwd: Cwd,
  nodeModulesBinPath: NodeModulesBinPath,
  tool: Tool
): Error | string {
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
        `${linkPathPresentationString} -> ${tool.location.theToolPath.absolutePath}`
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
  cwd: Cwd,
  nodeModulesBinPath: NodeModulesBinPath,
  tool: Tool
): Error | string | undefined {
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
  cwd: Cwd,
  nodeModulesBinPath: NodeModulesBinPath,
  tool: Tool
): {
  linkPathPresentationString: string;
  what: string;
  strategy: Strategy;
} {
  const linkPath: LinkPath = {
    tag: "LinkPath",
    theLinkPath: absolutePathFromString(
      nodeModulesBinPath.theNodeModulesBinPath,
      tool.name
    ),
  };

  const relativeLinkPath = path.relative(
    cwd.path.absolutePath,
    linkPath.theLinkPath.absolutePath
  );

  const possiblyRelativeLinkPath = relativeLinkPath.startsWith("node_modules")
    ? relativeLinkPath
    : linkPath.theLinkPath.absolutePath;

  // istanbul ignore if
  if (isWindows) {
    return {
      linkPathPresentationString: `${possiblyRelativeLinkPath}{,.cmd,.ps1}`,
      what: "shims",
      strategy: {
        tag: "Shims",
        items: [
          {
            shimPath: makeShimPath(linkPath, ""),
            code: makeShScript(tool.location),
          },
          {
            shimPath: makeShimPath(linkPath, ".cmd"),
            code: makeCmdScript(tool.location),
          },
          {
            shimPath: makeShimPath(linkPath, ".ps1"),
            code: makePs1Script(tool.location),
          },
        ],
      },
    };
  }

  return {
    linkPathPresentationString: possiblyRelativeLinkPath,
    what: "link",
    strategy: { tag: "Link", linkPath },
  };
}

function symlink(tool: Tool, linkPath: LinkPath): LinkResult {
  try {
    if (
      fs.readlinkSync(linkPath.theLinkPath.absolutePath) ===
      tool.location.theToolPath.absolutePath
    ) {
      return "AllGood";
    }
  } catch {
    // Continue below.
  }

  try {
    fs.unlinkSync(linkPath.theLinkPath.absolutePath);
  } catch (unknownError) {
    const error = toError(unknownError);
    if (error.code !== "ENOENT") {
      return new Error(
        `Failed to remove old link for ${tool.name} at ${linkPath.theLinkPath.absolutePath}:\n${error.message}`
      );
    }
  }

  try {
    fs.symlinkSync(
      tool.location.theToolPath.absolutePath,
      linkPath.theLinkPath.absolutePath
    );
  } catch (unknownError) /* istanbul ignore next */ {
    const error = toError(unknownError);
    return new Error(
      `Failed to create link for ${tool.name} at ${linkPath.theLinkPath.absolutePath}:\n${error.message}`
    );
  }

  return "Created";
}

function removeSymlink(tool: Tool, linkPath: LinkPath): UnlinkResult {
  try {
    if (
      fs.readlinkSync(linkPath.theLinkPath.absolutePath) ===
      tool.location.theToolPath.absolutePath
    ) {
      fs.unlinkSync(linkPath.theLinkPath.absolutePath);
      return "Removed";
    }
  } catch (unknownError) {
    const error = toError(unknownError);
    // If the path exists but is something else, let it be.
    // If the path does not exist there’s nothing to do.
    // istanbul ignore if
    if (error.code !== "EINVAL" && error.code !== "ENOENT") {
      return new Error(
        `Failed to remove old link for ${tool.name} at ${linkPath.theLinkPath.absolutePath}:\n${error.message}`
      );
    }
  }
  return "DidNothing";
}

// istanbul ignore next
function symlinkShimWindows(
  tool: Tool,
  items: NonEmptyArray<Shim>
): LinkResult {
  try {
    if (
      items.every(
        ({ shimPath, code }) =>
          fs.readFileSync(shimPath.theShimPath.absolutePath, "utf8") === code
      )
    ) {
      return "AllGood";
    }
  } catch {
    // Continue below.
  }

  for (const { shimPath } of items) {
    try {
      fs.unlinkSync(shimPath.theShimPath.absolutePath);
    } catch (unknownError) {
      const error = toError(unknownError);
      if (error.code !== "ENOENT") {
        return new Error(
          `Failed to remove old shim for ${tool.name} at ${shimPath.theShimPath.absolutePath}:\n${error.message}`
        );
      }
    }
  }

  for (const { shimPath, code } of items) {
    try {
      fs.writeFileSync(shimPath.theShimPath.absolutePath, code);
    } catch (unknownError) {
      const error = toError(unknownError);
      return new Error(
        `Failed to create shim for ${tool.name} at ${shimPath.theShimPath.absolutePath}:\n${error.message}`
      );
    }
  }

  return "Created";
}

// istanbul ignore next
function removeSymlinkShimWindows(
  tool: Tool,
  items: Array<Shim>
): UnlinkResult {
  let didNothing = true;

  for (const { shimPath, code } of items) {
    try {
      if (fs.readFileSync(shimPath.theShimPath.absolutePath, "utf8") === code) {
        fs.unlinkSync(shimPath.theShimPath.absolutePath);
        didNothing = false;
      }
    } catch (unknownError) {
      const error = toError(unknownError);
      // If the path exists but isn’t a file, let it be.
      // If the path does not exists there’s nothing to do.
      if (error.code !== "EISDIR" && error.code !== "ENOENT") {
        return new Error(
          `Failed to remove old shim for ${tool.name} at ${shimPath.theShimPath.absolutePath}:\n${error.message}`
        );
      }
    }
  }

  return didNothing ? "DidNothing" : "Removed";
}

// istanbul ignore next
function makeShimPath(linkPath: LinkPath, suffix: string): ShimPath {
  return {
    tag: "ShimPath",
    theShimPath: {
      tag: "AbsolutePath",
      absolutePath: linkPath.theLinkPath.absolutePath + suffix,
    },
  };
}

// Windows-style paths works fine, at least in Git bash.
export function makeShScript(toolPath: ToolPath): string {
  return lf(`
#!/bin/sh
${join(
  toolPath.theToolPath.absolutePath
    .split(/(')/)
    .map((segment) =>
      segment === "" ? "" : segment === "'" ? "\\'" : `'${segment}'`
    ),
  ""
)} "$@"
`);
}

// Note: Paths on Windows cannot contain `"`.
export function makeCmdScript(toolPath: ToolPath): string {
  return crlf(`
@ECHO off
"${toolPath.theToolPath.absolutePath}" %*
`);
}

// The shebang is for PowerShell on unix: https://github.com/npm/cmd-shim/pull/34
export function makePs1Script(toolPath: ToolPath): string {
  return lf(`
#!/usr/bin/env pwsh
& '${toolPath.theToolPath.absolutePath.replace(/'/g, "''")}' $args
`);
}

function lf(string: string): string {
  return `${string.trim()}\n`;
}

function crlf(string: string): string {
  return lf(string).replace(/\n/g, "\r\n");
}
