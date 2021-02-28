export type KnownTools = Record<string, Versions>;

export type Versions = Record<string, OSAssets>;

export type OSAssets = {
  linux: Asset;
  mac: Asset;
  windows: Asset;
};

export type OSName = keyof OSAssets;

export type Asset = {
  hash: string;
  url: string;
  fileName: string;
  type: AssetType;
};

export type AssetType = "gz" | "tgz" | "zip";

const knownTools = {
  elm: {
    "0.19.0": {
      linux: {
        hash:
          "d359adbee89823c641cda326938708d7227dc79aa1f162e0d8fe275f182f528a",
        url:
          "https://github.com/elm/compiler/releases/download/0.19.0/binary-for-linux-64-bit.gz",
        fileName: "elm",
        type: "gz",
      },
      mac: {
        hash:
          "f1fa4dd9021e94c5a58b2be8843e3329095232ee3bd21a23524721a40eaabd35",
        url:
          "https://github.com/elm/compiler/releases/download/0.19.0/binary-for-mac-64-bit.gz",
        fileName: "elm",
        type: "gz",
      },
      windows: {
        hash:
          "0e27d80537418896cf98326224159a45b6d36bf08e608e3a174ab6d2c572c5ae",
        url:
          "https://github.com/elm/compiler/releases/download/0.19.0/binary-for-windows-64-bit.gz",
        fileName: "elm.exe",
        type: "gz",
      },
    },
    "0.19.1": {
      linux: {
        hash:
          "e44af52bb27f725a973478e589d990a6428e115fe1bb14f03833134d6c0f155c",
        url:
          "https://github.com/elm/compiler/releases/download/0.19.1/binary-for-linux-64-bit.gz",
        fileName: "elm",
        type: "gz",
      },
      mac: {
        hash:
          "05289f0e3d4f30033487c05e689964c3bb17c0c48012510dbef1df43868545d1",
        url:
          "https://github.com/elm/compiler/releases/download/0.19.1/binary-for-mac-64-bit.gz",
        fileName: "elm",
        type: "gz",
      },
      windows: {
        hash:
          "d1bf666298cbe3c5447b9ca0ea608552d750e5d232f9845c2af11907b654903b",
        url:
          "https://github.com/elm/compiler/releases/download/0.19.1/binary-for-windows-64-bit.gz",
        fileName: "elm.exe",
        type: "gz",
      },
    },
  },
  "elm-format": {
    "0.8.1": {
      linux: {
        hash:
          "13d06e0c3f3a9ef585c828ac5761ead148ea2f203573309306393e2d8066e1fd",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.1/elm-format-0.8.1-linux-x64.tgz",
        fileName: "elm-format",
        type: "tgz",
      },
      mac: {
        hash:
          "e1beba5d3090968cbbd879384617506f4c71a3ea3b01ce94d298e4893e82a640",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.1/elm-format-0.8.1-mac-x64.tgz",
        fileName: "elm-format",
        type: "tgz",
      },
      windows: {
        hash:
          "29b8989918e5804b538c411a92f3da8d15337ec28003b033b3be0de2d2d636d2",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.1/elm-format-0.8.1-win-i386.zip",
        fileName: "elm-format.exe",
        type: "zip",
      },
    },
    "0.8.2": {
      linux: {
        hash:
          "a69a4d3c49ccb0dffb3067b35464dc492563274e5778c40625220f9f6b3fd06d",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.2/elm-format-0.8.2-linux-x64.tgz",
        fileName: "elm-format",
        type: "tgz",
      },
      mac: {
        hash:
          "1f6cc8663922e546645c0536fc9bf7a49351d0b2963d26fc8fcb43e5bc92d733",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.2/elm-format-0.8.2-mac-x64.tgz",
        fileName: "elm-format",
        type: "tgz",
      },
      windows: {
        hash:
          "5009fd26b59a785738dd82c8d90ea8fd0bb7fe65fbd562097d906ee04061ef7f",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.2/elm-format-0.8.2-win-i386.zip",
        fileName: "elm-format.exe",
        type: "zip",
      },
    },
    "0.8.3": {
      linux: {
        hash:
          "9012f3a372488d4a118dc5f8ff57cc61cd1753d7d878b393fa7f60d496e37084",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.3/elm-format-0.8.3-linux-x64.tgz",
        fileName: "elm-format",
        type: "tgz",
      },
      mac: {
        hash:
          "66c9d4c2fcc7e435726f25ca44509cdf2caff5000dd215b5a086db514576efc7",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.3/elm-format-0.8.3-mac-x64.tgz",
        fileName: "elm-format",
        type: "tgz",
      },
      windows: {
        hash:
          "da9c013e27faccd14d6395db638af111097f171a45705a8978a28e30c115778f",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.3/elm-format-0.8.3-win-i386.zip",
        fileName: "elm-format.exe",
        type: "zip",
      },
    },
    "0.8.4": {
      linux: {
        hash:
          "aa6bb9d11672d8d27398746e831266c565e9837b4da6abe5d8286c2ab69ace9d",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.4/elm-format-0.8.4-linux-x64.tgz",
        fileName: "elm-format",
        type: "tgz",
      },
      mac: {
        hash:
          "df2a85da6870e8c8f7b052c9b81279fd9cbbab2bc738c2e14adf95ef777edd21",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.4/elm-format-0.8.4-mac-x64.tgz",
        fileName: "elm-format",
        type: "tgz",
      },
      windows: {
        hash:
          "0afe91bba2951c675f7484ae8d3d45792ed802d2eac9110b2afc18e3ed1a888d",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.4/elm-format-0.8.4-win-x64.zip",
        fileName: "elm-format.exe",
        type: "zip",
      },
    },
    "0.8.5": {
      linux: {
        hash:
          "147c479e375b9bae8dd633e526677fbd2a87e5445b3638ebee86c1319ffe8e23",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.5/elm-format-0.8.5-linux-x64.tgz",
        fileName: "elm-format",
        type: "tgz",
      },
      mac: {
        hash:
          "380c5f36b1fdeb2f1cda7c208dc788cb676675b3d5d43d907efc3f0821c010d6",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.5/elm-format-0.8.5-mac-x64.tgz",
        fileName: "elm-format",
        type: "tgz",
      },
      windows: {
        hash:
          "3cb6f74f24b401314480227b1ccbb2049cceb4a365ac7abb50cd3cfe0e64bbdc",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.5/elm-format-0.8.5-win-x64.zip",
        fileName: "elm-format.exe",
        type: "zip",
      },
    },
  },
  "elm-json": {
    "0.2.8": {
      linux: {
        hash:
          "d4561a9a2bd70e1a4a4c61e75cac03d3bb1a3b5f99322afa720a2f2d84c194de",
        url:
          "https://github.com/zwilias/elm-json/releases/download/v0.2.8/elm-json-v0.2.8-x86_64-unknown-linux-musl.tar.gz",
        fileName: "elm-json",
        type: "tgz",
      },
      mac: {
        hash:
          "1ca3cde58730e87f2b73afb2432d5d8c88787ee3745bc81769ec0eef962ceaf6",
        url:
          "https://github.com/zwilias/elm-json/releases/download/v0.2.8/elm-json-v0.2.8-x86_64-apple-darwin.tar.gz",
        fileName: "elm-json",
        type: "tgz",
      },
      windows: {
        hash:
          "1ae0b8e9a9717bdfb05346d0b864868e3907cb83c54d6770f6c604972296384f",
        url:
          "https://github.com/zwilias/elm-json/releases/download/v0.2.8/elm-json-v0.2.8-x86_64-pc-windows-msvc.tar.gz",
        fileName: "elm-json.exe",
        type: "tgz",
      },
    },
    "0.2.10": {
      linux: {
        hash:
          "6ee94f04bebeb66d5ef322d76fd3dc828015571b92f1259776f716feaaec359d",
        url:
          "https://github.com/zwilias/elm-json/releases/download/v0.2.10/elm-json-v0.2.10-x86_64-unknown-linux-musl.tar.gz",
        fileName: "elm-json",
        type: "tgz",
      },
      mac: {
        hash:
          "fcd39c7c014d95df033499d8a39720b38c9f93d0e3b7ecb821cfe3dbfd1affc1",
        url:
          "https://github.com/zwilias/elm-json/releases/download/v0.2.10/elm-json-v0.2.10-x86_64-apple-darwin.tar.gz",
        fileName: "elm-json",
        type: "tgz",
      },
      windows: {
        hash:
          "721084dd90042a2b7b99a1334a9dcfa753fcf166ade458e6a3bb5d6649f8e39b",
        url:
          "https://github.com/zwilias/elm-json/releases/download/v0.2.10/elm-json-v0.2.10-x86_64-pc-windows-msvc.tar.gz",
        fileName: "elm-json.exe",
        type: "tgz",
      },
    },
  },
  "elm-test-rs": {
    "1.0.0": {
      linux: {
        hash:
          "a914088083ea8bc004944c98d9a4767cc5225d5811480f49fe1ad2c491baaaaa",
        url:
          "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.0/elm-test-rs_linux.tar.gz",
        fileName: "elm-test-rs",
        type: "tgz",
      },
      mac: {
        hash:
          "5f296888b7ba32c47830f00f6d38c56fc86f49d8c0c8998054b0842009a1173f",
        url:
          "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.0/elm-test-rs_macos.tar.gz",
        fileName: "elm-test-rs",
        type: "tgz",
      },
      windows: {
        hash:
          "c8a35e2e0049b691e4833a6e8ccb094688cdc49aa977c437a8289c57d92a5775",
        url:
          "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.0/elm-test-rs_windows.zip",
        fileName: "elm-test-rs.exe",
        type: "zip",
      },
    },
  },
} as const;

export type KnownToolNames = keyof typeof knownTools;

export const KNOWN_TOOLS: KnownTools = knownTools;
