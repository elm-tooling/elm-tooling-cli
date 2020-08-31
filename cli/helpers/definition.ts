export type NonEmptyArray<T> = [T, ...T[]];

export type ElmTooling = {
  entrypoints?: NonEmptyArray<string>;
  binaries?: {
    [name: string]: string;
  };
};
