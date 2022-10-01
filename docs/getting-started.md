---
title: Getting started
nav_order: 2
---

<!-- prettier-ignore-start -->

# Getting started
{: .no_toc }

1. TOC
{:toc}

<!-- prettier-ignore-end -->

## Installation

```
npm install --save-dev elm-tooling
```

```
npx elm-tooling help
```

## Quick start

_Assuming you already have a package.json_

1. `npm install --save-dev elm-tooling`
2. `npx elm-tooling init`
3. `npx elm-tooling install`
4. `npx elm --help`

Want more details? See below.

## Adding elm-tooling to an existing project

1. Go to your project: `cd my-app`

2. If you don’t already have a `package.json`, create one:

   ```json
   {
     "private": true,
     "scripts": {
       "postinstall": "elm-tooling install"
     }
   }
   ```

3. Install `elm-tooling` locally: `npm install --save-dev elm-tooling`

4. Create an `elm-tooling.json`: `npx elm-tooling init`

5. Edit `elm-tooling.json`. `elm-tooling init` tries to guess which tools you already depend on via `npm` by looking inside the closest `node_modules/` folder and `elm.json` file (if any). Check if `elm-tooling init` got it right, and then remove tools (such as `elm` and `elm-format`) from your `package.json`.

6. Install the tools in `elm-tooling.json`: `npx elm-tooling install`

7. Add `"postinstall": "elm-tooling install"` to your `package.json` scripts. This means `elm-tooling install` is automatically run after `npm install`.

8. Run through your CI and build system and see if everything works or something needs to be tweaked. See [CI setup](../ci) for more information.

With the above steps, you might end up with changes like this:

`package.json`:

```diff
 {
   "devDependencies": {
-    "elm": "0.19.1",
-    "elm-format": "0.8.3"
+    "elm-tooling": "1.8.0"
   },
   "scripts": {
+    "postinstall": "elm-tooling install"
   }
 }
```

`elm-tooling.json`:

```diff
+{
+    "tools": {
+        "elm": "0.19.1",
+        "elm-format": "0.8.3"
+    }
+}
```

## Creating a new project with elm-tooling

1. Create a folder and enter it: `mkdir my-app && cd my-app`

2. Create a `package.json`:

   ```json
   {
     "private": true,
     "scripts": {
       "postinstall": "elm-tooling install"
     }
   }
   ```

3. Install `elm-tooling` locally: `npm install --save-dev elm-tooling`

4. Create an `elm-tooling.json`: `npx elm-tooling init`

5. Install the tools in `elm-tooling.json`: `npx elm-tooling install`

6. Create an `elm.json`: `npx elm init`

7. Optional: Install whatever other `npm` packages and stuff you want.

8. Create the `src` folder: `mkdir src`

9. Create `src/Main.elm` and start coding!
