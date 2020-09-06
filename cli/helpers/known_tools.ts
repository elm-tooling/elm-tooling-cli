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

export const KNOWN_TOOLS: KnownTools = {
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
          "d1bf666298cbe3c5447b9ca0ea608552d750e5d232f9845c2af11907b654903b",
        url:
          "https://github.com/elm/compiler/releases/download/0.19.1/binary-for-windows-64-bit.gz",
        fileName: "elm",
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
        fileName: "elm",
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
  },
};
