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
