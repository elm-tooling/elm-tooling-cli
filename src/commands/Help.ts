import { bold, dim, Env } from "../Helpers";
import { getElmToolingInstallPath } from "../Parse";
import type { Cwd } from "../PathHelpers";

export function help(cwd: Cwd, env: Env): string {
  return `
${bold("elm-tooling init")}
    Create a sample elm-tooling.json in the current directory

${bold("elm-tooling tools")}
    Add, remove and update tools

${bold("elm-tooling install")}
    Download the tools in the closest elm-tooling.json to:
    ${dim(getElmToolingInstallPath(cwd, env).absolutePath)}
    And create links to them in node_modules/.bin/

${bold("npx elm --help")}
    Example on how to run installed tools

${dim("---")}

${bold("Environment variables:")}
    ${bold("ELM_HOME")}
        Customize where tools will be downloaded
        (The Elm compiler uses this variable too for where to store packages.)

    ${bold("NO_ELM_TOOLING_INSTALL")}
        Disable the install command

    ${bold("NO_COLOR")}
        Disable colored output

${bold("Documentation:")}
    https://elm-tooling.github.io/elm-tooling-cli/cli

${bold("Version:")}
    %VERSION%
`.trim();
}
