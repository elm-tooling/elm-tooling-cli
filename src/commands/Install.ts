import * as childProcess from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";
import * as readline from "readline";
import * as zlib from "zlib";

import {
  bold,
  dim,
  Env,
  flatMap,
  indent,
  isNonEmptyArray,
  join,
  printNumErrors,
  removeColor,
  toError,
} from "../Helpers";
import {
  AssetType,
  KNOWN_TOOL_NAMES,
  KNOWN_TOOLS,
  KnownToolNames,
} from "../KnownTools";
import { linkTool, unlinkTool } from "../Link";
import type { Logger } from "../Logger";
import {
  findReadAndParseElmToolingJson,
  getToolThrowing,
  isWindows,
  makeTool,
  printParseErrors,
  Tool,
  Tools,
  validateFileExists,
} from "../Parse";
import {
  absoluteDirname,
  AbsolutePath,
  absolutePathFromString,
  Cwd,
  ElmToolingJsonPath,
  getNodeModulesBinPath,
  NodeModulesBinPath,
} from "../PathHelpers";

const EMPTY_STDERR = dim("(empty stderr)");

export async function install(
  cwd: Cwd,
  env: Env,
  logger: Logger
): Promise<number> {
  if ("NO_ELM_TOOLING_INSTALL" in env) {
    return 0;
  }

  const parseResult = findReadAndParseElmToolingJson(cwd, env);

  switch (parseResult.tag) {
    case "ElmToolingJsonNotFound":
      logger.error(parseResult.message);
      return 1;

    case "ReadAsJsonObjectError":
      logger.error(
        bold(parseResult.elmToolingJsonPath.theElmToolingJsonPath.absolutePath)
      );
      logger.error("");
      logger.error(printParseErrors(parseResult.errors));
      return 1;

    case "Parsed": {
      if (parseResult.tools === undefined) {
        return removeAllTools(
          cwd,
          env,
          logger,
          parseResult.platform,
          parseResult.elmToolingJsonPath,
          "missing"
        );
      }

      const { tools } = parseResult;

      if (
        tools.existing.length === 0 &&
        tools.missing.length === 0 &&
        tools.unsupported.length === 0
      ) {
        return removeAllTools(
          cwd,
          env,
          logger,
          parseResult.platform,
          parseResult.elmToolingJsonPath,
          "empty"
        );
      }

      return installTools(
        cwd,
        env,
        logger,
        parseResult.elmToolingJsonPath,
        parseResult.platform,
        tools
      );
    }
  }
}

