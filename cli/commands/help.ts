import { bold, dim, Env } from "../helpers/mixed";
import { elmToolingInstallPath } from "../helpers/parse";

export default function help(cwd: string, env: Env): string {
  return `
${bold("elm-tooling init")}
    Create a sample elm-tooling.json in the current directory

${bold("elm-tooling validate")}
    Validate the closest elm-tooling.json

${bold("elm-tooling download")}
    Download the tools in the closest elm-tooling.json to:
    ${dim(elmToolingInstallPath(cwd, env))}

${bold("elm-tooling postinstall")}
    Download the tools in the closest elm-tooling.json
    and create links to them in node_modules/.bin/

${bold("Environment variables:")}
    ${bold("ELM_HOME")}
        Customize where tools will be downloaded.
        The Elm compiler uses this variable too for where to store packages.

    ${bold("NO_ELM_TOOLING_POSTINSTALL")}
        Disable the postinstall command.

    ${bold("NO_COLOR")}
        Disable colored output.

${bold("Documentation:")}
    https://github.com/lydell/elm-tooling.json/tree/master/cli
`.trim();
}
