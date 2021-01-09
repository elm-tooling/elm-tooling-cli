# CLI reference

- [elm-tooling init](#elm-tooling-init)
- [elm-tooling validate](#elm-tooling-validate)
- [elm-tooling tools](#elm-tooling-tools)
- [elm-tooling install](#elm-tooling-install)

## elm-tooling init

Create a sample `elm-tooling.json` in the current directory. It tries to guess some values based on your project to help you get started.

## elm-tooling validate

Validate the closest `elm-tooling.json`. If you’re having trouble with some program not reading your `elm-tooling.json` correctly, try `elm-tooling validate` to check if you’ve made any mistakes.

## elm-tooling tools

Interactively add, remove and update tools in your `elm-tooling.json`. This is an alternative to editing the `"tools"` field by hand.

_Note:_ You need to update `elm-tooling` itself to get new tool versions! See [Which tools are supported?](./faq#which-tools-are-supported)

## elm-tooling install

`elm-tooling install` does two things:

1. Makes sure the [tools](./spec#tools) in the closest `elm-tooling.json` are available on disk. Downloads them if missing.
2. Creates links in your local `node_modules/.bin/` folder to the downloaded tools, just like the `elm`, `elm-format`, etc, npm packages do. This allows you to run things like `npx elm make src/Main.elm`, and your editor and build tools will automatically find them.

In other words, `elm-tooling install` is a drop-in replacement for installing for example `elm` and `elm-format` with `npm`.

You can use `npx` to run the installed tools. For example, `npx elm --help`.

You can set `ELM_HOME` environment variable to customize where tools will be downloaded. The Elm compiler uses this variable too for where to store packages.

`elm-tooling` uses `curl` to download stuff if it exists, otherwise `wget`, and finally the `https` Node.js core module. So if you need to do any proxy stuff or something like that, you do that via the environment variables and config files that `curl` and `wget` understand. Most systems – even Windows! – come with either `curl` or `wget`.

Similarly, `tar` is used to extract archives. Even Windows comes with `tar` these days so you shouldn’t need to install anything.

See also [Quirks](./quirks).
