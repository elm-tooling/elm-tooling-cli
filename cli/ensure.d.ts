export default function ensure(options: {
  name: string;
  version: RegExp;
  cwd?: string;
  env?: Record<string, string | undefined>;
  onProgress: (percentage: number) => void;
}): Promise<string>;