async function installTools(
  cwd: Cwd,
  env: Env,
  logger: Logger,
  elmToolingJsonPath: ElmToolingJsonPath,
  platform: string,
  tools: Tools
): Promise<number> {
  const nodeModulesBinPath = getNodeModulesBinPath(elmToolingJsonPath);

  try {
    fs.mkdirSync(nodeModulesBinPath.theNodeModulesBinPath.absolutePath, {
      recursive: true,
    });
  } catch (unknownError) {
    const error = toError(unknownError);
    logger.error(bold(elmToolingJsonPath.theElmToolingJsonPath.absolutePath));
    logger.error(
      `Failed to create ${nodeModulesBinPath.theNodeModulesBinPath.absolutePath}:\n${error.message}`
    );
    return 1;
  }

  for (const tool of tools.missing) {
    const dir = absoluteDirname(tool.location.theToolPath);
    try {
      fs.mkdirSync(dir.absolutePath, { recursive: true });
    } catch (unknownError) {
      const error = toError(unknownError);
      logger.error(bold(elmToolingJsonPath.theElmToolingJsonPath.absolutePath));
      logger.error(`Failed to create ${dir.absolutePath}:\n${error.message}`);
      return 1;
    }
  }

  const isInteractive = logger.raw.stdout.isTTY;

  const previousProgress = new Map<number, string>();

  const updateStatusLine = (
    tool: Tool,
    progress: number | string,
    index: number
  ): void => {
    const formattedProgress = formatProgress(progress);
    const previous = previousProgress.get(index);
    if (previous === formattedProgress) {
      return;
    }
    previousProgress.set(index, formattedProgress);
    const moveCursor = previous !== undefined && isInteractive;
    if (moveCursor) {
      readline.moveCursor(logger.raw.stdout, 0, -tools.missing.length + index);
    }
    logger.log(`${bold(formattedProgress)} ${tool.name} ${tool.version}`);
    if (moveCursor) {
      readline.moveCursor(
        logger.raw.stdout,
        0,
        tools.missing.length - index - 1
      );
    }
  };

  logger.log(bold(elmToolingJsonPath.theElmToolingJsonPath.absolutePath));
  for (const [index, tool] of tools.missing.entries()) {
    updateStatusLine(tool, 0, index);
  }

  const presentNames = [
    ...tools.missing,
    ...tools.existing,
    ...tools.unsupported,
  ].map(({ name }) => name);
  const toolsToRemove = KNOWN_TOOL_NAMES.filter(
    (name) => !presentNames.includes(name)
  );

  const results: Array<Error | string | undefined> = [
    ...(await Promise.all(
      tools.missing.map((tool, index) =>
        downloadAndExtract(env, tool, (percentage) => {
          updateStatusLine(tool, percentage, index);
        })
          .then(() => {
            updateStatusLine(tool, 1, index);
            return linkTool(cwd, nodeModulesBinPath, tool);
          })
          .catch((error: Error) => {
            updateStatusLine(tool, "ERR!", index);
            return new Error(downloadAndExtractError(tool, error));
          })
      )
    )),

    ...tools.existing.map((tool) => linkTool(cwd, nodeModulesBinPath, tool)),

    ...removeTools(cwd, env, platform, nodeModulesBinPath, toolsToRemove),

    ...tools.unsupported.map(
      (tool) =>
        `${bold(
          `${tool.name} ${tool.version}`
        )}: Skipped because not supported on your platform, ${platform}\n${indent(
          `${dim(
            `Supported platforms: ${join(tool.supportedPlatforms, ", ")}`
          )}${
            isNonEmptyArray(tool.supportedVersions)
              ? tool.supportedVersions.length === 1
                ? `\nThis version supports your platform, though: ${bold(
                    tool.supportedVersions[0]
                  )}`
                : `\nThese versions support your platform, though: ${bold(
                    join(tool.supportedVersions, ", ")
                  )}`
              : ""
          }`
        )}`
    ),
  ];

  return printResults(logger, results);
}

function printResults(
  logger: Logger,
  results: Array<Error | string | undefined>
): number {
  const messages = flatMap(results, (result) =>
    typeof result === "string" ? result : []
  );

  const installErrors = flatMap(results, (result) =>
    result instanceof Error ? result : []
  );

  if (isNonEmptyArray(messages)) {
    logger.log(join(messages, "\n"));
  }

  if (isNonEmptyArray(installErrors)) {
    logger.error("");
    logger.error(
      join(
        flatMap(
          [
            printNumErrors(installErrors.length),
            ...installErrors.map((error) => error.message),
          ],
          (item) => (item === undefined ? [] : [item])
        ),
        "\n\n"
      )
    );
    return 1;
  }

  return 0;
}

function formatProgress(progress: number | string): string {
  return typeof progress === "string"
    ? progress.padEnd(4)
    : `${Math.round(progress * 100)
        .toString()
        .padStart(3)}%`;
}

function removeAllTools(
  cwd: Cwd,
  env: Env,
  logger: Logger,
  platform: string,
  elmToolingJsonPath: ElmToolingJsonPath,
  what: string
): number {
  logger.log(bold(elmToolingJsonPath.theElmToolingJsonPath.absolutePath));
  const message = `The "tools" field is ${what}. To add tools: elm-tooling tools`;

  const nodeModulesBinPath = getNodeModulesBinPath(elmToolingJsonPath);

  const results = removeTools(
    cwd,
    env,
    platform,
    nodeModulesBinPath,
    KNOWN_TOOL_NAMES
  );

  if (results.every((result) => result === undefined)) {
    logger.log(message);
    return 0;
  }

  return printResults(logger, results);
}

