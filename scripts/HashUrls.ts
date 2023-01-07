import * as crypto from "crypto";

import { downloadFile } from "../src/commands/Install";
import { fromEntries } from "../src/Helpers";
import type { Asset, AssetType } from "../src/KnownTools";

async function run(urls: Array<string>): Promise<string> {
  const progress: Array<number> = urls.map(() => 0);

  const assets: Array<[string, Asset]> = await Promise.all(
    urls.map((url, index): Promise<[string, Asset]> => {
      const hash = crypto.createHash("sha256");
      let fileSize = 0;
      return new Promise((resolve, reject) => {
        downloadFile(process.env, url, {
          onData: (chunk) => {
            hash.update(chunk);
            fileSize += chunk.byteLength;
          },
          onProgress: (percentage) => {
            progress[index] = percentage;
            process.stderr.write(
              `\r${Math.round(
                (progress.reduce((a, b) => a + b, 0) / urls.length) * 100
              )}%`
            );
          },
          onError: (error) => {
            reject(new Error(`Download failed.\n${url}\n${error.message}`));
          },
          onSuccess: () => {
            progress[index] = 1;
            const platform = guessPlatform(url);
            const asset: Asset = {
              hash: hash.digest("hex"),
              url,
              fileSize,
              fileName: guessFileName(url, platform),
              type: guessAssetType(url),
            };
            resolve([platform, asset]);
          },
        });
      });
    })
  );

  process.stderr.write("\r100%");
  return JSON.stringify(fromEntries(assets), null, 2);
}

function guessPlatform(url: string): string {
  return `${guessPlatformName(url)}-${guessPlatformArch(url)}`;
}

function guessPlatformName(passedUrl: string): string {
  const url = passedUrl.toLowerCase();
  return url.includes("mac") || url.includes("darwin")
    ? "darwin"
    : url.includes("linux")
    ? "linux"
    : url.includes("win")
    ? "win32"
    : "UNKNOWN";
}

function guessPlatformArch(passedUrl: string): string {
  const url = passedUrl.toLowerCase();
  return url.includes("arm") || url.includes("aarch")
    ? url.includes("32")
      ? "arm"
      : "arm64"
    : "x64";
}

function guessFileName(url: string, platform: string): string {
  const match = /github\.com\/[^/]+\/([^/]+)/.exec(url);
  const name = match === null || match[1] === undefined ? "UNKNOWN" : match[1];
  return platform.startsWith("win32-") ? `${name}.exe` : name;
}

function guessAssetType(url: string): AssetType {
  return url.endsWith(".tgz") || url.endsWith(".tar.gz")
    ? "tgz"
    : url.endsWith(".gz")
    ? "gz"
    : url.endsWith(".zip")
    ? "zip"
    : ("UNKNOWN" as AssetType);
}

if (require.main === module) {
  run(process.argv.slice(2))
    .then((json) => {
      process.stdout.write(`\n${json}\n`);
      process.exit(0);
    })
    .catch((error: Error) => {
      process.stderr.write(`\n${error.stack ?? error.message}\n`);
      process.exit(1);
    });
}
