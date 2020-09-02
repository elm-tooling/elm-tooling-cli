export type Tools = Record<string, Versions>;

export type Versions = Record<string, OS>;

export type OS = {
  linux: Asset;
  mac: Asset;
  windows: Asset;
};

export type OSName = keyof OS;

export type Asset = {
  hash: string;
  url: string;
};

export const tools: Tools = {
  elm: {
    "0.19.0": {
      linux: {
        hash:
          "d359adbee89823c641cda326938708d7227dc79aa1f162e0d8fe275f182f528a",
        url:
          "https://github.com/elm/compiler/releases/download/0.19.0/binary-for-linux-64-bit.gz",
      },
      mac: {
        hash:
          "f1fa4dd9021e94c5a58b2be8843e3329095232ee3bd21a23524721a40eaabd35",
        url:
          "https://github.com/elm/compiler/releases/download/0.19.0/binary-for-mac-64-bit.gz",
      },
      windows: {
        hash: "TODO",
        url: "TODO",
      },
    },
    "0.19.1": {
      linux: {
        hash:
          "e44af52bb27f725a973478e589d990a6428e115fe1bb14f03833134d6c0f155c",
        url:
          "https://github.com/elm/compiler/releases/download/0.19.1/binary-for-linux-64-bit.gz",
      },
      mac: {
        hash:
          "05289f0e3d4f30033487c05e689964c3bb17c0c48012510dbef1df43868545d1",
        url:
          "https://github.com/elm/compiler/releases/download/0.19.1/binary-for-mac-64-bit.gz",
      },
      windows: {
        hash: "TODO",
        url: "TODO",
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
      },
      mac: {
        hash:
          "e1beba5d3090968cbbd879384617506f4c71a3ea3b01ce94d298e4893e82a640",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.1/elm-format-0.8.1-mac-x64.tgz",
      },
      windows: {
        hash: "TODO",
        url: "TODO",
      },
    },
    "0.8.2": {
      linux: {
        hash:
          "a69a4d3c49ccb0dffb3067b35464dc492563274e5778c40625220f9f6b3fd06d",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.2/elm-format-0.8.2-linux-x64.tgz",
      },
      mac: {
        hash:
          "1f6cc8663922e546645c0536fc9bf7a49351d0b2963d26fc8fcb43e5bc92d733",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.2/elm-format-0.8.2-mac-x64.tgz",
      },
      windows: {
        hash: "TODO",
        url: "TODO",
      },
    },
    "0.8.3": {
      linux: {
        hash:
          "9012f3a372488d4a118dc5f8ff57cc61cd1753d7d878b393fa7f60d496e37084",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.3/elm-format-0.8.3-linux-x64.tgz",
      },
      mac: {
        hash:
          "66c9d4c2fcc7e435726f25ca44509cdf2caff5000dd215b5a086db514576efc7",
        url:
          "https://github.com/avh4/elm-format/releases/download/0.8.3/elm-format-0.8.3-mac-x64.tgz",
      },
      windows: {
        hash: "TODO",
        url: "TODO",
      },
    },
  },
};
