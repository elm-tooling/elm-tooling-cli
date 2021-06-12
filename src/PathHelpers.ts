import * as fs from "fs";
import * as path from "path";

export type AbsolutePath = { tag: "AbsolutePath"; absolutePath: string };

export type Cwd = { tag: "Cwd"; path: AbsolutePath };

// elm-tooling.json
export type ElmToolingJsonPath = {
  tag: "ElmToolingJsonPath";
  theElmToolingJsonPath: AbsolutePath;
};

// elm.json
export type ElmJsonPath = {
  tag: "ElmJsonPath";
  theElmJsonPath: AbsolutePath;
};

// ~/.elm/elm-tooling/elm/0.19.1/elm
export type ToolPath = {
  tag: "ToolPath";
  theToolPath: AbsolutePath;
};

// node_modules/.bin/
export type NodeModulesBinPath = {
  tag: "NodeModulesBinPath";
  theNodeModulesBinPath: AbsolutePath;
};

// node_modules/.bin/elm
export type LinkPath = {
  tag: "LinkPath";
  theLinkPath: AbsolutePath;
};

// node_modules/.bin/elm.cmd (etc)
export type ShimPath = {
  tag: "ShimPath";
  theShimPath: AbsolutePath;
};

export function absolutePathFromString(
  from: AbsolutePath,
  pathString: string
): AbsolutePath {
  return {
    tag: "AbsolutePath",
    absolutePath: path.resolve(from.absolutePath, pathString),
  };
}

export function absoluteDirname({ absolutePath }: AbsolutePath): AbsolutePath {
  return {
    tag: "AbsolutePath",
    absolutePath: path.dirname(absolutePath),
  };
}

export function findClosest(
  name: string,
  absoluteDir: AbsolutePath
): AbsolutePath | undefined {
  const dir = absoluteDir.absolutePath;
  const entry = path.join(dir, name);
  return fs.existsSync(entry)
    ? { tag: "AbsolutePath", absolutePath: entry }
    : dir === path.parse(dir).root
    ? undefined
    : findClosest(name, absoluteDirname(absoluteDir));
}

export function getNodeModulesBinPath(
  elmToolingJsonPath: ElmToolingJsonPath
): NodeModulesBinPath {
  return {
    tag: "NodeModulesBinPath",
    theNodeModulesBinPath: absolutePathFromString(
      absoluteDirname(elmToolingJsonPath.theElmToolingJsonPath),
      path.join("node_modules", ".bin")
    ),
  };
}
