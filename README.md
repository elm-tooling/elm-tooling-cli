# elm-tooling.json spec

This is a proposal for an `elm-tooling.json` file, where unofficial Elm tools can collaborate on configuration they need for a given project.

There are currently **zero known tools** using this file.

## File location

`elm-tooling.json` must be located next to a `elm.json`.

## Shape

`elm-tooling.json` must contain a JSON object, that matches this TypeScript type:

```ts
type ElmTooling = {
  entrypoints: Array<string>;
  binaries?: {
    [name: string]: string;
  };
};
```

### entrypoints

**Required**

A list of file paths, to the entrypoints of the project. Compiling all the entrypoints (and the files they import) should produce all compilation errors of the project.

File paths are always relative to the directory containing the `elm-tooling.json` file.

File paths must start with `./` to make it clear that they are relative.

File paths must use `/` as the directory separator. `\` is not a valid directory separator\*. Programs consuming file paths must convert `/` to `\` on Windows if needed.

The array must **not** be empty.

(\*) I think it’s good to avoid the backslash, since it’s used for escaping in JSON.

### binaries

**Optional**

A mapping between tool names and the version of the tool.

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

The binaries must be located in a standard location.

The location of a binary can be resolved like this (bash):

```bash
dir="${ELM_HOME:-$HOME/.elm}"
binary="$dir/elm-tooling/$name$version"
```

With the above example (and assuming that the `ELM_HOME` environment variable) the following two binaries should exist:

- `~/.elm/elm-tooling/elm0.19.1`
- `~/.elm/elm-tooling/elm-format0.8.3`

Tools must use the specified binaries and must not fall back to any other binary if they are missing. Missing binaries must be an error, or (if appropriate, and with the user’s permission) cause a download of the binary. Downloads should have security in mind.

If a binary _could_ be specified in the `"binaries"` field but isn’t, it is up to the tool to choose what to do.

Note: Tools, such as elm-test, that require Node.js must be installed with `npm` via package.json and must **not** be specified in the `"binaries"` field.

TODO: Specify Windows details. The idea is that the binaries must be located inside `elm-tooling/` inside the “elm home directory.”

If the `"binaries"` field is missing or empty, it means that the project does not wish to use the standard location of binaries (probably for legacy reasons), but still want to take advantage of other parts of `elm-tooling.json`.

## License

Public domain
