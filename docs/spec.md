---
title: elm-tooling.json spec
nav_order: 7
---

# elm-tooling.json spec

**Note:** The description for `elm-tooling.json` used to include:

> …where unofficial Elm tools can collaborate on per-project configuration they need

**This is no longer the case!**

After more than one year since `elm-tooling.json` was created, _no_ new shared fields at all were added. And for the two existing fields – `"entrypoints"` and `"tools"` – only _one tool each_ used them.

When the Elm Language Server stopped needing `"entrypoints"` it was time to change what `elm-tooling.json` is all about. Now, it’s the file where the `elm-tooling` CLI stores your Elm tool versions. (But other tools are free to read it according to this spec, too!)

If you want to add configuration to a tool you work on, I recommend:

1. Try to see if you _really_ need configuration at all.
2. If you do, choose a file name that makes it obvious what it is for, like `elm-language-server.json`.
3. Use some other format than JSON if it makes sense.
4. If you go with JSON, consider providing a JSON schema for it so text editors can help with the format.
5. Include a CLI init command that can create the config file.

Owning your own config file is much more flexible than shoving everything into `elm-tooling.json`!

If two tools _do_ end up needing the same configuration in the future, I’m sure we’ll figure out something much better then! Until then – YAGNI.

## Motivation

The reasons for this spec document are:

- To help understand how `elm-tooling` works.
- To make sure that `elm-tooling` doesn’t use Node.js specific things. The idea is that using `elm-tooling.json` shouldn’t lock you into the Node.js ecosystem forever.

## File location

`elm-tooling.json` SHOULD generally be located next to an `elm.json` (in the same directory as an `elm.json`).

`elm-tooling.json` is for the particular Elm project defined by the `elm.json` next to it. There is no “global” `elm-tooling.json` – only project-local ones.

Example:

```
example-project
├── elm-tooling.json
├── elm.json
└── src
   └── Main.elm
```

## File contents

`elm-tooling.json` MUST contain a JSON object. The object MUST match this TypeScript type:

```ts
type ElmTooling = {
  tools?: {
    [name: string]: string;
  };
};
```

Example:

```json
{
  "tools": {
    "elm": "0.19.1",
    "elm-format": "0.8.3"
  }
}
```

For backwards compatibility, it’s ok to ignore the `"entrypoints"` field.

The `"tools"` field is a mapping between Elm tool names and the version of the tool.

By specifying versions _once\*_ in _one_ place…

- …you can automatically get the correct elm and elm-format versions, in the terminal and in your editor (whichever editor it is)
- …collaborators on your project can get the correct versions
- …your CI and build pipelines can get the correct versions

(…with the help of tools that read `elm-tooling.json`.)

(\*) For Elm applications, you also need to specify the Elm version in `elm.json`. For Elm packages, you specify a _range_ of compatible Elm versions in `elm.json`. `elm-tooling.json` keeps things simple by always specifying the elm version itself. (This also supports the more uncommon case where you have an `elm-tooling.json` but no `elm.json`.)

The tools MUST be located in a standard location: Inside `elm-tooling/` inside “Elm Home.” The Elm compiler stores downloaded packages and REPL history in a directory that I call “Elm Home.” The default location on Linux and macOS is `~/.elm/`, and on Windows it is `%APPDATA%\elm`. You can customize the location by setting the `ELM_HOME` environment variable.

The location of a tool can be resolved like this on Linux and macOS in `sh`, `bash` and `zsh`:

```bash
"${ELM_HOME:-$HOME/.elm}/elm-tooling/$name/$version/$name"
```

With the above example (and assuming that the `ELM_HOME` environment variable is not set) the following two tools should exist on Linux and macOS:

- `~/.elm/elm-tooling/elm/0.19.1/elm`
- `~/.elm/elm-tooling/elm-format/0.8.3/elm-format`

On a typical Windows setup (with a user called “John”), they would be:

- `C:\Users\John\AppData\Roaming\elm\elm-tooling\elm\0.19.1\elm.exe`
- `C:\Users\John\AppData\Roaming\elm\elm-tooling\elm-format\0.8.3\elm-format.exe`

Note that on Windows the `.exe` file extension is used, while on Linux and macOS no file extension is used.

An earlier version of this document stored all tools in the same directory with the version appended to the file name: `~/.elm/elm-tooling/elm0.19.1`. That works, but has the downside of `elm0.19.1` being printed in example commands in `elm --help`. The same issue also occurs with `elm-format`. The nested folder structure also theoretically supports tools with several executables per version, such as Elm 0.18 (which has `elm`, `elm-make`, `elm-package`, `elm-reactor` and `elm-repl`).

Consumers of `elm-tooling.json` MUST use the specified tools and MUST NOT use fallbacks if they are missing. Missing tools MUST be an error, or (if appropriate, and with the user’s permission) cause a download of the tool. Downloads SHOULD have security in mind.

If a tool _could_ be specified in the `"tools"` field but isn’t, it is up to the consumer to choose what to do.

Note: Tools which are written in Node.js (such as [node-test-runner]) need to be installed with `npm` via `package.json` and MUST NOT be specified in the `"tools"` field.

One _could_ argue that a missing or empty `"tools"` field should be an error, but for backwards compatibility it isn’t.
