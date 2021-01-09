---
nav_order: 3
---

<!-- prettier-ignore-start -->

# FAQ
{: .no_toc }

1. TOC
{:toc}

<!-- prettier-ignore-end -->

## Why install Elm tools using `elm-tooling` instead of `npm`?

Installing `elm`, `elm-format` and `elm-json` using `npm` and `elm-tooling`:

| Metric                | npm        | elm-tooling |
| --------------------- | ---------- | ----------- |
| Number of packages    | 70         | 1           |
| `node_modules/` size  | 45 MB      | 120 KB      |
| Installation time     | 9 s        | 2 s         |
| Re-installation time  | 9 s        | 0.5 s       |
| Processing            | Sequential | Parallel    |
| Download verification | None       | SHA256      |

Comments:

- Number of packages: Why are 70 npm packages installed just to get `elm`, `elm-format` and `elm-json` onto my computer?

- `node_modules/` size: How can `elm-tooling` be so much smaller?

  - Some of the 70 `npm` packages are pretty heavy.
  - `elm-tooling` puts the executables in a central location (`~/.elm/elm-tooling`) instead of in the local `node_modules/` folder.

  (Measured on macOS; executables vary slightly in size between macOS, Linux and Windows (also disk block size).)

- Installation time, re-installation time and processing: This of course depends on your Internet speed. `elm-tooling` is faster because:

  - There’s just 1 npm package to install instead of 70.
  - The executables are fetched in parallel (all at the same time) instead of sequential (one after the other). (`yarn` to run package postinstall scripts in parallel, but on the flip it also seems to unnecessarily trigger them more often.)
  - For a re-installation (removed `node_modules/` folder, for example), `elm-tooling install` becomes basically a no-op. All executables already exist in `~/.elm/elm-tooling` so there’s not much to do.

  9 seconds vs 2 seconds might not sound like much. 2 seconds feels near-instant, while 9 seconds is more of a “meh” experience. 0.5 seconds really feels instant, and is a god send if you ever switch between git branches with big changes to `package.json` between them.

- Download verification: Security. `elm-tooling` ships with SHA256 hashes for all tools it knows about and verifies that download files match. `elm-tooling` itself is hashed in your `package-lock.json` (which you commit). The `elm`, `elm-format` and `elm-json` npm packages on the other hand download stuff without verifying what they got.

Finally, the `elm`, `elm-format` and `elm-json` npm packages are essentially hacks. The `elm` npm package for instance does not contain Elm at all. It just contains some code that _downloads_ Elm using a postinstall script (or at the first run).

<details>

<summary>Terminal output</summary>

This is what a typical `npm install` looks like for an Elm project:

```
$ npm install

> elm@0.19.1-3 install /Users/you/my-app/node_modules/elm
> node install.js

--------------------------------------------------------------------------------

Downloading Elm 0.19.1 from GitHub.

NOTE: You can avoid npm entirely by downloading directly from:
https://github.com/elm/compiler/releases/download/0.19.1/binary-for-mac-64-bit.gz
All this package does is download that file and put it somewhere.

--------------------------------------------------------------------------------


> elm-format@0.8.4 install /Users/you/my-app/node_modules/elm-format
> binwrap-install


> elm-json@0.2.8 install /Users/you/my-app/node_modules/elm-json
> binwrap-install

added 70 packages from 69 contributors and audited 70 packages in 9.122s
```

Compare that with an `npm install` using `elm-tooling install`:

```
$ npm install

> my-app@ postinstall /Users/you/my-app
> elm-tooling install

/Users/you/my-app/elm-tooling.json
100% elm 0.19.1
100% elm-format 0.8.4
100% elm-json 0.2.8
elm 0.19.1 link created: node_modules/.bin/elm -> /Users/you/.elm/elm-tooling/elm/0.19.1/elm
    To run: npx elm
elm-format 0.8.4 link created: node_modules/.bin/elm-format -> /Users/you/.elm/elm-tooling/elm-format/0.8.4/elm-format
    To run: npx elm-format
elm-json 0.2.8 link created: node_modules/.bin/elm-json -> /Users/you/.elm/elm-tooling/elm-json/0.2.8/elm-json
    To run: npx elm-json
added 1 package from 1 contributor and audited 1 package in 2.186s
```

