import * as childProcess from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";
import * as zlib from "zlib";

import { AssetType, KNOWN_TOOLS, OSName } from "../helpers/known-tools";
import { linkTool, unlinkTool } from "../helpers/link";
import type { Logger } from "../helpers/logger";
import {
  bold,
  dim,
  elmToolingJsonDocumentationLink,
  Env,
  flatMap,
  indent,
  printNumErrors,
  removeColor,
} from "../helpers/mixed";
import {
  findReadAndParseElmToolingJson,
  getOSNameAsFieldResult,
  getToolThrowing,
  isWindows,
  makeTool,
  prefixFieldResult,
  printFieldErrors,
  Tool,
  Tools,
  validateFileExists,
} from "../helpers/parse";

const EMPTY_STDERR = dim("(empty stderr)");

export default async function install(
  cwd: string,
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
      logger.error(bold(parseResult.elmToolingJsonPath));
      logger.error(parseResult.message);
      return 1;

    case "Parsed": {
      switch (parseResult.tools?.tag) {
        case undefined: {
          const osResult = prefixFieldResult("tools", getOSNameAsFieldResult());

          switch (osResult.tag) {
            case "Error":
              logger.error(bold(parseResult.elmToolingJsonPath));
              logger.error("");
              logger.error(printFieldErrors(osResult.errors));
              // The spec documentation link does not help here.
              return 1;

            case "Parsed":
              return removeAllTools(
                cwd,
                env,
                logger,
                osResult.parsed,
                parseResult.elmToolingJsonPath,
                "missing"
              );
          }
        }

        case "Error":
          logger.error(bold(parseResult.elmToolingJsonPath));
          logger.error("");
          logger.error(printFieldErrors(parseResult.tools.errors));
          logger.error("");
          logger.error(elmToolingJsonDocumentationLink);
          return 1;

        case "Parsed": {
          const tools = parseResult.tools.parsed;

          if (tools.existing.length === 0 && tools.missing.length === 0) {
            return removeAllTools(
              cwd,
              env,
              logger,
              tools.osName,
              parseResult.elmToolingJsonPath,
              "empty"
            );
          }

          return installTools(
            cwd,
            env,
            logger,
            parseResult.elmToolingJsonPath,
            tools
          );
        }
      }
    }
  }
}

async function installTools(
  cwd: string,
  env: Env,
  logger: Logger,
  elmToolingJsonPath: string,
  tools: Tools
): Promise<number> {
  const nodeModulesBinPath = path.join(
    path.dirname(elmToolingJsonPath),
    "node_modules",
    ".bin"
  );

  try {
    fs.mkdirSync(nodeModulesBinPath, { recursive: true });
  } catch (errorAny) {
    const error = errorAny as Error;
    logger.error(bold(elmToolingJsonPath));
    logger.error(`Failed to create ${nodeModulesBinPath}:\n${error.message}`);
    return 1;
  }

  for (const tool of tools.missing) {
    const dir = path.dirname(tool.absolutePath);
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (errorAny) {
      const error = errorAny as Error;
      logger.error(bold(elmToolingJsonPath));
      logger.error(`Failed to create ${dir}:\n${error.message}`);
      return 1;
    }
  }

  const toolsProgress: Array<number | string> = tools.missing.map(() => 0);

  const redraw = (): void => {
    if (tools.missing.length > 0) {
      logger.progress(
        tools.missing
          .map((tool, index) => {
            const progress = toolsProgress[index];
            const progressString =
              typeof progress === "string"
                ? progress.padEnd(4)
                : `${Math.round(progress * 100)
                    .toString()
                    .padStart(3)}%`;
            return `${bold(progressString)} ${tool.name} ${tool.version}`;
          })
          .join("\n")
      );
    }
  };

  logger.log(bold(elmToolingJsonPath));
  redraw();

  const presentNames = tools.missing
    .concat(tools.existing)
    .map(({ name }) => name);
  const toolsToRemove = Object.keys(KNOWN_TOOLS).filter(
    (name) => !presentNames.includes(name)
  );

  const results: Array<Error | string | undefined> = [
    ...(await Promise.all(
      tools.missing.map((tool, index) =>
        downloadAndExtract(tool, (percentage) => {
          toolsProgress[index] = percentage;
          redraw();
        }).then(
          () => {
            toolsProgress[index] = 1;
            redraw();
            return linkTool(cwd, nodeModulesBinPath, tool);
          },
          (error: Error) => {
            toolsProgress[index] = "ERR!";
            redraw();
            return new Error(downloadAndExtractError(tool, error));
          }
        )
      )
    )),

    ...tools.existing.map((tool) => linkTool(cwd, nodeModulesBinPath, tool)),

    ...removeTools(cwd, env, tools.osName, nodeModulesBinPath, toolsToRemove),
  ];

  redraw();
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

  if (messages.length > 0) {
    logger.log(messages.join("\n"));
  }

  if (installErrors.length > 0) {
    logger.error("");
    logger.error(
      [
        printNumErrors(installErrors.length),
        ...installErrors.map((error) => error.message),
      ].join("\n\n")
    );
    return 1;
  }

  return 0;
}

