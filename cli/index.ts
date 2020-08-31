import download from "./commands/download";
import init from "./commands/init";
import postinstall from "./commands/postinstall";
import validate from "./commands/validate";

const help = `
elm-tooling init
  Create an elm-tooling.json in the current directory

elm-tooling validate
  Validate the closest elm-tooling.json

elm-tooling download
  Download the tools in the closest elm-tooling.json

elm-tooling postinstall
  Download the tools in the closest elm-tooling.json
  and create links to them in node_modules/.bin/

  Add this to your package.json:

  {
    "scripts": {
      "postinstall": "elm-tooling postinstall"
    }
  }
`.trim();

function run(argv: Array<string>) {
  // So far no command takes any further arguments.
  // Let each command handle this when needed.
  if (argv.length > 1) {
    process.stderr.write(
      `Expected no extra arguments but got: ${argv.slice(1).join(" ")}`
    );
    process.exit(1);
  }

  switch (argv[0]) {
    case undefined:
    case "-h":
    case "--help":
      process.stdout.write(help + "\n");
      process.exit(0);

    case "init":
      init();
      break;

    case "validate":
      validate();
      break;

    case "download":
      download();
      break;

    case "postinstall":
      postinstall();
      break;

    default:
      process.stderr.write(`Unknown command: ${argv[0]}\n`);
      process.exit(1);
  }
}

run(process.argv.slice(2));