function removeTools(
  cwd: Cwd,
  env: Env,
  platform: string,
  nodeModulesBinPath: NodeModulesBinPath,
  names: Array<KnownToolNames>
): Array<Error | string | undefined> {
  return flatMap(names, (name) => {
    const versions = KNOWN_TOOLS[name];
    return Object.entries(versions).map(([version, platformAssets]) => {
      const asset = platformAssets[platform];
      if (asset === undefined) {
        return undefined;
      }
      const tool = makeTool(cwd, env, name, version, asset);
      return unlinkTool(cwd, nodeModulesBinPath, tool);
    });
  });
}

async function downloadAndExtract(
  env: Env,
  tool: Tool,
  onProgress: (percentage: number) => void
): Promise<void> {
  return new Promise((resolve, reject): void => {
    const removeExtractedAndReject = (error: Error): void => {
      try {
        hash.destroy();
        extractor.destroy();
        downloader.kill();
        fs.unlinkSync(tool.location.theToolPath.absolutePath);
        reject(error);
      } catch (unknownRemoveError) {
        const removeError = toError(unknownRemoveError);
        if (removeError.code === "ENOENT") {
          reject(error);
        } else {
          reject(new Error(`${error.message}\n\n${removeError.message}`));
        }
      }
    };

    const hash = crypto.createHash("sha256");

    const extractor = extractFile({
      env,
      assetType: tool.asset.type,
      file: tool.location.theToolPath,
      onError: removeExtractedAndReject,
      onSuccess: resolve,
    });

    let fileSize = 0;

    const downloader = downloadFile(env, tool.asset.url, {
      onData: (chunk) => {
        hash.update(chunk);
        extractor.write(chunk);
        fileSize += chunk.byteLength;
      },
      onProgress,
      onError: removeExtractedAndReject,
      onSuccess: (usedCommand) => {
        const digest = hash.digest("hex");
        if (fileSize !== tool.asset.fileSize) {
          removeExtractedAndReject(
            new Error(
              mismatchError(
                "number of bytes",
                usedCommand,
                fileSize,
                tool.asset.fileSize
              )
            )
          );
        } else if (digest !== tool.asset.hash) {
          removeExtractedAndReject(
            new Error(
              mismatchError("SHA256 hash", usedCommand, digest, tool.asset.hash)
            )
          );
        } else {
          extractor.end();
        }
      },
    });
  });
}

function downloadAndExtractError(tool: Tool, error: Error): string {
  return `
${bold(`${tool.name} ${tool.version}`)}
${indent(
  `
${dim(`< ${tool.asset.url}`)}
${dim(`> ${tool.location.theToolPath.absolutePath}`)}

${error.message}
  `.trim()
)}
  `.trim();
}

function downloadAndExtractSimpleError(tool: Tool, error: Error): string {
  return `
Failed to download:
< ${tool.asset.url}
> ${tool.location.theToolPath.absolutePath}
${error.message}
  `.trim();
}

function mismatchError(
  expectedString: string,
  usedCommand: Command,
  actual: number | string,
  expected: number | string
): string {
  const extra =
    typeof usedCommand === "string"
      ? ""
      : `Do you have a config file or environment variables set for ${usedCommand.spawnfile}?`;
  return `
The downloaded file does not have the expected ${expectedString}!
Expected: ${expected}
Actual:   ${actual}

- Probably, something in your environment messes with the download.
- Worst case, someone has replaced the executable with something malicious!

This happened when executing:
${commandToString(usedCommand)}

${extra}
  `.trim();
}

type SpawnCommand = {
  spawnfile: string;
  spawnargs: Array<string>;
};

type Command = SpawnCommand | string;

function commandToString(command: Command): string {
  // `spawnargs` actually contains `spawnfile` too.
  return typeof command === "string"
    ? command
    : command.spawnargs.map((arg) => (arg === "" ? '""' : arg)).join(" ");
}

