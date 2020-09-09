import * as stream from "stream";

export default function elmToolingCli(
  args: Array<string>,
  options?: {
    cwd: string;
    env: Record<string, string | undefined>;
    stdin: stream.Readable;
    stdout: stream.Writable;
    stderr: stream.Writable;
  }
): Promise<number>;
