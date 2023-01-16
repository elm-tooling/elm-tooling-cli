### Version 1.12.0 (2023-01-16)

> ℹ️ If you use macOS ARM (Apple Silicon) and have used `elm-tooling` 1.11.0 before, you need to clear previously downloaded binaries in order to get the newest macOS ARM binary. Otherwise you’ll keep using the one from 1.11.0.
>
> ```bash
> # Remove downloaded binaries:
> rm -R ~/.elm/elm-tooling/elm/0.19.1/
> # Install new binaries:
> cd your-project
> npx elm-tooling install
> ```

- Changed: Different macOS ARM (Apple Silicon) binary for elm 0.19.1.
- Changed: Different Linux ARM 64-bit binary for elm 0.19.1.

Why replace the ARM 64 binaries? The ones in this release are compiled from the _same [commit](https://github.com/elm/compiler/commit/c9aefb6230f5e0bda03205ab0499f6e4af924495)_ as the official x86_64 binaries. The ones in 1.11.0 two were compiled from a later commit.

The ones in 1.11.0 still work, but can result in surprises. There are some unreleased Elm compiler commits that result in ever so slightly different compiled JavaScript. Many build systems hash outputs for cache busting. If you run a binary compiled from a later commit locally but an official one on a build server, you might be confused why you get different hashes locally and on the build server for example. There’s also a risk that something compiles on your local computer, but not on the build server, or someone else’s computer (who doesn’t use ARM 64).

Thanks to Mario Rogic for compiling the binaries!

### Version 1.11.0 (2023-01-08)

> ℹ️ If you use macOS ARM (Apple Silicon) and have used `elm-tooling` before, you need to clear previously downloaded binaries in order to get macOS ARM binaries. Otherwise you’ll keep using Rosetta.
>
> ```bash
> # Remove downloaded binaries:
> rm -R ~/.elm/elm-tooling/
> # Install new binaries:
> cd your-project
> npx elm-tooling install
> ```
>
> Similarly, if you have tried `elm-tooling` on Linux ARM before, you also need to clear previously downloaded, non-working x86_64 binaries.

- Added: macOS ARM (Apple Silicon) binary for elm 0.19.1. Thanks to Mario Rogic for compiling it!
- Added: Linux ARM 64-bit binary for elm 0.19.1. Thanks to Mario Rogic for compiling it!
- Added: Linux ARM 32-bit binary (Raspberry Pi) for elm 0.19.1. Thanks to dmy for compiling it!
- Added: Linux ARM 32-bit binary (Raspberry Pi) for elm-format 0.8.2. Thanks to dmy for compiling it!
- Added: Linux ARM binaries for all elm-json versions, that work on both 64-bit and 32-bit platforms.
- Added: macOS ARM (Apple Silicon) binaries for elm-json 0.2.10 and 0.2.13.
- Added: macOS ARM (Apple Silicon) binaries for all elm-test-rs versions.
- Added: Linux ARM 64-bit binaries for all elm-test-rs versions except 1.0.0.
- Added: Linux ARM 32-bit binaries for all elm-test-rs versions except 1.0.0.
- Changed: `elm-tooling` can now be run on any platform. (Previously it exited early on unsupported platforms.)
- Changed: `elm-tooling install` prints a message for tools that have no binary for the current platform. (It does _not_ fail the command.)

### Version 1.10.0 (2022-10-14)

- Added: elm-json 0.2.13.

### Version 1.9.0 (2022-10-11)

- Added: elm-test-rs 3.0.0.

### Version 1.8.0 (2022-04-16)

- Added: elm-test-rs 2.0.1.

### Version 1.7.0 (2021-12-02)

- Added: elm-test-rs 2.0.0.
- Removed: `elm-tooling init` no longer creates `"entrypoints"` in elm-tooling.json. The Elm Language Server no longer needs it, and that was the only tool using it. `"entrypoints"` has also been removed from the spec.
- Removed: the `elm-tooling validate` command. Since `"entrypoints"` was removed, the only remaining field is `"tools"`. If `elm-tooling install` succeeds your elm-tooling.json is valid, so there’s no need for the `elm-tooling validate` command anymore. The spec [explains why it won’t be needed in the future either](https://github.com/elm-tooling/elm-tooling-cli/blob/0e7ad8341b0dbf495b0185b04621646cdb9a7e51/docs/spec.md). Note: To avoid a breaking change, `elm-tooling validate` is now a hidden command that always exits with code 0, keeping the same API as before. (The human readable output is different – it’s now just a message saying that the `validate` command no longer exists.)

### Version 1.6.0 (2021-09-19)

- Added: elm-test-rs 1.2.2.

### Version 1.5.0 (2021-09-08)

- Added: elm-test-rs 1.2.1.

### Version 1.4.1 (2021-08-22)

- Fixed: The package build improvements in 1.4.0 accidentally broke the package exports. (`exports['default'] = elmToolingCli;` was shipped instead of the correct `module.exports = elmToolingCli;`.) This is fixed in 1.4.1, and I’ve added a regression test so it won’t happen again.

### Version 1.4.0 (2021-08-11)

**🚨 Note:** The package exports of this version are broken, so this version is deprecated. Update to 1.4.1.

- Fixed: Some people [configure `curl` to output an extra newline](https://stackoverflow.com/a/14614203/2010616). The way `elm-tooling` uses `curl`, that results in an extra newline added to downloaded executables. While an extra newline doesn’t seem to break executables, it fails `elm-tooling`’s SHA256 verification, causing `elm-tooling` to abort with an error message like this:

  ```
  elm 0.19.1
    < https://github.com/elm/compiler/releases/download/0.19.1/binary-for-linux-64-bit.gz
    > /home/you/.elm/elm-tooling/elm/0.19.1/elm
    The downloaded file does not have the expected hash!
    Expected: e44af52bb27f725a973478e589d990a6428e115fe1bb14f03833134d6c0f155c
    Actual:   e8b796172746fc7e2cd4edfd2e5a72d49ae38ddd89624caf16c6fa7226cb43c3
  ```

  It’s usually a good thing that the user’s `curl` config file (`~/.curlrc`) is respected, because it allows people to configure a proxy. But in this case it’s bad.

  To solve this problem, `elm-tooling` now overrides the option (`-w`, `--write-out`) that lets you add a newline (or anything, really) to the output. Thanks to Zach Rose ([@windmountain](https://github.com/windmountain)) for reporting initially, and to Jakub Waszczuk ([@kawu](https://github.com/kawu)) and Tomáš Látal ([kraklin](https://github.com/kraklin)) for re-reporting and figuring out what the problem was!

- Improved: If something like the above happens in the future, the error message is better:

  ```
  elm 0.19.1
    < https://github.com/elm/compiler/releases/download/0.19.1/binary-for-linux-64-bit.gz
    > /home/you/.elm/elm-tooling/elm/0.19.1/elm

    The downloaded file does not have the expected number of bytes!
    Expected: 6034617
    Actual:   6034616

    - Probably, something in your environment messes with the download.
    - Worst case, someone has replaced the executable with something malicious!

    This happened when executing:
    curl -#fLw "" https://github.com/elm/compiler/releases/download/0.19.1/binary-for-mac-64-bit.gz

    Do you have a config file or environment variables set for curl?
  ```

  There are a number of improvements here:

  - `elm-tooling` now not only verifies the SHA256 hash, but first also _the number of bytes._ That’s much easier to debug than a hash mismatch. And potentially more secure: An attacker would not just need to find a hash collision, but a hash collision using this exact number of bytes.
  - There’s some extra text trying to explain what a byte/hash mismatch means.
  - The exact command ran is shown, which is great for troubleshooting.
  - And there’s a hint about looking for old config files you’ve forgotten about.

  `wget`, `tar` and Node.js native `https.get()` calls have been similarly improved.

- Improved: The output of `elm-tooling install` is now less noisy in CI. Previously, if you downloaded `elm`, `elm-format` and `elm-json` at the same time, `elm-tooling` would print the progress of all three any time just one of them received some more bytes! That resulted in many duplicate lines. Now, only the tool that got an update is printed, resulting in a plain old log. As a bonus, this made the interactive output ever so slightly more efficient, too!

- Improved: The npm package now contains just 3 JS files, instead of 12. This results in a slightly smaller and (in theory) faster package!

- Improved: I’ve done some internal refactoring to make the code more type safe. Always a confidence boost!

### Version 1.3.0 (2021-02-28)

- Added: elm-test-rs 1.0.0.

### Version 1.2.1 (2021-02-27)

- Fixed: `elm-tooling install` now works in Git Bash on Windows. Travis CI uses Git Bash by default in their Windows environment.

### Version 1.2.0 (2021-02-09)

- Added: elm-format 0.8.5.

### Version 1.1.0 (2021-01-23)

- Added: elm-json 0.2.10.

### Version 1.0.3 (2021-01-23)

- Improved: `elm-tooling` now prints progress more efficiently, resulting in better performance and nicer logs in CI.

### Version 1.0.2 (2021-01-18)

- Fixed: `elm-tooling install` no longer finds `node_modules/` up the directory tree. Links to tools are now _always_ created in `node_modules/.bin/` in the same directory as `elm-tooling.json`. `elm-tooling.json` only affects the current project, so `elm-tooling install` shouldn’t touch stuff outside the project. [#23](https://github.com/elm-tooling/elm-tooling-cli/pull/23)
- Removed: `elm-tooling validate` no longer checks for an `elm.json` next to `elm-tooling.json`, since there are legitimate use cases for only having an `elm-tooling.json`. [#24](https://github.com/elm-tooling/elm-tooling-cli/pull/24)

### Version 1.0.1 (2021-01-10)

- Improved: `--help` now shows the help text even if there are other arguments passed.
- Improved: Each option of `elmToolingCli` is now optional and has its own default. Previously, you had to pass either no options or _all_ options.

### Version 1.0.0 (2021-01-09)

- Improved: `elm-tooling init` now looks at `elm.json` to figure out which Elm version to use.

### Version 0.6.3 (2020-12-19)

- Added: Node.js 10 support. This is useful for npm packages that need to run tests on Node.js 10 and use `elm-tooling` to install `elm` and `elm-format`.
- Updated: Links to documentation and to the specification, since the repo was reorganized a bit.

### Version 0.6.2 (2020-11-17)

- Fixed: `"elm": "0.19.0"` accidentally resulted in Elm 0.19.<strong>1</strong> being downloaded on Windows.

### Version 0.6.1 (2020-10-22)

- Fixed: `getExecutable` now properly deals with prereleases. Previously, `^1.0.0` would match `1.1.0-beta.1`. Prereleases should only be matched if the range contains a prerelease and they both have the same three-digit base.

### Version 0.6.0 (2020-10-17)

- Improved: `elm-tooling install` now removes old links created by earlier runs of `elm-tooling install`.
- Fixed: A broken link in the npm package readme.

### Version 0.5.0 (2020-10-13)

- Added: `elm-tooling tools`. Interactively add, remove and update tools.
- Removed: The hidden `elm-tooling download` command is now removed for real.
- Improved: `elm-tooling install` now has nicer output.
- Improved: The output from most commands now suggest what command to run next.
- Improved: `elm-tooling init` now tries to find what tools you had installed locally using `npm` before and uses those version in the `"tools"` field.
- Improved: `elm-tooling validate` now checks that entrypoints end with `.elm`.

### Version 0.4.1 (2020-10-02)

- Updated: Some links point to the `main` branch instead of `master`.

### Version 0.4.0 (2020-09-30)

- Renamed: `elm-tooling postinstall` is now called `elm-tooling install`.
- Removed: `elm-tooling download`. There’s no use case for it yet. Use `elm-tooling install` instead. (Technically the command is still there but it’s not part of the public API and might be removed for real at any time.)
- Added: Support for `elm-json` (latest version as of this writing).
- Added: `getExecutable` for npm packages that want to depend on `elm-json` (or other tools).
- Improved: `elm-tooling validate` now checks that `/` is used rather than `\` in entrypoints.
- Improved: `elm-tooling help` now shows the version of `elm-tooling`.

### Version 0.3.0 (2020-09-24)

- Added: elm-format 0.8.4.

### Version 0.2.0 (2020-09-22)

- Improved: Show known fields/tools/versions in validation errors.
- Added: It’s now possible to import the CLI and run it from JavaScript without `child_process.spawn`.
- Fixed: Minor bugs.

### Version 0.1.6 (2020-09-08)

- Fixed: The CLI now works on Windows.
- Improved: Lots of little things.

### Version 0.1.5 (2020-09-06)

- Added: Allow turning `elm-tooling postinstall` into a no-op by setting the `NO_ELM_TOOLING_POSTINSTALL` environment variable.
- Improved: The tool now chooses between stdout and stderr more wisely, allowing you to pipe stdout to `/dev/null` for silent operation while still seeing unexpected errors on stderr.
- Improved: Cleanup when download fails.

### Version 0.1.4 (2020-09-06)

- Fixed: Extracting tar archives now works with GNU tar.
- Fixed: Progress is now correctly calculated in locales using `,` as decimal separator.

### Version 0.1.3 (2020-09-06)

- Improved: `elm-tooling postinstall` now overwrites links like `npm` does.

### Version 0.1.2 (2020-09-06)

- Fixed: Node.js 12 support.

### Version 0.1.1 (2020-09-05)

- Fixed: Add shebang to CLI entrypoint.

### Version 0.1.0 (2020-09-05)

- Initial release.
