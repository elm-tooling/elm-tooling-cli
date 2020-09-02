import * as fs from "fs";

import { findClosestElmTooling, isRecord } from "../helpers/mixed";
import { Asset, OSName, tools } from "../helpers/tools";

export default async function download(): Promise<number> {
  const osName = getOSName();
  if (osName instanceof Error) {
    console.error(osName.message);
    return 1;
  }

  const elmToolingPath = findClosestElmTooling();
  if (elmToolingPath === undefined) {
    console.error("No elm-tooling.json found. To create one: elm-tooling init");
    return 1;
  }

  console.error(elmToolingPath);

  let json: unknown = undefined;
  try {
    json = JSON.parse(fs.readFileSync(elmToolingPath, "utf-8"));
  } catch (error) {
    console.error(`Failed to read file as JSON:\n${(error as Error).message}`);
    return 1;
  }

  if (!isRecord(json)) {
    console.error(`Expected an object but got: ${JSON.stringify(json)}`);
    return 1;
  }

  const tools = "tools" in json ? json.tools : {};

  if (!isRecord(tools)) {
    console.error(
      `tools: Expected an object but got: ${JSON.stringify(json.tools)}`
    );
    return 1;
  }

  const [errors, assets] = partition(
    Object.entries(tools).map(([name, version]) => {
      const asset = parseAsset(osName, name, version);
      return typeof asset === "string"
        ? `tools[${JSON.stringify(name)}]: ${asset}`
        : asset;
    })
  );

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`\n- ${error}`);
    }
    console.error("\nDocs: https://github.com/lydell/elm-tooling.json");
    return 1;
  }

  if (assets.length === 0) {
    console.error(
      `tools: ${"tools" in json ? "Empty" : "Missing"}. Nothing to download.`
    );
    return 0;
  }

  console.error(`Downloading:`);
  console.error(
    assets
      .map(({ name, version, asset }) => `${name} ${version} (${asset.url})`)
      .join("\n")
  );
  return 0;
}

type NamedAsset = {
  name: string;
  version: string;
  asset: Asset;
};

function parseAsset(
  osName: OSName,
  name: string,
  version: unknown
): NamedAsset | string {
  if (typeof version !== "string") {
    return `Expected a version as a string but got: ${JSON.stringify(version)}`;
  }

  const versions = Object.prototype.hasOwnProperty.call(tools, name)
    ? tools[name]
    : undefined;

  if (versions === undefined) {
    return `Unknown tool`;
  }

  const os = Object.prototype.hasOwnProperty.call(versions, version)
    ? versions[version]
    : undefined;

  if (os === undefined) {
    return `Unknown version: ${version}`;
  }

  return { name, version, asset: os[osName] };
}

function getOSName(): OSName | Error {
  switch (process.platform) {
    case "linux":
      return "linux";
    case "darwin":
      return "mac";
    case "win32":
      return "windows";
    default:
      return new Error(
        `Sorry, your platform (${process.platform}) is not supported yet :(`
      );
  }
}

function partition<T>(items: Array<T | string>): [Array<string>, Array<T>] {
  const errors: Array<string> = [];
  const results: Array<T> = [];

  for (const item of items) {
    if (typeof item === "string") {
      errors.push(item);
    } else {
      results.push(item);
    }
  }

  return [errors, results];
}
