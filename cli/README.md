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
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

```
npm install --save-dev elm-tooling
```

```
npx elm-tooling --help
```

## Commands

### elm-tooling init

Create a sample `elm-tooling.json` in the current directory. It tries to guess some values based on your project to help you get started.

### elm-tooling validate

Validate the closest `elm-tooling.json`. If you’re having trouble with some program not reading your `elm-tooling.json` correctly, try `elm-tooling validate` to check if you’ve made any mistakes.

### elm-tooling download

Download the [tools] in the closest `elm-tooling.json`.

This command just downloads stuff from the Internet and shoves it into a folder (basically, `~/.elm/elm-tooling/`). It does not provide you with an easy way to run the tools or anything. It’s up to other programs to support the shared location of binaries. But you can use `elm-tooling postinstall` to piggy-back on the well-supported `npm` ecosystem.

### elm-tooling postinstall

Download the [tools] in the closest `elm-tooling.json` and create links to them in `node_modules/.bin/`.

This is basically a drop-in replacement for installing `elm` and `elm-format` with `npm`. This lets you use the [tools] field of `elm-tooling.json` without your editor and build tools having to support it.

`package.json`:

```diff
 {
   "name": "my-package",
   "devDependencies": {
-    "elm": "0.19.1",
-    "elm-format": "0.8.3"
+    "elm-tooling": "0.1.4"
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
2. Creates links in your local `node_modules/.bin/` folder to the downloaded tools, just like the `elm` and `elm-format` npm packages do. This allows you to run things like `npx elm make src/Main.elm`, and your editor and build tools to automatically find them.

The difference compared to installing the regular `elm` and `elm-format` packages are:

- Faster initial installs. `elm-tooling` downloads all tools in parallel, while the binary downloads for the regular `elm` and `elm-format` packages are serial.
- Faster subsequent installs. Once you’ve downloaded one version of a tool once you never need to download it again. This works by saving the binaries in a shared location rather than locally in each project.
- Less disk usage. Again, storing the binaries in a shared location saves tens of megabytes per project.
- Less npm dependencies. The `elm` and `elm-format` npm packages depend on megabytes of dependencies. `elm-tooling` has no npm dependencies at all.

Note: If you’re using `npm`’s [ignore-scripts] feature, that also means your _own_ `postinstall` script won’t run. Which means that you’ll have to remember to run `npm run postinstall` or `npx elm-tooling postinstall` yourself.

## License

[MIT](LICENSE).

[elm-tooling.json]: https://github.com/lydell/elm-tooling.json
[ignore-scripts]: https://docs.npmjs.com/using-npm/config#ignore-scripts
[postinstall]: https://docs.npmjs.com/misc/scripts
[tools]: https://github.com/lydell/elm-tooling.json#tools
