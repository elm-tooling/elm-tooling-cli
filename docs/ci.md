---
title: CI setup
nav_order: 6
---

# CI setup

This page explains how to install Elm tools from `elm-tooling.json` in a Continuous Integration (CI) scenario, such as GitHub Actions.

See the [Example GitHub Actions workflow](https://github.com/elm-tooling/elm-tooling-cli/blob/main/.github/workflows/example.yml) for inspiration. Even if you don’t use GitHub Actions it’s still a good resource – there’s a lot of comments and the concepts and steps should be fairly similar regardless of what CI you use.

Basically, you need to:

1. Install npm packages, with `NO_ELM_TOOLING_INSTALL` set. It’s nice to cache `node_modules` (based on your `package-lock.json`) for speed and reliability.

   Setting the `NO_ELM_TOOLING_INSTALL` environment variable turns `elm-tooling install` into a no-op, in case you have a `"postinstall": "elm-tooling install"` script in your `package.json`. In CI it’s better to install npm packages and `elm-tooling.json` tools separately so you can cache `node_modules` and `~/.elm` separately.

2. Install tools from `elm-tooling.json`: `npx --no-install elm-tooling install`. Make sure that `~/.elm` is cached (or `ELM_HOME` if you’ve set it), based on `elm.json` (because it lists your Elm dependencies and the Elm compiler installs packages into `~/.elm`) and `elm-tooling.json` (because it lists your tools and `elm-tooling` downloads them into `~/.elm`) as well as `review/elm.json` if you use [elm-review](https://package.elm-lang.org/packages/jfmengels/elm-review/latest/) or whatever other `elm.json` files you might have.

   Note that Windows uses `%APPDATA%\elm` rather than `~/.elm`. If you need to run the same CI workflow both Windows and some other OS, [set `ELM_HOME` to a directory that works everywhere](https://github.com/rtfeldman/node-test-runner/blob/dafa12e58043915bdd8fcd7d2231ccff511a7827/.github/workflows/test.yml#L18-L19).

3. Run whatever commands you want.
