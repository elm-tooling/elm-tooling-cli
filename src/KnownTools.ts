import type { NonEmptyArray } from "./Helpers";

export type KnownTools = Record<KnownToolNames, Versions>;

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
  fileSize: number;
  fileName: string;
  type: AssetType;
};

export type AssetType = "gz" | "tgz" | "zip";

const knownTools = {
  elm: {
    "0.19.0": {
      linux: {
        hash: "d359adbee89823c641cda326938708d7227dc79aa1f162e0d8fe275f182f528a",
        url: "https://github.com/elm/compiler/releases/download/0.19.0/binary-for-linux-64-bit.gz",
        fileSize: 10958261,
        fileName: "elm",
        type: "gz",
      },
      mac: {
        hash: "f1fa4dd9021e94c5a58b2be8843e3329095232ee3bd21a23524721a40eaabd35",
        url: "https://github.com/elm/compiler/releases/download/0.19.0/binary-for-mac-64-bit.gz",
        fileSize: 6051435,
        fileName: "elm",
        type: "gz",
      },
      windows: {
        hash: "0e27d80537418896cf98326224159a45b6d36bf08e608e3a174ab6d2c572c5ae",
        url: "https://github.com/elm/compiler/releases/download/0.19.0/binary-for-windows-64-bit.gz",
        fileSize: 12639872,
        fileName: "elm.exe",
        type: "gz",
      },
    },
    "0.19.1": {
      linux: {
        hash: "e44af52bb27f725a973478e589d990a6428e115fe1bb14f03833134d6c0f155c",
        url: "https://github.com/elm/compiler/releases/download/0.19.1/binary-for-linux-64-bit.gz",
        fileSize: 6806857,
        fileName: "elm",
        type: "gz",
      },
      mac: {
        hash: "05289f0e3d4f30033487c05e689964c3bb17c0c48012510dbef1df43868545d1",
        url: "https://github.com/elm/compiler/releases/download/0.19.1/binary-for-mac-64-bit.gz",
        fileSize: 6034616,
        fileName: "elm",
        type: "gz",
      },
      windows: {
        hash: "d1bf666298cbe3c5447b9ca0ea608552d750e5d232f9845c2af11907b654903b",
        url: "https://github.com/elm/compiler/releases/download/0.19.1/binary-for-windows-64-bit.gz",
        fileSize: 12727488,
        fileName: "elm.exe",
        type: "gz",
      },
    },
  },
  "elm-format": {
    "0.8.1": {
      linux: {
        hash: "13d06e0c3f3a9ef585c828ac5761ead148ea2f203573309306393e2d8066e1fd",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.1/elm-format-0.8.1-linux-x64.tgz",
        fileSize: 2110405,
        fileName: "elm-format",
        type: "tgz",
      },
      mac: {
        hash: "e1beba5d3090968cbbd879384617506f4c71a3ea3b01ce94d298e4893e82a640",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.1/elm-format-0.8.1-mac-x64.tgz",
        fileSize: 1325147,
        fileName: "elm-format",
        type: "tgz",
      },
      windows: {
        hash: "29b8989918e5804b538c411a92f3da8d15337ec28003b033b3be0de2d2d636d2",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.1/elm-format-0.8.1-win-i386.zip",
        fileSize: 2281778,
        fileName: "elm-format.exe",
        type: "zip",
      },
    },
    "0.8.2": {
      linux: {
        hash: "a69a4d3c49ccb0dffb3067b35464dc492563274e5778c40625220f9f6b3fd06d",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.2/elm-format-0.8.2-linux-x64.tgz",
        fileSize: 2128375,
        fileName: "elm-format",
        type: "tgz",
      },
      mac: {
        hash: "1f6cc8663922e546645c0536fc9bf7a49351d0b2963d26fc8fcb43e5bc92d733",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.2/elm-format-0.8.2-mac-x64.tgz",
        fileSize: 1298447,
        fileName: "elm-format",
        type: "tgz",
      },
      windows: {
        hash: "5009fd26b59a785738dd82c8d90ea8fd0bb7fe65fbd562097d906ee04061ef7f",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.2/elm-format-0.8.2-win-i386.zip",
        fileSize: 4243045,
        fileName: "elm-format.exe",
        type: "zip",
      },
    },
    "0.8.3": {
      linux: {
        hash: "9012f3a372488d4a118dc5f8ff57cc61cd1753d7d878b393fa7f60d496e37084",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.3/elm-format-0.8.3-linux-x64.tgz",
        fileSize: 2137733,
        fileName: "elm-format",
        type: "tgz",
      },
      mac: {
        hash: "66c9d4c2fcc7e435726f25ca44509cdf2caff5000dd215b5a086db514576efc7",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.3/elm-format-0.8.3-mac-x64.tgz",
        fileSize: 1308986,
        fileName: "elm-format",
        type: "tgz",
      },
      windows: {
        hash: "da9c013e27faccd14d6395db638af111097f171a45705a8978a28e30c115778f",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.3/elm-format-0.8.3-win-i386.zip",
        fileSize: 4136741,
        fileName: "elm-format.exe",
        type: "zip",
      },
    },
    "0.8.4": {
      linux: {
        hash: "aa6bb9d11672d8d27398746e831266c565e9837b4da6abe5d8286c2ab69ace9d",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.4/elm-format-0.8.4-linux-x64.tgz",
        fileSize: 1956444,
        fileName: "elm-format",
        type: "tgz",
      },
      mac: {
        hash: "df2a85da6870e8c8f7b052c9b81279fd9cbbab2bc738c2e14adf95ef777edd21",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.4/elm-format-0.8.4-mac-x64.tgz",
        fileSize: 1283871,
        fileName: "elm-format",
        type: "tgz",
      },
      windows: {
        hash: "0afe91bba2951c675f7484ae8d3d45792ed802d2eac9110b2afc18e3ed1a888d",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.4/elm-format-0.8.4-win-x64.zip",
        fileSize: 2105708,
        fileName: "elm-format.exe",
        type: "zip",
      },
    },
    "0.8.5": {
      linux: {
        hash: "147c479e375b9bae8dd633e526677fbd2a87e5445b3638ebee86c1319ffe8e23",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.5/elm-format-0.8.5-linux-x64.tgz",
        fileSize: 3870971,
        fileName: "elm-format",
        type: "tgz",
      },
      mac: {
        hash: "380c5f36b1fdeb2f1cda7c208dc788cb676675b3d5d43d907efc3f0821c010d6",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.5/elm-format-0.8.5-mac-x64.tgz",
        fileSize: 1334367,
        fileName: "elm-format",
        type: "tgz",
      },
      windows: {
        hash: "3cb6f74f24b401314480227b1ccbb2049cceb4a365ac7abb50cd3cfe0e64bbdc",
        url: "https://github.com/avh4/elm-format/releases/download/0.8.5/elm-format-0.8.5-win-x64.zip",
        fileSize: 1737291,
        fileName: "elm-format.exe",
        type: "zip",
      },
    },
  },
  "elm-json": {
    "0.2.8": {
      linux: {
        hash: "d4561a9a2bd70e1a4a4c61e75cac03d3bb1a3b5f99322afa720a2f2d84c194de",
        url: "https://github.com/zwilias/elm-json/releases/download/v0.2.8/elm-json-v0.2.8-x86_64-unknown-linux-musl.tar.gz",
        fileSize: 2255688,
        fileName: "elm-json",
        type: "tgz",
      },
      mac: {
        hash: "1ca3cde58730e87f2b73afb2432d5d8c88787ee3745bc81769ec0eef962ceaf6",
        url: "https://github.com/zwilias/elm-json/releases/download/v0.2.8/elm-json-v0.2.8-x86_64-apple-darwin.tar.gz",
        fileSize: 838159,
        fileName: "elm-json",
        type: "tgz",
      },
      windows: {
        hash: "1ae0b8e9a9717bdfb05346d0b864868e3907cb83c54d6770f6c604972296384f",
        url: "https://github.com/zwilias/elm-json/releases/download/v0.2.8/elm-json-v0.2.8-x86_64-pc-windows-msvc.tar.gz",
        fileSize: 1375556,
        fileName: "elm-json.exe",
        type: "tgz",
      },
    },
    "0.2.10": {
      linux: {
        hash: "6ee94f04bebeb66d5ef322d76fd3dc828015571b92f1259776f716feaaec359d",
        url: "https://github.com/zwilias/elm-json/releases/download/v0.2.10/elm-json-v0.2.10-x86_64-unknown-linux-musl.tar.gz",
        fileSize: 2307188,
        fileName: "elm-json",
        type: "tgz",
      },
      mac: {
        hash: "fcd39c7c014d95df033499d8a39720b38c9f93d0e3b7ecb821cfe3dbfd1affc1",
        url: "https://github.com/zwilias/elm-json/releases/download/v0.2.10/elm-json-v0.2.10-x86_64-apple-darwin.tar.gz",
        fileSize: 899328,
        fileName: "elm-json",
        type: "tgz",
      },
      windows: {
        hash: "721084dd90042a2b7b99a1334a9dcfa753fcf166ade458e6a3bb5d6649f8e39b",
        url: "https://github.com/zwilias/elm-json/releases/download/v0.2.10/elm-json-v0.2.10-x86_64-pc-windows-msvc.tar.gz",
        fileSize: 1415941,
        fileName: "elm-json.exe",
        type: "tgz",
      },
    },
  },
  "elm-test-rs": {
    "1.0.0": {
      linux: {
        hash: "a914088083ea8bc004944c98d9a4767cc5225d5811480f49fe1ad2c491baaaaa",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.0/elm-test-rs_linux.tar.gz",
        fileSize: 3610634,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      mac: {
        hash: "5f296888b7ba32c47830f00f6d38c56fc86f49d8c0c8998054b0842009a1173f",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.0/elm-test-rs_macos.tar.gz",
        fileSize: 2230430,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      windows: {
        hash: "c8a35e2e0049b691e4833a6e8ccb094688cdc49aa977c437a8289c57d92a5775",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.0/elm-test-rs_windows.zip",
        fileSize: 1939029,
        fileName: "elm-test-rs.exe",
        type: "zip",
      },
    },
    "1.2.1": {
      linux: {
        hash: "6e5759f832a5e025898c9306ba47b2f9ed7f0c371dc69bd16c15c7ed8bfb1501",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.2.1/elm-test-rs_linux.tar.gz",
        fileSize: 3591932,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      mac: {
        hash: "890c45a7eda24fd13169d349af9c835ee3ed04974eec36953baba5aefc3628a8",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.2.1/elm-test-rs_macos.tar.gz",
        fileSize: 2221267,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      windows: {
        hash: "26add13880af484a47cd182547f41370d3bfca812a7cc9e3db6f41ce13b7fc40",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.2.1/elm-test-rs_windows.zip",
        fileSize: 1880965,
        fileName: "elm-test-rs.exe",
        type: "zip",
      },
    },
    "1.2.2": {
      linux: {
        hash: "f9b972b9dcb71b9957baf23e5bca5674dfdea73b4b3706ad2c501f507933e489",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.2.2/elm-test-rs_linux.tar.gz",
        fileSize: 3629469,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      mac: {
        hash: "d3dc5f84a2b3c31a4a14a9da609c2f2e6824102d30249f883a97ea26c4eb9c35",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.2.2/elm-test-rs_macos.tar.gz",
        fileSize: 2227354,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      windows: {
        hash: "8469a05cdaf0be76e7cb7c9d8001a88df74a1db964a24d144554a925f8042600",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v1.2.2/elm-test-rs_windows.zip",
        fileSize: 1891939,
        fileName: "elm-test-rs.exe",
        type: "zip",
      },
    },
    "2.0.0": {
      linux: {
        hash: "face27bfe2b886d3ba96ad77c3f52d312da0f6089163b6db1b1c76297518ec54",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v2.0/elm-test-rs_linux.tar.gz",
        fileSize: 3572480,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      mac: {
        hash: "b8a5c487d7fc60c3bbb40bf8616b4da726ce0ad867ea6295a07a4726f9fe105a",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v2.0/elm-test-rs_macos.tar.gz",
        fileSize: 2233532,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      windows: {
        hash: "5f4ae45981750ac17cd72a2711bacc21fee763840d3f18c2e73614666f510ee8",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v2.0/elm-test-rs_windows.zip",
        fileSize: 1897927,
        fileName: "elm-test-rs.exe",
        type: "zip",
      },
    },
    "2.0.1": {
      linux: {
        hash: "0d69a890819a55b341703369ee9a937720eba752625d41623dfc2d7acfc62d86",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v2.0.1/elm-test-rs_linux.tar.gz",
        fileSize: 3606139,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      mac: {
        hash: "fc377b78dfe748417d0aea8619f77e255fd62e980cce387582496c8e0d10d24e",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v2.0.1/elm-test-rs_macos.tar.gz",
        fileSize: 2211725,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      windows: {
        hash: "ae2f0ec7911911e0b06f74138782b5f3874900936a66455daff0d5c4c7c2bef8",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v2.0.1/elm-test-rs_windows.zip",
        fileSize: 1909110,
        fileName: "elm-test-rs.exe",
        type: "zip",
      },
    },
    "3.0.0": {
      linux: {
        hash: "c72702d32a2a9e051667febeeef486a1794798d0770be1a9da95895e10b6db0f",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v3.0/elm-test-rs_linux.tar.gz",
        fileSize: 3717002,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      mac: {
        hash: "41e2be1d77fb587ac1336f4b8822feb3b914eff7364715f6cac0bc4a90c0948a",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v3.0/elm-test-rs_macos.tar.gz",
        fileSize: 2271033,
        fileName: "elm-test-rs",
        type: "tgz",
      },
      windows: {
        hash: "8cb1ef9bfe3e80e12db7db7f176e3e9280c5ae3bbb54c8dcfbb4f298c3d8fc71",
        url: "https://github.com/mpizenberg/elm-test-rs/releases/download/v3.0/elm-test-rs_windows.zip",
        fileSize: 1917553,
        fileName: "elm-test-rs.exe",
        type: "zip",
      },
    },
  },
} as const;

export type KnownToolNames = keyof typeof knownTools;

export const KNOWN_TOOLS: KnownTools = knownTools;

export const KNOWN_TOOL_NAMES: NonEmptyArray<KnownToolNames> = Object.keys(
  KNOWN_TOOLS
) as NonEmptyArray<KnownToolNames>;

export function getLastVersion(name: KnownToolNames): string {
  const versions = Object.keys(KNOWN_TOOLS[name]);
  // We know that all tools in this file has at least one version.
  return versions[versions.length - 1] as string;
}
