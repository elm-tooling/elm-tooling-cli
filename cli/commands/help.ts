import { bold, dim, Env } from "../helpers/mixed";
import { getElmToolingInstallPath } from "../helpers/parse";

export default function help(cwd: string, env: Env): string {
  return `
${bold("elm-tooling init")}
    Create a sample elm-tooling.json in the current directory

${bold("elm-tooling validate")}
    Validate the closest elm-tooling.json

${bold("elm-tooling tools")}
    Add, remove and update tools

${bold("elm-tooling install")}
    Download the tools in the closest elm-tooling.json to:
    ${dim(getElmToolingInstallPath(cwd, env))}
    And create links to them in the closest node_modules/.bin/

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
    https://github.com/lydell/elm-tooling.json/tree/main/cli#readme

${bold("Version:")}
    %VERSION%
`.trim();
}