And a re-installation:

```
$ npm install

> my-app@ postinstall /Users/you/my-app
> elm-tooling install

/Users/you/my-app/elm-tooling.json
elm 0.19.1: all good
elm-format 0.8.4: all good
elm-json 0.2.8: all good
audited 1 package in 0.487s
```

</details>

## When should I use `elm-tooling` to install tools?

In short: For the same reasons you’d install tools using `npm`.

If you’re just starting out, don’t forget to check out the official documentation as well:

- [Guide: Install](https://guide.elm-lang.org/install/elm.html)
- [npm installer](https://github.com/elm/compiler/tree/master/installers/npm)

But if you’re already familiar with installing stuff with `npm` you might think it’s just as easy to start with `elm-tooling`. It doesn’t really matter.

### For Elm applications

When a new Elm version comes out, your old projects will continue to work since they have a fixed local Elm version.

You’ll also avoid formatting changes going back and forth due to different contributors having different versions of `elm-format`.

### For Elm packages

For the same reasons as for Elm applications. Make it easy for contributors to get the correct versions of all tools.

### For Elm tools

Have you written an Elm related tool in Node.js? If your tool calls for example `elm`, `elm-format` or `elm-json` you’re gonna need those tools locally for development, as well as in CI. You can use `elm-tooling.json` and `elm-tooling install` for this purpose.

Note:

- Don’t make `elm-tooling.json` part of your `npm` package. `elm-tooling.json` is only for development and CI, not for production code. Use the [getExecutable API](./api#getexecutable) if you need to depend on some other tool.
- Use `"prepare": "elm-tooling install"` instead of `"postinstall": "elm-tooling install"`. See [Quirks](./quirks).

## Who uses `elm-tooling`?

[elm-test](https://github.com/rtfeldman/node-test-runner) and [elm-review](https://github.com/jfmengels/node-elm-review) (upcoming versions) both use `elm-tooling` to install [elm-json](https://github.com/zwilias/elm-json).

The [elm-pages-starter](https://github.com/dillonkearns/elm-pages-starter) template uses `elm-tooling.json` and `elm-tooling` to install `elm` and `elm-format`.

## Is `elm-tooling` stable?

Yes! It’s tested on macOS, Linux and Windows, and has great test coverage. It’s written in strict TypeScript, and focuses and handling errors at all points. There are no planned features, other than adding support for new tools and versions as they come, and adding validation for new fields in `elm-tooling.json` as they are invented.

## Can I install the tools globally?

There’s no global `elm-tooling.json`. Only local, per-project ones.

As long as you define the needed tools in every project, you don’t really need global installations. Use `npx elm` and `npx elm-format` etc.

If you want a global `elm` command you could try the [official installer](https://guide.elm-lang.org/install/elm.html).

On macOS and Linux, you could add symlinks in your `$PATH`. For example, on macOS:

```
ln -s ~/.elm/elm-tooling/elm/0.19.1/elm /usr/local/bin/elm
```

## How do I uninstall?

- To remove `elm-tooling` itself from a project, run `npm uninstall elm-tooling` inside it.

- To remove downloaded executables, remove the directory where `elm-tooling` puts them. The default locations are:

  - macOS and Linux: `~/.elm/`
  - Windows: `%APPDATA%\elm` (for example, `C:\Users\John\AppData\Roaming\elm\elm-tooling`)

## What’s the difference compared to `asdf`?

The [asdf](https://asdf-vm.com/) version manager has support for [Elm](https://github.com/asdf-community/asdf-elm) and [elm-format](https://github.com/mariohuizar/asdf-elm-format). Here are some differences:

- `asdf` supports macOS and Linux, while `elm-tooling` also supports Windows.
- `asdf` does not verify what it downloaded, while `elm-tooling` uses SHA256 to check downloads.
- `asdf` requires collaborators to use `asdf` as well (or figure out themselves how to get the correct versions of all tools), while `elm-tooling` only requires Node.js and `npm` which are more commonly installed.

## Which tools are supported?

Since Elm tools are so few and update so infrequently, `elm-tooling` can go with a very simple and reliable approach: Supported tool names, versions and SHA256 are hard coded – see [known-tools](https://github.com/elm-tooling/elm-tooling-cli/blob/main/helpers/known-tools.ts).

Open an issue or pull request if you’d like to see support for another tool or version!

Will `elm-tooling` outgrow this approach some day? Yeah, maybe. But until then – [KISS](https://en.wikipedia.org/wiki/KISS_principle)!

Only supporting Elm tooling rather than trying to be a generalized installation tool allows `elm-tooling` to be much simpler and laser focused on making the Elm experience as good as possible.

## Are Node.js based tools such as `elm-review` supported?

The CLI for `elm-review` is written in Node.js and uses other npm packages. You can’t beat `npm` (or other Node.js package managers) when it comes to installing npm packages.

So Node.js based tools are not supported. Only tools that are distributed as platform specific executables are.

## Why does `elm-tooling` put stuff in `node_modules/.bin/`?

Installing stuff into the local `node_modules/.bin/` folder might sound strange at first, but piggy-backing on the well-supported `npm` ecosystem is currently the best way of doing things. This lets you use the [tools](./spec#tools) field of `elm-tooling.json` without your editor and build tools having to support it.

## _What_ does `elm-tooling` put in `node_modules/.bin/`?

On macOS and Linux, `node_modules/.bin/` only contains symlinks. These symlinks point to executable files. The executables don’t even need to invoke Node.js! So `elm-tooling install` simply puts symlinks in `node_modules/.bin/` too. For example, `node_modules/.bin/elm` could point to `~/.elm/elm-tooling/elm/0.19.1/elm`.

On Windows, `npm` creates three shell scripts (cmd, PowerShell and sh) per executable in `node_modules/.bin/`, in lieu of symlinks. `elm-tooling install` mimics these shell scripts, but they are much simpler. All they need to do is invoke an executable in `%APPDATA%\elm`, passing along all arguments.

## Is running stuff with `npx` slow?

`npx` is written in Node.js. All Node.js tools have a ~200 ms startup cost. Other than that there’s no difference.

## Is `elm-tooling` forever locked into the npm ecosystem?

No!

The `elm-tooling` CLI could be written in something other than Node.js.

Instead of using for example `npx elm` to run tools, we could have `elm-tooling run elm`. `elm-tooling run` would read `elm-tooling.json` to find which version of the tool to use, and also add any _other_ tools in `elm-tooling.json` to `$PATH` for the execution. This way tools can do stuff like `spawn("elm")` and get the correct version as if it was installed globally.

IDE:s and editors would have to support `elm-tooling.json` somehow, too, though, instead of looking for executables in `./node_modules/.bin/`. I’m sure we would find a solution there, but for the time being it’s much easier for `elm-tooling` to mimic the `npm` stuff so things just work.

## What’s the point of having `elm-json` in `elm-tooling.json`?

[elm-test](https://github.com/rtfeldman/node-test-runner) and [elm-review](https://github.com/jfmengels/node-elm-review) (upcoming versions) both use `elm-tooling` to install [elm-json](https://github.com/zwilias/elm-json).

By having `elm-json` in `elm-tooling.json` you can download _all_ executables in parallel in one go.

For people who aren’t Elm experts, it’s nice to have `elm-json` available for all contributors. It’s often easier to install Elm packages using `elm-json` than `elm install`.

## Why not put stuff in `elm.json` instead?

`elm` has a tendency to remove keys it does not recognize whenever it updates `elm.json`.