function removeAllTools(
  cwd: string,
  env: Env,
  logger: Logger,
  osName: OSName,
  elmToolingJsonPath: string,
  what: string
): number {
  logger.log(bold(elmToolingJsonPath));
  const message = `The "tools" field is ${what}. To add tools: elm-tooling tools`;

  const nodeModulesBinPath = path.join(
    path.dirname(elmToolingJsonPath),
    "node_modules",
    ".bin"
  );

  const results = removeTools(
    cwd,
    env,
    osName,
    nodeModulesBinPath,
    Object.keys(KNOWN_TOOLS)
  );

  if (results.every((result) => result === undefined)) {
    logger.log(message);
    return 0;
  }

  return printResults(logger, results);
}

function removeTools(
  cwd: string,
  env: Env,
  osName: OSName,
  nodeModulesBinPath: string,
  names: Array<string>
): Array<Error | string | undefined> {
  return flatMap(names, (name) => {
    const versions = KNOWN_TOOLS[name];
    return Object.keys(versions).map((version) => {
      const asset = versions[version][osName];
      const tool = makeTool(cwd, env, name, version, asset);
      return unlinkTool(cwd, nodeModulesBinPath, tool);
    });
  });
}

async function downloadAndExtract(
  tool: Tool,
  onProgress: (percentage: number) => void
): Promise<void> {
  return new Promise((resolve, reject): void => {
    const removeExtractedAndReject = (error: Error): void => {
      try {
        hash.destroy();
        extractor.destroy();
        downloader.kill();
        fs.unlinkSync(tool.absolutePath);
        reject(error);
      } catch (removeErrorAny) {
        const removeError = removeErrorAny as Error & { code?: string };
        if (removeError.code === "ENOENT") {
          reject(error);
        } else {
          reject(new Error(`${error.message}\n\n${removeError.message}`));
        }
      }
    };

    const hash = crypto.createHash("sha256");

    const extractor = extractFile({
      assetType: tool.asset.type,
      file: tool.absolutePath,
      onError: removeExtractedAndReject,
      onSuccess: resolve,
    });

    const downloader = downloadFile(tool.asset.url, {
      onData: (chunk) => {
        hash.update(chunk);
        extractor.write(chunk);
      },
      onProgress,
      onError: removeExtractedAndReject,
      onSuccess: () => {
        const digest = hash.digest("hex");
        if (digest === tool.asset.hash) {
          extractor.end();
        } else {
          removeExtractedAndReject(
            new Error(hashMismatch(digest, tool.asset.hash))
          );
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
${dim(`> ${tool.absolutePath}`)}
${error.message}
  `.trim()
)}
  `.trim();
}

function downloadAndExtractSimpleError(tool: Tool, error: Error): string {
  return `
Failed to download:
< ${tool.asset.url}
> ${tool.absolutePath}
${error.message}
  `.trim();
}

function hashMismatch(actual: string, expected: string): string {
  return `
The downloaded file does not have the expected hash!
Expected: ${expected}
Actual:   ${actual}
  `.trim();
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
): { kill: () => void } {
  let stderr = "";
  const errored: Array<string> = [];

  const onStderr = (chunk: Buffer): void => {
    stderr += chunk.toString();
    // Extract progress percentage from curl/wget.
    const matches = stderr.match(/\d+(?:[.,]\d+)?%/g) ?? [];
    if (matches.length > 0) {
      callOnProgressIfReasonable(
        parseFloat(matches[matches.length - 1].replace(",", ".")) / 100,
        onProgress
      );
    }
  };

  const onClose = (commandName: string) => (
    code: number | null,
    signal: NodeJS.Signals | null
  ): void => {
    if (errored.includes(commandName)) {
      return;
    } else if (code === 0) {
      onSuccess();
    } else {
      const trimmed = stderr
        .trim()
        // Remove curl’s progress bar remnants.
        .replace(/^[\s#O=-]+/g, "");
      onError(
        new Error(
          `${commandName} exited with ${exitReason(code, signal)}:\n${
            trimmed === "" ? EMPTY_STDERR : trimmed
          }`
        )
      );
    }
  };

  const curl = childProcess.spawn("curl", ["-#fL", url]);
  let toKill: { kill: () => void } = curl;
  curl.stdout.on("data", onData);
  curl.stderr.on("data", onStderr);
  curl.on("close", onClose("curl"));

  curl.on("error", (curlError: Error & { code?: string }) => {
    errored.push("curl");
    if (curlError.code === "ENOENT") {
      const wget = childProcess.spawn("wget", ["-O", "-", url]);
      toKill = wget;
      wget.stdout.on("data", onData);
      wget.stderr.on("data", onStderr);
      wget.on("close", onClose("wget"));

      wget.on("error", (wgetError: Error & { code?: string }) => {
        errored.push("wget");
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
): { kill: () => void } {
  let toKill = {
    kill: () => {
      request.destroy();
    },
  };

  const request = https.get(url, (response) => {
    switch (response.statusCode) {
      case 302: {
        const redirect = response.headers.location;
        if (redirect === undefined) {
          onError(new Error(`Got 302 without location header.`));
        } else if (maxRedirects <= 0) {
          onError(new Error(`Too many redirects.`));
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

        response.on("data", (chunk: Buffer) => {
          length += chunk.length;
          onData(chunk);
          if (Number.isFinite(contentLength) && contentLength > 0) {
            callOnProgressIfReasonable(length / contentLength, onProgress);
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
  assetType,
  file,
  onError,
  onSuccess,
}: {
  assetType: AssetType;
  file: string;
  onError: (error: Error) => void;
  onSuccess: () => void;
}): MiniWritable {
  switch (assetType) {
    case "gz": {
      const gunzip = zlib.createGunzip();
      const write = fs.createWriteStream(file);
      gunzip.on("error", onError);
      write.on("error", onError);
      write.on("close", () => {
        // Make executable.
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

    case "tgz":
      return extractTar({ input: "-", file, onError, onSuccess });

    // GNU tar does not support zip files, but only Windows uses zip files and
    // Windows comes with BSD tar which does support them. This could have used
    // the exact same code as for `tgz`, but it somehow fails on Windows:
    // https://stackoverflow.com/questions/63783342/windows-using-tar-to-unzip-zip-from-stdin-works-in-terminal-but-not-in-node-js
    // Workaround: Save the zip to disk, extract it and remove the zip again.
    case "zip": {
      const temp = `${file}.zip`;
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
        } catch (errorAny) {
          const error = errorAny as Error & { code?: string };
          return error.code === "ENOENT" ? undefined : error;
        }
      };

      write.on("error", onError);

      write.on("close", () => {
        toDestroy = extractTar({
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
  input,
  file,
  onError,
  onSuccess,
}: {
  input: string;
  file: string;
  onError: (error: Error) => void;
  onSuccess: () => void;
}): MiniWritable {
  const tar = childProcess.spawn("tar", [
    "zxf",
    input,
    "-C",
    path.dirname(file),
    path.basename(file),
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
          `tar exited with ${exitReason(code, signal)}:\n${
            trimmed === "" ? EMPTY_STDERR : trimmed
          }`
        )
      );
    }
  });

  return {
    destroy: () => tar.kill(),
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
  cwd = process.cwd(),
  env = process.env,
  onProgress,
}: {
  name: string;
  version: string;
  cwd?: string;
  env?: Env;
  onProgress: (percentage: number) => void;
}): Promise<string> {
  const tool = getToolThrowing({ name, version, cwd, env });

  const exists = validateFileExists(tool.absolutePath);
  switch (exists.tag) {
    case "Error":
      throw new Error(exists.message);

    case "Exists":
      return tool.absolutePath;

    case "DoesNotExist":
      // Keep going.
      break;
  }

  fs.mkdirSync(path.dirname(tool.absolutePath), { recursive: true });

  onProgress(0);

  try {
    await downloadAndExtract(tool, onProgress);
  } catch (errorAny) {
    const error = errorAny as Error;
    throw new Error(removeColor(downloadAndExtractSimpleError(tool, error)));
  }

  onProgress(1);

  return tool.absolutePath;
}
