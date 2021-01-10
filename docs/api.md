---
title: API reference
nav_order: 5
---

# API reference

The `elm-tooling` npm package includes not only a CLI, but also an API that lets you:

- [elmToolingCli](#elmtoolingcli): Easily run the `elm-tooling` CLI from a script.
- [getExecutable](#getexecutable): Depend on some Elm tool in an npm package.

## elmToolingCli

Instead of using [child_process.spawn](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options), you can import the CLI and run it directly. That’s an easy way to make a cross-platform script.

Example:

```js
import elmToolingCli from "elm-tooling";

elmToolingCli(["install"]).then(
  (exitCode) => {
    console.log("Exit", exitCode);
    process.exit(exitCode);
  },
  (error) => {
    console.error("Unexpected error", error);
    process.exit(1);
  }
);
```

Here’s the full interface:

```ts
import type { Readable, Writable } from "stream";

type ReadStream = Readable & {
  isTTY: boolean;
  setRawMode: (mode: boolean) => void;
};

type WriteStream = Writable & {
  isTTY: boolean;
};

export default function elmToolingCli(
  args: Array<string>,
  options?: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    stdin?: ReadStream;
    stdout?: WriteStream;
    stderr?: WriteStream;
  }
): Promise<number>;
```

The default options use values from the `process` global.

## getExecutable

This function lets npm packages depend on tools distributed as platform specific executables.

It makes sure that a tool choice exists on disk and then returns the absolute path to it so you can execute it.

- Each user will only need to download each executable tool once per computer (rather than once per project).
- If the user has the same tool in their `elm-tooling.json`, they will get maximum parallel downloading on clean installs.

```ts
export default function getExecutable(options: {
  name: string;
  version: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
  onProgress: (percentage: number) => void;
}): Promise<string>;
```

- `name`: The name of the tool you want. For example, `"elm"`.

- `version`: A [`^` or `~` semver version range](https://docs.npmjs.com/misc/semver#tilde-ranges-123-12-1). The latest known version matching the range will be chosen. Note that the range _has_ to start with `^` or `~` (or `=` if you _really_ need an exact version) and _must_ be followed by 3 dot-separated digits (unlike `npm` you can’t leave out any numbers). Example: `"~0.2.8"`.

- `cwd`: The current working directory. Needed in case `ELM_HOME` is set to a relative path. Defaults to `process.cwd()`.

- `env`: Available environment variables. `ELM_HOME` can be used to customize where tools will be downloaded. `APPDATA` is used on Windows to find the default download location. Defaults to `process.env`.

- `onProgress`: This function is called repeatedly with a number (float) from 0.0 to 1.0 if the tool needs to be downloaded. You can use this to display a progress bar. Example numbers you might get:

  ```
  0
  0.02
  0.062
  0.20600000000000002
  0.49700000000000005
  0.9740000000000001
  1
  ```

- Returns: A promise that resolves to the absolute path to the tool.

If you need several tools you can use `Promise.all` to download them all in parallel.

Example:

```js
import getExecutable from "elm-tooling/getExecutable";
import * as child_process from "child_process";

getExecutable({
  name: "elm-json",
  version: "~0.2.8",
  onProgress: (percentage) => {
    // `percentage` is a number from 0 to 1.
    // This is only called if the tool does not already exist on disk and needs
    // to be downloaded.
    console.log(percentage);
  },
}).then((toolAbsolutePath) => {
  // `toolAbsolutePath` is the absolute path to the latest known elm-json 0.2.8 executable.
  // Standard Node.js `child_process.spawn` and `child_process.spawnSync` work
  // great for running the executable, even on Windows.
  console.log(
    child_process.spawnSync(toolAbsolutePath, ["--help"], { encoding: "utf8" })
  );
}, console.error);
```
