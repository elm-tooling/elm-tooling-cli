# elm-tooling.json spec

This is a proposal for an `elm-tooling.json` file, where unofficial Elm tools can collaborate on per-project configuration they need.

There are currently **zero known tools** using this file.

## File location

`elm-tooling.json` must be located next to an `elm.json` (in the same directory as an `elm.json`).

`elm-tooling.json` contains stuff for the particular Elm project defined by the `elm.json` next to it. There is no “global” `elm-tooling.json` – only project-local ones.

Example:

```
example-project
├── elm-tooling.json
├── elm.json
└── src
   └── Main.elm
```

## Shape

`elm-tooling.json` must contain a JSON object, which matches this TypeScript type:

```ts
type ElmTooling = {
  entrypoints: Array<string>;
  binaries?: {
    [name: string]: string;
  };
};
```

Example:

```json
{
  "entrypoints": ["src/Main.elm"],
  "binaries": {
    "elm": "0.19.1",
    "elm-format": "0.8.3"
  }
}
```

### entrypoints

**Required**

A list of file paths, to the Elm entrypoint files of the project (the ones with `main =` in them, basically). Compiling all the entrypoints (and the files they import) should produce all compilation errors (if any) of the project.\*

File paths are always relative to the directory containing the `elm-tooling.json` and `elm.json` files.

File paths must start with `./` to make it clear that they are relative.

File paths must use `/` as the directory separator. `\` is not a valid directory separator†. Programs consuming file paths must convert `/` to `\` on Windows if needed.

The array must **not** be empty.

(\*) Excluding tests. I guess you could compile every `.elm` file (recursively?) in `tests/`. Or maybe it’s easier to just run the tests?

(†) I think it’s good to avoid the backslash, since it’s used for escaping in JSON.

### binaries

**Optional**

A mapping between Elm tool names and the version of the tool.

By specifying versions _once\*_ in _one_ place…

- …you can automatically get the correct elm and elm-format versions, in the terminal and in your editor (whichever editor it is)
- …collaborators on your project can get the correct versions
- …your CI and build pipeplines can get the correct versions

(…with the help of tools that read `elm.tooling.json`.)

(\*) For Elm applications, you also need to specify the Elm version in `elm.json`. For Elm packages, you specify a _range_ of compatible Elm versions in `elm.json`. `elm-tooling.json` keeps things simple by always specifying the elm version itself.

For example, the following means that the project uses elm 0.19.1 and elm-format 0.8.3:

```json
{
  "binaries": {
    "elm": "0.19.1",
    "elm-format": "0.8.3"
  }
}
```

Each tool name must correspond to a single binary.

The binaries must be located in a standard location: Inside `elm-tooling/` inside “Elm Home.” The Elm compiler stores downloaded packages and REPL history in a directory that I call “Elm Home.” The default location on Linux and macOS is `~/.elm/`. You can customize the location by setting the `ELM_HOME` environment variable. (I’m not sure how this works on Windows.) So the default location of binaries on Linux and macOS is `~/.elm/elm-tooling/`.

The location of a binary can be resolved like this in `sh`, `bash` and `zsh`:

```bash
# Set `dir` to the value of the `ELM_HOME` environment variable, and default to
# `~/.elm` if `ELM_HOME` is not set.
dir="${ELM_HOME:-$HOME/.elm}"
# Set `binary` to the above `dir`, plus `/elm-tooling/`, plus the name of the
# binary, plus the version of the binary.
binary="$dir/elm-tooling/$name$version"
```

With the above example (and assuming that the `ELM_HOME` environment variable is not set) the following two binaries should exist:

- `~/.elm/elm-tooling/elm0.19.1`
- `~/.elm/elm-tooling/elm-format0.8.3`

Tools must use the specified binaries and must not fall back to any other binary if they are missing. Missing binaries must be an error, or (if appropriate, and with the user’s permission) cause a download of the binary. Downloads should have security in mind.

If a binary _could_ be specified in the `"binaries"` field but isn’t, it is up to the tool to choose what to do.

Note: Tools, such as elm-test, that require Node.js must be installed with `npm` via package.json and must **not** be specified in the `"binaries"` field.

If the `"binaries"` field is missing or empty, it means that the project wants to take advantage of other parts of `elm-tooling.json`, but isn’t ready to buy into `elm-tooling.json`’s way of handling binaries. For example, an existing project might want to use `"entrypoints"` but is fine with continuing to use `npm` to install Elm for the time being.

## License

Public domain
