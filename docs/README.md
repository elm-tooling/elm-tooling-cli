# elm-tooling

- [Getting started](./getting-started)
- [FAQ](./faq)
- [elm-tooling.json spec](./spec)
- [CLI reference](./cli)
- [API reference](./api)
- [CI setup](./ci)
- [Quirks](./quirks)

## What is this and why should I care?

[elm-tooling.json](./spec) is a file where Elm tools can put their configuration. This allows having configuration in one single place and reusing stuff between tools.

[elm-tooling] is a CLI tool that manages your `elm-tooling.json` and installs Elm tools. `elm-tooling init` creates `elm-tooling.json`, and `elm-tooling install` installs all tools specified in there in a fast and secure way. It’s a drop-in replacement for installing tools using `npm`.

**Read more in the [FAQ](./faq).**

(“elm-tooling” is also the name of a GitHub organization ([github.com/elm-tooling](https://github.com/elm-tooling)) that includes the [Elm language server] and the `elm-tooling` CLI.)
