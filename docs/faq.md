---
title: FAQ
nav_order: 3
---

<!-- prettier-ignore-start -->

# FAQ
{: .no_toc }

1. TOC
{:toc}

<!-- prettier-ignore-end -->

## Comparison with the `elm` and `@lydell/elm` npm packages

> The official `elm` npm package used to have a lot of heavy dependencies and no verification of the downloaded binaries, but that has been fixed since version 0.19.1-6 of the `elm` npm package, which is amazing! This makes the below comparisons seem a bit silly.

| Metric | `elm` npm package (>=0.19.1-6) | [@lydell/elm](https://github.com/lydell/compiler/tree/zero-deps-arm-lydell/installers/npm) npm package | `elm-tooling` |
| --- | --- | --- | --- |
| Number of packages | 2 | 2 | 1 |
| extra npm package metadata requests | 4 (one for every supported platform) | 6 (one for every supported platform) | 0 (no dependencies) |
| npm deprecation warnings | 0 | 0 | 0 |
| `node_modules/` size, not counting binaries | 32 KiB | 32 KiB | 124 KiB |
| Installation time | 3 s | 3 s | 2 s |
| Re-installation time | 0.5 s | 0.5 s | 0.3 s |
| Download verification | SHA512 | SHA512 | SHA256 |
| Supports macOS ARM | Yes | Yes | Yes |
| Supports Linux ARM | **No** | Yes | Yes |
| Binary location, npm | Every `node_modules/` | Every `node_modules/` | Once in `~/.elm/elm-tooling/` |
| Binary location, [pnpm](https://pnpm.io/) | Once in a shared location | Once in a shared location | Once in `~/.elm/elm-tooling/` |

In other words, compared to the official `elm` npm package and the unofficial `@lydell/elm` npm package, `elm-tooling` offers:

- More binaries than `elm`. The same binaries as `@lydell/elm`.
- No duplication of the binary in every project. But that’s up to which package manager you use. [pnpm](https://pnpm.io/) gives the same effect.
- Faster installation in theory, but in practice no difference.
- Faster execution on Windows. npm packages _have_ to use a Node.js wrapper around binaries on Windows, which adds ~100 ms startup time. `elm-tooling` uses a `.cmd` file which executes instantly.
- Faster execution when using [Yarn 2+ (Berry)](https://yarnpkg.com/). Yarn 2+ _requires_ a Node.js wrapper around binaries, which adds ~100 ms startup time. `elm-tooling` uses a symlink or `.cmd` file which executes instantly.
- So in summary: Not much. `elm-tooling` even has a potential downside: There are mirrors for npmjs.com, while `elm-tooling` always downloads from github.com.

## Comparison with the `elm-format`, `elm-json` and `elm-test-rs` npm packages

- elm-format: Version 0.8.6 and later use the `@lydell/elm` approach! 🎉
- elm-json: Similar to `elm`, but more dependencies (65, 6.4 MiB). 👉 [Pull request for switching to the `@lydell/elm` approach](https://github.com/zwilias/elm-json/pull/51)
- elm-test-rs: Uses the `@lydell/elm` approach! 🎉

## Why should I use `elm-tooling` to install tools?

In short: For the same reasons you’d install tools using `npm`.

If you’re just getting started, install Elm whatever way you think is the easiest so you can get started coding. Installing Elm globally using the official installer can be a great way. But if you’re already familiar with installing stuff with `npm` it might be just as easy to start with `elm-tooling`. It doesn’t really matter. You can always change the installation method later.

Don’t forget to check out the official documentation as well:

- [Guide: Install](https://guide.elm-lang.org/install/elm.html)
- [npm installer](https://github.com/elm/compiler/tree/master/installers/npm)

### For Elm applications

When a new Elm version comes out, your old projects will continue to work since they have a fixed local Elm version. Now, new Elm versions aren’t released very often so it’s not a super big deal, but when a new version does come out it’s nice not having to upgrade each and every project at the same time.

`elm-format` releases a little bit often than Elm, and even with a patch release there can be tiny formatting changes. You wouldn’t want two contributors using different elm-format versions and format files back and forth all the time.

### For Elm packages

For the same reasons as for Elm applications. Make it easy for contributors to get the correct versions of all tools.

### For Elm tools

Have you written an Elm related tool in Node.js? If your tool calls for example `elm`, `elm-format` or `elm-json` you’re gonna need those tools locally for development, as well as in CI. You can use `elm-tooling.json` and `elm-tooling install` for this purpose.

Note:

- Don’t make `elm-tooling.json` part of your `npm` package. `elm-tooling.json` is only for development and CI, not for production code. Use the [getExecutable API](../api#getexecutable) if you need to depend on some other tool.
- Use `"prepare": "elm-tooling install"` instead of `"postinstall": "elm-tooling install"`. See [Quirks](../quirks).

## How does `elm-tooling install` work?

In `elm-tooling.json` you can specify your tools:

<!-- prettier-ignore -->
```json
{
    "tools": {
        "elm": "0.19.1",
        "elm-format": "0.8.4"
    }
}
```

`elm-tooling install` downloads the tools you’ve specified to “Elm home” (if they don’t exist already). After using `elm-tooling` in a couple of projects you might end up with something like this:

```
~/.elm/elm-tooling
├── elm
│  └── 0.19.1
│     └── elm
├── elm-format
│  ├── 0.8.3
│  │  └── elm-format
│  └── 0.8.4
│     └── elm-format
└── elm-json
   └── 0.2.8
      └── elm-json
```

`elm-tooling install` then creates links in your local `./node_modules/.bin/` folder:

```
./node_modules/.bin/elm -> ~/.elm/elm-tooling/elm/0.19.1/elm
./node_modules/.bin/elm-format -> ~/.elm/elm-tooling/elm-format/0.8.4/elm-format
```

The algorithm is roughly:

1. Find an `elm-tooling.json` up the directory tree.

2. For every tool/version pair in `"tools"`:

   1. Look it up in the built-in list of known tools, to get the URL to download from and the expected number of bytes and SHA256 hash.

   2. Unless the executable already exists on disk in `~/.elm/`:

      1. Download the URL using `curl`, `wget` or Node.js’ `https` module.

      2. Verify that the downloaded contents has the expected number of bytes.

      3. Verify that the downloaded contents has the expected SHA256 hash.

      4. Extract the executable using `tar` or Node.js’ `zlib` module (`gunzip`).

      5. Make sure the extracted file is executable (`chmod +x`).

   3. Create a link in `./node_modules/.bin/`. (The `node_modules/` folder is always located next to your `elm-tooling.json`.)

## Is `elm-tooling` stable?

Yes! It’s tested on macOS, Linux and Windows, and has great test coverage. It’s written in strict TypeScript, and focuses on handling errors at all points.

## Can I install the tools globally?

There’s no global `elm-tooling.json`. Only local, per-project ones.

As long as you define the needed tools in every project, you don’t really need global installations. Use `npx elm` and `npx elm-format` etc. A benefit of _not_ having global installations is that you can never run the global version instead of the project version by mistake.

If you want a global `elm` command you could try the [official installer](https://guide.elm-lang.org/install/elm.html), the [elm npm package](https://www.npmjs.com/package/elm) or [brew](https://formulae.brew.sh/formula/elm#default).

On macOS and Linux, you could alternatively add symlinks in your `$PATH`. For example, on macOS:

```
ln -s ~/.elm/elm-tooling/elm/0.19.1/elm /usr/local/bin/elm
```

Another approach would be to create a “project” somewhere, and put its `./node_modules/.bin/` in `$PATH`. For example, you could add `~/my-global-elm-tooling/node_modules/.bin/`. Beware that `./node_modules/.bin/` might contain more things than just `elm` and `elm-format` etc, depending on what npm packages you (indirectly) install.

## How do I uninstall?

- To remove `elm-tooling` itself from a project, run `npm uninstall elm-tooling` inside it.

- To remove downloaded executables, remove the directory where `elm-tooling` puts them. The default locations are:

  - macOS and Linux: `~/.elm/elm-tooling/`
  - Windows: `%APPDATA%\elm` (for example, `C:\Users\John\AppData\Roaming\elm\elm-tooling`)

  If you’d like to remove just one executable, here are some example paths to look at:

  - macOS and Linux: `~/.elm/elm-tooling/elm/0.19.1/elm`
  - Windows: `C:\Users\John\AppData\Roaming\elm\elm-tooling\elm\0.19.1\elm.exe`

## What’s the difference compared to `asdf`?

The [asdf](https://asdf-vm.com/) version manager has support for [Elm](https://github.com/asdf-community/asdf-elm) and [elm-format](https://github.com/mariohuizar/asdf-elm-format). Here are some differences:

- `asdf` supports macOS and Linux, while `elm-tooling` also supports Windows.
- `asdf` does not verify what it downloaded, while `elm-tooling` uses SHA256 to check downloads.
- `asdf` requires collaborators to use `asdf` as well (or figure out themselves how to get the correct versions of all tools), while `elm-tooling` only requires Node.js and `npm` which are more commonly installed.

## Which tools are supported?

Since Elm tools are so few and update so infrequently, `elm-tooling` can go with a very simple and reliable approach: Supported tool names, versions and SHA256 are hard coded – see [KnownTools.ts](https://github.com/elm-tooling/elm-tooling-cli/blob/main/src/KnownTools.ts).

Open an issue or pull request if you’d like to see support for another tool or version!

Will `elm-tooling` outgrow this approach some day? Yeah, maybe. But until then – [KISS](https://en.wikipedia.org/wiki/KISS_principle)!

Only supporting Elm tooling rather than trying to be a generalized installation tool allows `elm-tooling` to be much simpler and laser focused on making the Elm experience as good as possible.

## Are Node.js based tools such as `elm-review` supported?

The CLI for `elm-review` is written in Node.js and uses other npm packages. You can’t beat `npm` (or other Node.js package managers) when it comes to installing npm packages.

So Node.js based tools are not supported. Only tools that are distributed as platform specific executables are.

## Why does `elm-tooling` put stuff in `node_modules/.bin/`?

Installing stuff into the local `node_modules/.bin/` folder might sound strange at first, but piggy-backing on the well-supported `npm` ecosystem is currently the best way of doing things. This lets you use the [tools](../spec#tools) field of `elm-tooling.json` without your editor and build tools having to support it.

## _What_ does `elm-tooling` put in `node_modules/.bin/`?

On macOS and Linux, `node_modules/.bin/` only contains symlinks. These symlinks point to executable files. The executables don’t even need to invoke Node.js! So `elm-tooling install` simply puts symlinks in `node_modules/.bin/` too. For example, `node_modules/.bin/elm` could point to `~/.elm/elm-tooling/elm/0.19.1/elm`.

On Windows, `npm` creates three shell scripts (cmd, PowerShell and sh) per executable in `node_modules/.bin/`, in lieu of symlinks. `elm-tooling install` mimics these shell scripts, but they are much simpler. All they need to do is invoke an executable in `%APPDATA%\elm`, passing along all arguments.

## Is running stuff with `npx` slow?

`npx` is written in Node.js. All Node.js tools have at least ~100 ms startup cost. Other than that there’s no difference.

## Is `elm-tooling` forever locked into the npm ecosystem?

No!

The `elm-tooling` CLI could be written in something other than Node.js.

Instead of using for example `npx elm` to run tools, we could have `elm-tooling run elm`. `elm-tooling run` would read `elm-tooling.json` to find which version of the tool to use, and also add any _other_ tools in `elm-tooling.json` to `$PATH` for the execution. This way tools can do stuff like `spawn("elm")` and get the correct version as if it was installed globally.

IDE:s and editors would have to support `elm-tooling.json` somehow, too, though, instead of looking for executables in `./node_modules/.bin/`. I’m sure we would find a solution there, but for the time being it’s much easier for `elm-tooling` to mimic the `npm` stuff so things just work.

## What’s the point of having `elm-json` in `elm-tooling.json`?

[elm-review](https://github.com/jfmengels/node-elm-review) uses `elm-tooling` to install [elm-json](https://github.com/zwilias/elm-json).

By having `elm-json` in `elm-tooling.json` you can download _all_ executables in parallel in one go.

For people who aren’t Elm experts, it’s nice to have `elm-json` available for all contributors. It’s often easier to install Elm packages using `elm-json` than `elm install`.

## Why not put stuff in `elm.json` instead?

`elm` has a tendency to remove keys it does not recognize whenever it updates `elm.json`.

## How do I use a proxy?

`elm-tooling` uses `curl` to download stuff if it exists, otherwise `wget`, and finally the `https` Node.js core module. So if you need to do any proxy stuff or something like that, you do that via the environment variables and config files that `curl` and `wget` understand. For example, [curl proxy environment variables](https://everything.curl.dev/usingcurl/proxies#proxy-environment-variables). Most systems – even Windows! – come with either `curl` or `wget`.

This also applies to any npm package that under the hood uses `elm-tooling` to install something.
