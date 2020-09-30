# elm-tooling CLI

The CLI for [elm-tooling.json]. Create and validate `elm-tooling.json`. Install Elm tools.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Installation](#installation)
- [Commands](#commands)
  - [elm-tooling init](#elm-tooling-init)
  - [elm-tooling validate](#elm-tooling-validate)
  - [elm-tooling download](#elm-tooling-download)
  - [elm-tooling postinstall](#elm-tooling-postinstall)
    - [Example](#example)
    - [Comparison with the regular npm packages](#comparison-with-the-regular-npm-packages)
    - [Notes](#notes)
- [CI](#ci)
- [API](#api)
  - [elmToolingCli](#elmtoolingcli)
  - [getExecutable](#getexecutable)
- [Adding elm-tooling to an existing project](#adding-elm-tooling-to-an-existing-project)
- [Creating a new project with elm-tooling](#creating-a-new-project-with-elm-tooling)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

```
npm install --save-dev elm-tooling
```

```
npx elm-tooling help
```

## Commands

### elm-tooling init

Create a sample `elm-tooling.json` in the current directory. It tries to guess some values based on your project to help you get started.

### elm-tooling validate

Validate the closest `elm-tooling.json`. If you’re having trouble with some program not reading your `elm-tooling.json` correctly, try `elm-tooling validate` to check if you’ve made any mistakes.

### elm-tooling download

Download the [tools] in the closest `elm-tooling.json`.

This command just downloads stuff from the Internet and shoves it into a folder (basically, `~/.elm/elm-tooling/`). It does not provide you with an easy way to run the tools or anything. It’s up to other programs to support the shared location of binaries. But you can use `elm-tooling postinstall` to piggy-back on the well-supported `npm` ecosystem.

As mentioned in [tools], you can set `ELM_HOME` environment variable to customize where tools will be downloaded. The Elm compiler uses this variable too for where to store packages.

`elm-tooling` uses `curl` to download stuff if it exists, otherwise `wget`, and finally the `https` Node.js core module. So if you need to do any proxy stuff or anything, configure whatever environment variables or whatever `curl` or `wget` understands. Most systems – even Windows! – come with either `curl` or `wget`.

Similarly, `tar` is used to extract archives. Even Windows comes with `tar` these days so you shouldn’t need to install anything.

### elm-tooling postinstall

Download the [tools] in the closest `elm-tooling.json` and create links to them in `node_modules/.bin/`.

This is basically a drop-in replacement for installing `elm` and `elm-format` with `npm`. This lets you use the [tools] field of `elm-tooling.json` without your editor and build tools having to support it.

#### Example

`package.json`:

```diff
 {
   "name": "my-app",
   "devDependencies": {
-    "elm": "0.19.1",
-    "elm-format": "0.8.3"
+    "elm-tooling": "0.3.0"
   },
   "scripts": {
+    "postinstall": "elm-tooling postinstall"
   }
 }
```

elm-tooling.json:

```diff
+{
+  "tools": {
+    "elm": "0.19.1",
+    "elm-format": "0.8.3"
+  }
+}
```

Thanks to the [postinstall] script shown in `package.json` above, `elm` and `elm-format` will be automatically installed whenever you run `npm install` (just like you’re used to if you already install `elm` and `elm-format` using `npm`).

`elm-tooling postinstall` does two things:

1. Runs `elm-tooling download`. This makes sure your [tools] are available on disk as required by the `elm-tooling.json` spec.
2. Creates links in your local `node_modules/.bin/` folder to the downloaded tools, just like the `elm` and `elm-format` npm packages do. This allows you to run things like `npx elm make src/Main.elm`, and your editor and build tools will automatically find them.

#### Comparison with the regular npm packages

The difference compared to installing the regular `elm` and `elm-format` packages are:

- Faster initial installs. `elm-tooling` downloads all tools in parallel, while the executable downloads for the regular `elm` and `elm-format` packages are serial.
- Faster subsequent installs. Once you’ve downloaded one version of a tool once you never need to download it again. This works by saving the binaries in a shared location rather than locally in each project.
- Less disk usage. Again, storing the binaries in a shared location saves tens of megabytes per project.
- Less npm dependencies. The `elm` and `elm-format` npm packages depend on 70 dependencies. `elm-tooling` has no npm dependencies at all.
- Security. `elm-tooling` ships with sha256 hashes for all tools it knows about and verifies that download files match. `elm-tooling` itself is hashed in your `package-lock.json` (which you commit).

#### Notes

- The `package.json` example above has `elm-tooling` in `"devDependencies"`. That makes sense since you only need `elm-tooling` for development and building your application, not at runtime in production. **But,** this has the consequence that `npm install --production`/`npm ci --production` will fail. Why? Because the `"postinstall"` script will still execute, and try to run `elm-tooling postinstall` – but `elm-tooling` isn’t even installed (`"devDependencies"` is ignored when using the `--production` flag). So what are your options?

  - Maybe you don’t even need `--production`. Some applications use `npm` only for a build step and does not have any production Node.js server or anything like that.
  - Try `--ignore-scripts`. This will skip the `"postinstall"` script – but also any scripts that your dependencies might run during installation! Sometimes, only `"devDependencies"` (such as node-sass) need to run scripts during installation – so try it! If `--ignore-scripts` works you have nothing to lose.
  - Make a little wrapper script that runs `elm-tooling postinstall` only if `elm-tooling` is installed. For example, you could write the script in JavaScript and use the [API version of the CLI][cli-api].
  - If you only need `--production` installs in for example a Dockerfile, try adding `RUN sed -i '/postinstall/d' package.json` to remove the `"postinstall"` script from `package.json` before running `npm install --production`. This specific example only works with GNU sed and if your `"postinstall"` script isn’t last (due to trailing commas being invalid JSON).
  - Move `elm-tooling` to `"dependencies"`. `elm-tooling` is small and has no dependencies so it won’t bloat your build very much. Set the `NO_ELM_TOOLING_POSTINSTALL` environment variable to turn `elm-tooling postinstall` into a no-op (see below).

- Due to a bug in `npm`, the `"name"` field _must_ exist in `package.json` if you have a `"postinstall"` script – otherwise `npm` crashes with a confusing message. Worse, in a Dockerfile `"name"` must match your current `WORKDIR` – otherwise `npm` refuses to run your `"postinstall"` script. See [npm/npm-lifecycle#49] for more information.

- If you’re using `npm`’s [ignore-scripts] setting, that also means your _own_ `postinstall` script won’t run. Which means that you’ll have to remember to run `npm run postinstall` or `npx elm-tooling postinstall` yourself. `npm` tends to keep stuff in `node_modules/.bin/` even when running `npm ci` (which claims to remove `node_modules/` before installation), so it should hopefully not be too much of a hassle.

- You can set the `NO_ELM_TOOLING_POSTINSTALL` environment variable to turn `elm-tooling postinstall` into a no-op. This lets you run `npm install` without also running `elm-tooling postinstall`, which can be useful in CI.

## CI

See the [Example GitHub Actions workflow] for inspiration. Even if you don’t use GitHub Actions it’s still a good resource – there’s a lot of comments and the concepts and steps should be fairly similiar regardless of what CI you use.

Basically, you need to:

1. Install npm packages, with `NO_ELM_TOOLING_POSTINSTALL` set. It’s nice to cache `node_modules` (based on your `package-lock.json`) for speed and reliability.

   Setting the `NO_ELM_TOOLING_POSTINSTALL` environment variable turns `elm-tooling postinstall` into a no-op, in case you have a `"postinstall": "elm-tooling postinstall"` script in your `package.json`. In CI it’s better to install npm packages and `elm-tooling.json` tools separately so you can cache `node_modules` and `~/.elm` separately.

2. Install tools from `elm-tooling.json`: `npx --no-install elm-tooling postinstall`. Make sure that `~/.elm` is cached (or `ELM_HOME` if you’ve set it), based on `elm.json` (because it lists your Elm dependencies and the Elm compiler installs packages into `~/.elm`) and `elm-tooling.json` (because it lists your tools and `elm-tooling` downloads them into `~/.elm`) as well as `review/elm.json` if you use [elm-review] or whatever other `elm.json` files you might have.

3. Run whatever commands you want.

## API

### elmToolingCli

Instead of using [child\_process.spawn], you can import the CLI and run it directly. That’s an easy way to make a cross-platform script.

Example:

```js
import elmToolingCli from "elm-tooling";

elmToolingCli(["postinstall"]).then(
  (exitCode) => {
    console.log("Exit", exitCode);
    process.exit(exitCode);
  },
  (error) => {
    console.error("Unexpected error", error);
  }
);
```

Here’s the full interface:

```ts
import * as stream from "stream";

export default function elmToolingCli(
  args: Array<string>,
  options?: {
    cwd: string;
    env: Record<string, string | undefined>;
    stdin: stream.Readable;
    stdout: stream.Writable;
    stderr: stream.Writable;
  }
): Promise<number>;
```

The default options use values from the `process` global.

### getExecutable

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
- `version`: A [`^` or `~` semver version range][semver-ranges]. The latest known version matching the range will be chosen. Note that the range _has_ to start with `^` or `~` (or `=` if you _really_ need an exact version) and _must_ be followed by 3 dot-separated digits (unlike `npm` you can’t leave out any numbers). Example: `"~0.19.0"`.
- `cwd`: The current working directory. Needed in case `ELM_HOME` is set to a relative path. Defaults to `process.cwd()`.
- `env`: Available environment variables. `ELM_HOME` can be used to customize where tools will be downloaded. `APPDATA` is used on Windows to find the default download location. Defaults to `process.env`.
- `onProgress`: This function is called repeatedly with a number from 0 to 1 if the tool needs to be downloaded. You can use this to display a progress bar.
- Returns: A promise that resolves to the absolute path to the tool.

If you need several tools you can use `Promise.all` to download them all in parallel.

Example:

```js
import getExecutable from "elm-tooling/getExecutable";
import * as child_process from "child_process";

getExecutable({
  name: "elm",
  version: "~0.19.0",
  onProgress: (percentage) => {
    // `percentage` is a number from 0 to 1.
    // This is only called if the tool does not already exist on disk and needs
    // to be downloaded.
    console.log(percentage);
  },
}).then((toolAbsolutePath) => {
  // `toolAbsolutePath` is the absolute path to the latest known elm 0.19.x executable.
  // Standard Node.js `child_process.spawn` and `child_process.spawnSync` work
  // great for running the executable, even on Windows.
  console.log(
    child_process.spawnSync(toolAbsolutePath, ["--help"], { encoding: "utf8" })
  );
}, console.error);
```

## Adding elm-tooling to an existing project

1. Install it: `npm install --save-dev elm-tooling`

2. Create an `elm-tooling.json`: `npx elm-tooling init`

3. Edit `elm-tooling.json`. For example, if you previously installed `elm` and `elm-format` using `npm`, copy their versions from `package.json` to `elm-tooling.json`. Then you can remove them from `package.json`. You also need to edit `"entrypoints"` in `elm-tooling.json` to match your project – `elm-tooling init` tries to detect them but might fail.

4. Install the tools in `elm-tooling.json`: `npx elm-tooling postinstall`

5. Add `"postinstall": "elm-tooling postinstall"` to your `package.json` scripts.

6. Check if there are any issues with your `elm-tooling.json`: `npx elm-tooling validate`

7. Run through your CI and build system and see if everything works or something needs to be tweaked. See the [Example GitHub Actions workflow] for inspiration.

## Creating a new project with elm-tooling

1. Create a folder and enter it: `mkdir my-app && cd my-app`

2. Create a `package.json`:

   ```json
   {
     "private": true,
     "name": "my-app",
     "scripts": {
       "postinstall": "elm-tooling postinstall"
     }
   }
   ```

3. Install `elm-tooling`: `npm install --save-dev elm-tooling`

4. Create an `elm-tooling.json`: `npx elm-tooling init`

5. Install the tools in `elm-tooling.json`: `npx elm-tooling postinstall`

6. Create an `elm.json`: `npx elm init`

7. Optional: Install whatever other `npm` packages and stuff you want.

8. Create the `src` folder: `mkdir src`

9. Create `src/Main.elm` and start coding!

## License

[MIT](LICENSE).

[child\_process.spawn]: https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
[cli-api]: #elmtoolingcli
[elm-review]: https://package.elm-lang.org/packages/jfmengels/elm-review/latest/
[elm-tooling.json]: https://github.com/lydell/elm-tooling.json
[example github actions workflow]: https://github.com/lydell/elm-tooling.json/blob/master/.github/workflows/example.yml
[ignore-scripts]: https://docs.npmjs.com/using-npm/config#ignore-scripts
[npm/npm-lifecycle#49]: https://github.com/npm/npm-lifecycle/issues/49
[postinstall]: https://docs.npmjs.com/misc/scripts
[semver-ranges]: https://docs.npmjs.com/misc/semver#tilde-ranges-123-12-1
[tools]: https://github.com/lydell/elm-tooling.json#tools
