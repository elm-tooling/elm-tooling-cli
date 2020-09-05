import * as childProcess from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as https from "https";
import * as os from "os";
import * as path from "path";
import * as readline from "readline";
import type { Writable } from "stream";
import * as zlib from "zlib";

import { findClosestElmTooling, isRecord } from "../helpers/mixed";
import { Asset, AssetType, OSName, tools } from "../helpers/tools";

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

  const [errors, assets] = stringPartition(
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

  const elmHome = process.env.ELM_HOME || path.join(os.homedir(), ".elm");
  const elmToolingDir = path.join(elmHome, "elm-tooling");
  const needsDownload: Array<NamedAsset> = [];

  for (const { name, version, asset } of assets) {
    const binary = getBinaryPath(elmToolingDir, name, version);
    if (fs.existsSync(binary)) {
      console.error(`${name} ${version} already exists: ${binary}`);
    } else {
      fs.mkdirSync(path.dirname(binary), { recursive: true });
      needsDownload.push({ name, version, asset });
    }
  }

  if (needsDownload.length === 0) {
    return 0;
  }

  const progresses: Array<number | string> = needsDownload.map(() => 0);
  const firstDrawTime = Date.now();

  const draw = () => {
    console.error(
      needsDownload
        .map(({ name, version }, index) => {
          const progress = progresses[index];
          return `${
            typeof progress === "string"
              ? progress.padEnd(4)
              : Math.round(progress * 100)
                  .toString()
                  .padStart(3) + "%"
          } ${name} ${version}`;
        })
        .join("\n")
    );
  };

  const redraw = ({ force = false } = {}) => {
    // Without this time thing, you’ll see the progress go up to 100% and then
    // back to 0% again when using curl. It reports the progress per request –
    // even redirects.
    if (Date.now() - firstDrawTime > 1000 || force) {
      readline.moveCursor(process.stderr, 0, -needsDownload.length);
      draw();
    }
  };

  draw();

  const results = await Promise.all(
    needsDownload.map(({ name, version, asset }, index) =>
      downloadAndExtract(
        elmToolingDir,
        { name, version, asset },
        (percentage) => {
          progresses[index] = percentage;
          redraw();
        }
      ).catch((error: Error) => {
        progresses[index] = "ERR";
        redraw();
        return new Error(
          downloadAndExtractError(
            elmToolingDir,
            { name, version, asset },
            error
          )
        );
      })
    )
  );

  const downloadErrors = results.flatMap((result) =>
    result instanceof Error ? result : []
  );

  redraw({ force: true });

  for (const error of downloadErrors) {
    console.error(error.message);
  }

  return downloadErrors.length === 0 ? 0 : 1;
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

function stringPartition<T>(
  items: Array<T | string>
): [Array<string>, Array<T>] {
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

function getBinaryPath(elmToolingPath: string, name: string, version: string) {
  return path.join(elmToolingPath, name, version, name);
}

function downloadAndExtract(
  elmToolingDir: string,
  { name, version, asset }: NamedAsset,
  onProgress: (percentage: number) => void
): Promise<void> {
  return new Promise((resolve, reject): void => {
    const binary = getBinaryPath(elmToolingDir, name, version);

    const removeExtractedBeforeReject = (error: Error): void => {
      extract.destroy();
      try {
        fs.unlinkSync(binary);
        reject(error);
      } catch (removeErrorAny) {
        const removeError = removeErrorAny as Error & { code?: string };
        if (removeError.code === "ENOENT") {
          reject(error);
        } else {
          reject(new Error(`${error.message}\n${removeError.message}`));
        }
      }
    };

    const hash = crypto.createHash("sha256");

    const extract = extractFile({
      assetType: asset.type,
      file: binary,
      onError: reject,
      onSuccess: resolve,
    });

    // Allow `onError` for `extract` to fire before starting to download.
    process.nextTick(() => {
      downloadFile(asset.url, {
        onData: (chunk) => {
          hash.update(chunk);
          extract.write(chunk);
        },
        onProgress,
        onError: removeExtractedBeforeReject,
        onSuccess: () => {
          const digest = hash.digest("hex");
          if (digest === asset.hash) {
            extract.end();
          } else {
            removeExtractedBeforeReject(
              new Error(hashMismatch(digest, asset.hash))
            );
          }
        },
      });
    });
  });
}

function downloadAndExtractError(
  elmToolingDir: string,
  { name, version, asset }: NamedAsset,
  error: Error
) {
  return `
${name} ${version}:
${indent(
  `
< ${asset.url}
> ${getBinaryPath(elmToolingDir, name, version)}
${error.message}
  `.trim()
)}
  `.trim();
}

function hashMismatch(actual: string, expected: string) {
  return `
Hash mismatch:
  Expected: ${expected}
  Actual:   ${actual}
  `.trim();
}

function indent(string: string): string {
  return string.replace(/^/gm, "  ");
}

function downloadFile(
  url: string,
  {
    onData,
    onProgress,
    onError,
    onSuccess,
  }: {
    onData: (buffer: Buffer) => void;
    onProgress: (percentage: number) => void;
    onError: (error: Error & { code?: string }) => void;
    onSuccess: () => void;
  }
): void {
  let stderr = "";
  const errored: Array<string> = [];

  const onStderr = (chunk: Buffer): void => {
    stderr += chunk.toString();
    const matches = stderr.match(/\d+(?:\.\d+)?%/g) || [];
    if (matches.length > 0) {
      onProgress(Math.min(1, parseFloat(matches[matches.length - 1]) / 100));
    }
  };

  const onClose = (commandName: string) => (code: number): void => {
    if (errored.includes(commandName)) {
      return;
    } else if (code === 0) {
      onSuccess();
    } else {
      fs.writeFileSync("stderr.txt", stderr);
      onError(
        new Error(
          `${commandName} exited with non-zero exit code ${code}.\n${stderr
            .trim()
            // Remove curl’s progress bar remnants.
            .replace(/^[\s#O=-]+/g, "")}`
        )
      );
    }
  };

  const curl = childProcess.spawn("curl", ["-#fL", url]);
  curl.stdout.on("data", onData);
  curl.stderr.on("data", onStderr);
  curl.on("close", onClose("curl"));

  curl.on("error", (error: Error & { code?: string }) => {
    errored.push("curl");
    if (error.code === "ENOENT") {
      const wget = childProcess.spawn("wget", ["-O", "-", url]);
      wget.stdout.on("data", onData);
      wget.stderr.on("data", onStderr);
      wget.on("close", onClose("wget"));

      wget.on("error", (error: Error & { code?: string }) => {
        errored.push("wget");
        if (error.code === "ENOENT") {
          downloadFileNative(url, {
            onData,
            onProgress,
            onError,
            onSuccess,
          });
        } else {
          onError(error);
        }
      });
    } else {
      onError(error);
    }
  });
}

function downloadFileNative(
  url: string,
  {
    onData,
    onProgress,
    onError,
    onSuccess,
  }: {
    onData: (buffer: Buffer) => void;
    onProgress: (percentage: number) => void;
    onError: (error: Error & { code?: string }) => void;
    onSuccess: () => void;
  },
  maxRedirects = 50 // This is curl’s default.
) {
  const request = https.get(url, (response) => {
    switch (response.statusCode) {
      case 302: {
        const redirect = response.headers.location;
        if (redirect === undefined) {
          onError(new Error(`Got 302 without location header.`));
        } else if (maxRedirects <= 0) {
          onError(new Error(`Too many redirects.`));
        } else {
          downloadFileNative(
            redirect,
            {
              onData,
              onProgress,
              onError,
              onSuccess,
            },
            maxRedirects - 1
          );
        }
        break;
      }

      case 200: {
        const contentLength = parseInt(
          response.headers["content-length"] || "",
          10
        );
        let length = 0;

        response.on("data", (chunk: Buffer) => {
          length += chunk.length;
          onData(chunk);
          if (Number.isFinite(contentLength) && contentLength > 0) {
            onProgress(Math.min(1, length / contentLength));
          }
        });

        response.on("end", onSuccess);

        break;
      }

      default:
        onError(
          new Error(
            `Unexpected status code: ${response.statusCode ?? "unknown"}`
          )
        );
        break;
    }
  });

  request.on("error", onError);
}

function extractFile({
  assetType,
  file,
  onError,
  onSuccess,
}: {
  assetType: AssetType;
  file: string;
  onError: (error: Error) => void;
  onSuccess: () => void;
}): Writable {
  switch (assetType) {
    case "gz": {
      const gunzip = zlib.createGunzip();
      const write = fs.createWriteStream(file);
      gunzip.on("error", onError);
      write.on("error", onError);
      write.on("close", () => {
        // Make executable: `chmod +x`.
        fs.chmod(file, "755", (error) => {
          if (error === null) {
            onSuccess();
          } else {
            onError(error);
          }
        });
      });
      gunzip.pipe(write);
      return gunzip;
    }

    case "tgz": {
      const tar = childProcess.spawn("tar", [
        "xf",
        "-",
        "-C",
        path.dirname(file),
        path.basename(file),
      ]);
      let tarStderr = "";

      tar.on("error", (error: Error & { code?: string }) => {
        if (error.code === "ENOENT") {
          onError(
            new Error(
              `tar must be installed on your system and be in $PATH:\n${error.message}`
            )
          );
        }
        onError(error);
      });

      tar.stderr.on("data", (chunk: Buffer) => {
        tarStderr += chunk.toString();
      });

      tar.on("close", (code) => {
        if (code === 0) {
          onSuccess();
        } else {
          onError(
            new Error(
              `tar exited with non-zero exit code ${code}:\n${tarStderr.trim()}`
            )
          );
        }
      });

      return tar.stdin;
    }
  }
}