function spawn(
  env: Env,
  command: string,
  args: ReadonlyArray<string>
): childProcess.ChildProcessWithoutNullStreams {
  const { PATH = process.env.PATH } = env;
  return childProcess.spawn(
    command,
    args,
    isWindows && PATH !== undefined
      ? { env: { ...env, PATH: adjustPathForWindows(PATH) } }
      : {}
  );
}

// Git Bash ships with GNU `tar` puts its own stuff first in `$PATH`. But we
// want to run the (BSD) `tar` that ships with Windows, since it supports .zip
// files and handles absolute paths differently. For consistency, we use this
// for _all_ spawns, so that we _always_ use Windows’ own `curl` instead of Git
// Bash’s `curl`.
function adjustPathForWindows(pathString: string): string {
  const system32 = [];
  const rest = [];
  for (const part of pathString.split(path.delimiter)) {
    if (part.toLowerCase().includes("system32")) {
      system32.push(part);
    } else {
      rest.push(part);
    }
  }
  return join([...system32, ...rest], path.delimiter);
}

export function downloadFile(
  env: Env,
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
    onSuccess: (usedCommand: Command) => void;
  }
): { kill: () => void } {
  let stderr = "";
  const errored: Array<string> = [];

  const onStderr = (chunk: Buffer): void => {
    stderr += chunk.toString();
    // Extract progress percentage from curl/wget.
    const matches = stderr.match(/\d+(?:[.,]\d+)?%/g) ?? [];
    if (isNonEmptyArray(matches)) {
      callOnProgressIfReasonable(
        parseFloat((matches[matches.length - 1] as string).replace(",", ".")) /
          100,
        onProgress
      );
    }
  };

  const onClose =
    (command: SpawnCommand) =>
    (code: number | null, signal: NodeJS.Signals | null): void => {
      if (errored.includes(command.spawnfile)) {
        return;
      } else if (code === 0) {
        onSuccess(command);
      } else {
        const trimmed = stderr
          .trim()
          // Remove curl’s progress bar remnants.
          .replace(/^[\s#O=-]+/g, "");
        onError(
          new Error(
            `${commandToString(
              command
            )}\nThe above command exited with ${exitReason(code, signal)}:\n${
              trimmed === "" ? EMPTY_STDERR : trimmed
            }`
          )
        );
      }
    };

  // `-w ""` overrides `-w "\n"` which people might have in their .curlrc due to this:
  // https://stackoverflow.com/a/14614203/2010616
  // Otherwise they’ll get a byte/hash mismatch due to the extra newline.
  const curl = spawn(env, "curl", ["-#fLw", "", url]);
  let toKill: { kill: () => void } = curl;
  curl.stdout.on("data", onData);
  curl.stderr.on("data", onStderr);
  curl.on("close", onClose(curl));

  curl.on("error", (curlError: Error & { code?: string }) => {
    errored.push(curl.spawnfile);
    if (curlError.code === "ENOENT") {
      const wget = spawn(env, "wget", ["-O", "-", url]);
      toKill = wget;
      wget.stdout.on("data", onData);
      wget.stderr.on("data", onStderr);
      wget.on("close", onClose(wget));

      wget.on("error", (wgetError: Error & { code?: string }) => {
        errored.push(wget.spawnfile);
        if (wgetError.code === "ENOENT") {
          toKill = downloadFileNative(url, {
            onData,
            onProgress,
            onError,
            onSuccess,
          });
        } else {
          onError(wgetError);
        }
      });
    } else {
      onError(curlError);
    }
  });

  return {
    kill: () => {
      toKill.kill();
    },
  };
}

const PROGRESS_UPDATES_PER_SECOND = 50;

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
    onSuccess: (usedCommand: Command) => void;
  },
  maxRedirects = 50 // This is curl’s default.
): { kill: () => void } {
  let toKill = {
    kill: () => {
      request.destroy();
    },
  };

  const usedCommand = `require("https").get(${JSON.stringify(url)})`;
  const errorPrefix = `${usedCommand}\nThe above call errored: `;

  const request = https.get(url, (response) => {
    switch (response.statusCode) {
      case 302: {
        const redirect = response.headers.location;
        if (redirect === undefined) {
          onError(new Error(`${errorPrefix}Got 302 without location header.`));
        } else if (maxRedirects <= 0) {
          onError(new Error(`${errorPrefix}Too many redirects.`));
        } else {
          toKill = downloadFileNative(
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
          response.headers["content-length"] ?? "",
          10
        );
        let length = 0;
        let lastOnProgress = Date.now();

        response.on("data", (chunk: Buffer) => {
          length += chunk.length;
          onData(chunk);
          const now = Date.now();
          if (
            Number.isFinite(contentLength) &&
            contentLength > 0 &&
            now - lastOnProgress >= 1000 / PROGRESS_UPDATES_PER_SECOND
          ) {
            lastOnProgress = now;
            callOnProgressIfReasonable(length / contentLength, onProgress);
          }
        });

        response.on("end", () => {
          onSuccess(usedCommand);
        });

        break;
      }

      default:
        onError(
          new Error(
            `${errorPrefix}Unexpected status code: ${
              response.statusCode ?? "unknown"
            }`
          )
        );
        break;
    }
  });

  request.on("error", onError);

  return {
    kill: () => {
      toKill.kill();
    },
  };
}

type MiniWritable = {
  destroy: () => void;
  write: (chunk: Buffer) => void;
  end: () => void;
};

function extractFile({
  env,
  assetType,
  file,
  onError,
  onSuccess,
}: {
  env: Env;
  assetType: AssetType;
  file: AbsolutePath;
  onError: (error: Error) => void;
  onSuccess: () => void;
}): MiniWritable {
  switch (assetType) {
    case "gz": {
      const gunzip = zlib.createGunzip();
      const write = fs.createWriteStream(file.absolutePath, {
        // Make executable.
        mode: 0o755,
      });
      gunzip.on("error", onError);
      write.on("error", onError);
      write.on("close", onSuccess);
      gunzip.pipe(write);
      return gunzip;
    }

    case "tgz":
      return extractTar({ env, input: "-", file, onError, onSuccess });

    // GNU tar does not support zip files, but only Windows uses zip files and
    // Windows comes with BSD tar which does support them. This could have used
    // the exact same code as for `tgz`, but it somehow fails on Windows:
    // https://stackoverflow.com/questions/63783342/windows-using-tar-to-unzip-zip-from-stdin-works-in-terminal-but-not-in-node-js
    // Workaround: Save the zip to disk, extract it and remove the zip again.
    case "zip": {
      const temp = `${file.absolutePath}.zip`;
      const write = fs.createWriteStream(temp);
      let toDestroy: MiniWritable = write;

      let cleanup = (): Error | undefined => {
        // If the caller runs `.destroy()` after we’ve already run `cleanup`,
        // don’t run the cleanup procedure again: If the cleanup succeeded
        // there’s nothing to clean; if it failed, running it again will just
        // fail again.
        cleanup = () => undefined;
        try {
          fs.unlinkSync(temp);
          return undefined;
        } catch (unknownError) {
          const error = toError(unknownError);
          return error.code === "ENOENT" ? undefined : error;
        }
      };

      write.on("error", onError);

      write.on("close", () => {
        toDestroy = extractTar({
          env,
          input: temp,
          file,
          onError: (error) => {
            const cleanupError = cleanup();
            onError(
              cleanupError === undefined
                ? error
                : new Error(`${error.message}\n\n${cleanupError.message}`)
            );
          },
          onSuccess: () => {
            const cleanupError = cleanup();
            if (cleanupError === undefined) {
              onSuccess();
            } else {
              onError(cleanupError);
            }
          },
        });
      });

      return {
        destroy: () => {
          toDestroy.destroy();
          const cleanupError = cleanup();
          if (cleanupError !== undefined) {
            // If cleanup fails, throw the error just like `.destroy()` can.
            throw cleanupError;
          }
        },
        write: (chunk) => write.write(chunk),
        end: () => {
          write.end();
        },
      };
    }
  }
}

function extractTar({
  env,
  input,
  file,
  onError,
  onSuccess,
}: {
  env: Env;
  input: string;
  file: AbsolutePath;
  onError: (error: Error) => void;
  onSuccess: () => void;
}): MiniWritable {
  const tar = spawn(env, "tar", [
    "zxf",
    input,
    "-C",
    path.dirname(file.absolutePath),
    path.basename(file.absolutePath),
  ]);
  let stderr = "";

  tar.on("error", (error: Error & { code?: string }) => {
    if (error.code === "ENOENT") {
      onError(
        new Error(
          `tar must be installed on your system and be in ${
            isWindows ? "%PATH%" : "$PATH"
          }:\n${error.message}`
        )
      );
    } else {
      onError(error);
    }
  });

  tar.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  tar.on("close", (code, signal) => {
    if (code === 0) {
      onSuccess();
    } else {
      const trimmed = stderr.trim();
      onError(
        new Error(
          `${commandToString(tar)}\nThe above command exited with ${exitReason(
            code,
            signal
          )}:\n${trimmed === "" ? EMPTY_STDERR : trimmed}`
        )
      );
    }
  });

  return {
    destroy: () => {
      // Without destroying stdin, the program exits early with a cryptic EPIPE
      // error – when using `downloadFileNative`.
      tar.stdin.destroy();
      return tar.kill();
    },
    write: (chunk) => tar.stdin.write(chunk),
    end: () => {
      tar.stdin.end();
    },
  };
}

// Without this, you’ll see the progress go up to 100% and then back to 0% again
// when using curl. It reports the progress per request – even redirects. It
// seems to always go from 0% to 100% for redirects (which makes sense – there’s
// no body, only headers). So only report progress _between_ 0% and 100%. It’s
// up to the caller to report 0% before starting and 100% when done.
function callOnProgressIfReasonable(
  percentage: number,
  onProgress: (percentage: number) => void
): void {
  if (percentage > 0 && percentage < 1) {
    onProgress(percentage);
  }
}

function exitReason(
  code: number | null,
  signal: NodeJS.Signals | null
): string {
  return code !== null
    ? `exit code ${code}`
    : signal !== null
    ? `signal ${signal}`
    : "unknown reason";
}

export async function getExecutable({
  name,
  version,
  cwd: cwdString = process.cwd(),
  env = process.env,
  onProgress,
}: {
  name: string;
  version: string;
  cwd?: string;
  env?: Env;
  onProgress: (percentage: number) => void;
}): Promise<string> {
  const cwd: Cwd = {
    tag: "Cwd",
    path: absolutePathFromString(
      { tag: "AbsolutePath", absolutePath: process.cwd() },
      cwdString
    ),
  };
  const tool = getToolThrowing({ name, version, cwd, env });

  const exists = validateFileExists(tool.location.theToolPath);
  switch (exists.tag) {
    case "Error":
      throw new Error(exists.message);

    case "Exists":
      return tool.location.theToolPath.absolutePath;

    case "DoesNotExist":
      // Keep going.
      break;
  }

  fs.mkdirSync(absoluteDirname(tool.location.theToolPath).absolutePath, {
    recursive: true,
  });

  onProgress(0);

  let previousPercentage = 0;
  const wrappedOnProgress = (percentage: number): void => {
    if (percentage !== previousPercentage) {
      previousPercentage = percentage;
      onProgress(percentage);
    }
  };

  try {
    await downloadAndExtract(env, tool, wrappedOnProgress);
  } catch (unknownError) {
    const error = toError(unknownError);
    throw new Error(removeColor(downloadAndExtractSimpleError(tool, error)));
  }

  wrappedOnProgress(1);

  return tool.location.theToolPath.absolutePath;
}
