import * as childProcess from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as https from "https";
import * as path from "path";
import * as readline from "readline";
import type { Writable } from "stream";
import * as zlib from "zlib";

import type { AssetType } from "../helpers/known_tools";
import {
  bold,
  dim,
  elmToolingJsonDocumentationLink,
  indent,
  printNumErrors,
} from "../helpers/mixed";
import {
  findReadAndParseElmToolingJson,
  printFieldErrors,
  Tool,
  Tools,
} from "../helpers/parse";

export default async function download(): Promise<number> {
  const parseResult = findReadAndParseElmToolingJson();

  switch (parseResult.tag) {
    case "ElmToolingJsonNotFound":
      console.error(parseResult.message);
      return 1;

    case "ReadAsJsonObjectError":
      console.error(bold(parseResult.elmToolingJsonPath));
      console.error(parseResult.message);
      return 1;

    case "Parsed": {
      console.error(bold(parseResult.elmToolingJsonPath));

      switch (parseResult.tools?.tag) {
        case undefined:
          console.error(`The "tools" field is missing. Nothing to download.`);
          return 0;

        case "Error":
          console.error("");
          console.error(printFieldErrors(parseResult.tools.errors));
          console.error("");
          console.error(elmToolingJsonDocumentationLink);
          return 1;

        case "Parsed":
          return await downloadTools(parseResult.tools.parsed);
      }
    }
  }
}

async function downloadTools(tools: Tools): Promise<number> {
  if (tools.existing.length === 0 && tools.missing.length === 0) {
    console.error(`The "tools" field is empty. Nothing to download.`);
    return 0;
  }

  for (const tool of tools.existing) {
    console.error(
      `${tool.name} ${tool.version} already exists: ${tool.absolutePath}`
    );
  }

  if (tools.missing.length === 0) {
    return 0;
  }

  for (const tool of tools.missing) {
    fs.mkdirSync(path.dirname(tool.absolutePath), { recursive: true });
  }

  const toolsProgress: Array<number | string> = tools.missing.map(() => 0);
  const firstDrawTime = Date.now();

  const draw = () => {
    console.error(
      tools.missing
        .map((tool, index) => {
          const progress = toolsProgress[index];
          const progressString =
            typeof progress === "string"
              ? progress.padEnd(4)
              : Math.round(progress * 100)
                  .toString()
                  .padStart(3) + "%";
          return `${bold(progressString)} ${tool.name} ${tool.version}`;
        })
        .join("\n")
    );
  };

  const redraw = ({ force = false } = {}) => {
    // Without this time thing, you’ll see the progress go up to 100% and then
    // back to 0% again when using curl. It reports the progress per request –
    // even redirects. Hopefully a redirect response usually finishes in 1 second.
    if (Date.now() - firstDrawTime > 1000 || force) {
      readline.moveCursor(process.stderr, 0, -tools.missing.length);
      draw();
    }
  };

  draw();

  const results = await Promise.all(
    tools.missing.map((tool, index) =>
      downloadAndExtract(tool, (percentage) => {
        toolsProgress[index] = percentage;
        redraw();
      }).catch((error: Error) => {
        toolsProgress[index] = "ERR!";
        redraw();
        return new Error(downloadAndExtractError(tool, error));
      })
    )
  );

  const downloadErrors = results.flatMap((result) =>
    result instanceof Error ? result : []
  );

  redraw({ force: true });

  if (downloadErrors.length > 0) {
    console.error("");
    console.error(
      [
        printNumErrors(downloadErrors.length),
        ...downloadErrors.map((error) => error.message),
      ].join("\n\n")
    );
  }

  return downloadErrors.length === 0 ? 0 : 1;
}

function downloadAndExtract(
  tool: Tool,
  onProgress: (percentage: number) => void
): Promise<void> {
  return new Promise((resolve, reject): void => {
    const removeExtractedBeforeReject = (error: Error): void => {
      extract.destroy();
      try {
        fs.unlinkSync(tool.absolutePath);
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
      assetType: tool.asset.type,
      file: tool.absolutePath,
      onError: reject,
      onSuccess: resolve,
    });

    // Allow `onError` for `extract` to fire before starting to download.
    process.nextTick(() => {
      downloadFile(tool.asset.url, {
        onData: (chunk) => {
          hash.update(chunk);
          extract.write(chunk);
        },
        onProgress,
        onError: removeExtractedBeforeReject,
        onSuccess: () => {
          const digest = hash.digest("hex");
          if (digest === tool.asset.hash) {
            extract.end();
          } else {
            removeExtractedBeforeReject(
              new Error(hashMismatch(digest, tool.asset.hash))
            );
          }
        },
      });
    });
  });
}

function downloadAndExtractError(tool: Tool, error: Error) {
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

function hashMismatch(actual: string, expected: string) {
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
