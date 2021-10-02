---
title: CLI reference
nav_order: 4
---

<!-- prettier-ignore-start -->

# CLI reference
{: .no_toc }

1. TOC
{:toc}

<!-- prettier-ignore-end -->

Note: None of the commands take any arguments.

## elm-tooling init

Create a sample `elm-tooling.json` in the current directory. It tries to guess some values based on your project to help you get started.

## elm-tooling tools

Interactively add, remove and update tools in your `elm-tooling.json`. This is an alternative to editing the `"tools"` field by hand.

_Note:_ You need to update `elm-tooling` itself to get new tool versions! See [Which tools are supported?](../faq#which-tools-are-supported)

## elm-tooling install

`elm-tooling install` does two things:

1. Makes sure the [tools](../spec#tools) in the closest `elm-tooling.json` are available on disk. Downloads them if missing.
2. Creates links in your local `./node_modules/.bin/` folder to the downloaded tools, just like the `elm`, `elm-format`, etc, npm packages do. This allows you to run things like `npx elm make src/Main.elm`, and your editor and build tools will automatically find them. (The `node_modules/` folder is always located next to your `elm-tooling.json`.)

In other words, `elm-tooling install` is a drop-in replacement for installing for example `elm` and `elm-format` with `npm`.

You can use `npx` to run the installed tools. For example, `npx elm --help`.

You can set `ELM_HOME` environment variable to customize where tools will be downloaded. The Elm compiler uses this variable too for where to store packages.

`elm-tooling` uses `curl` to download stuff if it exists, otherwise `wget`, and finally the `https` Node.js core module. So if you need to do any proxy stuff or something like that, you do that via the environment variables and config files that `curl` and `wget` understand. For example, [curl proxy environment variables](https://everything.curl.dev/usingcurl/proxies#proxy-environment-variables). Most systems – even Windows! – come with either `curl` or `wget`.

Similarly, `tar` is used to extract archives. Even Windows comes with `tar` these days so you shouldn’t need to install anything.

See also [Quirks](../quirks).
