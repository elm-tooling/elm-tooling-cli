import download from "./commands/download";
import init from "./commands/init";
import postinstall from "./commands/postinstall";
import validate from "./commands/validate";

const help = `
TODO
`.trim();

function run(argv: Array<string>) {
  switch (argv[0]) {
    case undefined:
    case "-h":
    case "--help":
      process.stdout.write(help + "\n");
      process.exit(0);

    case "init":
      init(argv.slice(1));
      break;

    case "validate":
      validate(argv.slice(1));
      break;

    case "download":
      download(argv.slice(1));
      break;

    case "postinstall":
      postinstall(argv.slice(1));
      break;

    default:
      process.stderr.write(`Unknown command: ${argv[0]}\n`);
      process.exit(1);
  }
}

run(process.argv.slice(2));
