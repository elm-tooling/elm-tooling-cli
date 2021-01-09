---
nav_order: 7
---

# Quirks

Having trouble? Here are some known (mostly npm related) quirks and suggestions on how to work around them that might help.

- It’s recommended to have `elm-tooling` in `"devDependencies"` in `package.json`. That makes sense since you only need `elm-tooling` for development and building your application, not at runtime in production. **But,** this has the consequence that `npm install --production`/`npm ci --production` will fail. Why? Because the `"postinstall"` script will still execute, and try to run `elm-tooling install` – but `elm-tooling` isn’t even installed (`"devDependencies"` is ignored when using the `--production` flag). So what are your options?

  - Maybe you don’t even need `--production`. Some applications use `npm` only for a build step and does not have any production Node.js server or anything like that.
  - Try `--ignore-scripts`. This will skip the `"postinstall"` script – but also any scripts that your dependencies might run during installation! Sometimes, only `"devDependencies"` (such as node-sass) need to run scripts during installation – so try it! If `--ignore-scripts` works you have nothing to lose.
  - Make a little wrapper script that runs `elm-tooling install` only if `elm-tooling` is installed. For example, you could write the script in JavaScript and use the [API version of the CLI][cli-api].
  - If you only need `--production` installs in for example a Dockerfile, try adding `RUN sed -i '/postinstall/d' package.json` to remove the `"postinstall"` script from `package.json` before running `npm install --production`. This specific example only works with GNU sed and if your `"postinstall"` script isn’t last (due to trailing commas being invalid JSON).
  - Move `elm-tooling` to `"dependencies"`. `elm-tooling` is small and has no dependencies so it won’t bloat your build very much. Set the `NO_ELM_TOOLING_INSTALL` environment variable to turn `elm-tooling install` into a no-op (see below).

- Due to a bug in `npm`, the `"name"` field _must_ exist in `package.json` if you have a `"postinstall"` script – otherwise `npm` crashes with a confusing message. Worse, in a Dockerfile `"name"` must match your current `WORKDIR` – otherwise `npm` refuses to run your `"postinstall"` script. See [npm/npm-lifecycle#49] for more information.

- If you’re using `npm`’s [ignore-scripts] setting, that also means your _own_ `postinstall` script won’t run. Which means that you’ll have to remember to run `npm run postinstall` or `npx elm-tooling install` yourself. `npm` tends to keep stuff in `node_modules/.bin/` even when running `npm ci` (which claims to remove `node_modules/` before installation), so it should hopefully not be too much of a hassle.

- You can set the `NO_ELM_TOOLING_INSTALL` environment variable to turn `elm-tooling install` into a no-op. This lets you run `npm install` without also running `elm-tooling install`, which can be useful in CI.

- If you’re creating an npm package that uses `elm-tooling` to install Elm and other tools during development, beware that `"postinstall": "elm-tooling install"` will run not only when developers run `npm install` in your repo, but also when users install your package with `npm install your-package`! You can solve this by using `"prepare": "elm-tooling install"` instead. [prepare][scripts] also runs after `npm install` in development, but not after `npm install your-package`. However, it also runs before `npm publish`, which unneeded but doesn’t hurt that much since it’s so fast after everything has been downloaded once.

  Another way is to generate the package.json that actually ends up in the npm package during a build step – a package.json without `"scripts"`, `"devDependencies"` and other config that is only wasted bytes for all users of your package.
