import * as crypto from "crypto";

import { downloadFile } from "../commands/install";
import type { Asset, AssetType, OSName } from "../helpers/known-tools";
import { fromEntries } from "../helpers/mixed";

const OS_LIST: Array<OSName> = ["linux", "mac", "windows"];

async function run(urls: Array<string>): Promise<string> {
  const progress: Array<number> = urls.map(() => 0);

  const assets: Array<[OSName, Asset]> = await Promise.all(
    urls.map(
      (url, index): Promise<[OSName, Asset]> => {
        const hash = crypto.createHash("sha256");
        return new Promise((resolve, reject) => {
          downloadFile(process.env, url, {
            onData: (chunk) => {
              hash.update(chunk);
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
              const osName = OS_LIST[index] ?? "UNKNOWN";
              const asset: Asset = {
                hash: hash.digest("hex"),
                url,
                fileName: guessFileName(url, osName),
                type: guessAssetType(url),
              };
              resolve([osName, asset]);
            },
          });
        });
      }
    )
  );

  process.stderr.write("\r100%");
  return JSON.stringify(fromEntries(assets), null, 2);
}

function guessFileName(url: string, osName: OSName): string {
  const match = /github\.com\/[^/]+\/([^/]+)/.exec(url);
  const name = match === null ? "UNKNOWN" : match[1];
  return osName === "windows" ? `${name}.exe` : name;
}

function guessAssetType(url: string): AssetType {
  return url.endsWith(".gz")
    ? "gz"
    : url.endsWith(".tgz")
    ? "tgz"
    : url.endsWith(".tar.gz")
    ? "tgz"
    : url.endsWith(".zip")
    ? "zip"
    : ("UNKNOWN" as AssetType);
}

if (require.main === module) {
  const urls = process.argv.slice(2);
  if (urls.length !== 3) {
    process.stderr.write(
      `\nExpected 3 urls (${OS_LIST.join(", ")}, in that order) but got ${
        urls.length
      }\n`
    );
    process.exit(1);
  }
  run(urls).then(
    (json) => {
      process.stdout.write(`\n${json}\n`);
      process.exit(0);
    },
    (error: Error) => {
      process.stderr.write(`\n${error.stack ?? error.message}\n`);
      process.exit(1);
    }
  );
}
