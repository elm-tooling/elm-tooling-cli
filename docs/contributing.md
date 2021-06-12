---
title: Contributing
nav_order: 8
---

# Contributing

Want to make a pull request? Here are some good things to know.

## Setting up your editor

It’s much easier to work on this project if your editor can run these tools for you:

- TypeScript
- ESLint
- Prettier

## Adding a new version

1. Add a new entry in `src/known-tools.ts`.

   There’s a script that can help you do it.

   ```
   npx ts-node scripts/hash-urls.ts LINUX_URL MAC_URL WINDOWS_URL
   ```

   Example:

   ```
   npx ts-node scripts/hash-urls.ts https://github.com/mpizenberg/elm-test-rs/releases/download/v1.0/elm-test-rs_{linux.tar.gz,macos.tar.gz,windows.zip}
   ```

   The above example assumes your shell has brace expansion. Either way, it expects 3 URLs: One for linux, one for mac and one for windows (in that order). It downloads the files to memory (verifying that they exist) and hashes them. When done, it prints some JSON that you can paste into the code. Run Prettier afterwards.

2. Run `npx jest -u` to update snapshots and look them through quickly to see if they seem legit.

3. Run `npx ts-node scripts/test-all-downloads.ts update` to update one more snapshot.

4. Run `npm test` to check that everything looks good.

5. Make a pull request. CI will verify that your added version can be downloaded and executed on all platforms.

## Adding a new tool

This is roughly the same steps as for adding a new version, but it also needs to be decided whether the tool should be included by default in `elm-tooling init`. There might also be special needs for the tool that needs extra code to handle somewhere.

## Making a release of elm-tooling

This is only done by people with commit access.

1. Update the version in `package-real.json`.

2. Add a changelog entry in `CHANGELOG.md`.

3. Run `npm test`. This is both to double-check that everything works, but also to trigger a build. The build also updates the documentation with the latest version number.

4. Commit, tag and push. I use this script called `release`:

   ```bash
   #!/usr/bin/env bash
   name="$(basename "$PWD")"
   version="v$1"
   message="$name $version"
   git commit -am "$message" && git tag "$version" -am "$message"
   ```

   ```
   release 1.2.3
   git push && git push origin v1.2.3
   ```

5. Publish to npm. `cd build && npm publish`.
