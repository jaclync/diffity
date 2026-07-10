import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFilePromise = promisify(execFile);
const MAX_BUFFER = 10 * 1024 * 1024;

// All helpers invoke the program directly with an argv array — NO shell —
// so no argument (owner/repo/ref/PR number) can be interpreted as a shell
// metacharacter. Async variants are used on server hot paths so a slow
// network round-trip doesn't block the event loop.

export function run(file: string, args: string[]): string {
  return execFileSync(file, args, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: MAX_BUFFER,
  }).trim();
}

export async function runAsync(file: string, args: string[]): Promise<string> {
  const { stdout } = await execFilePromise(file, args, {
    encoding: 'utf-8',
    maxBuffer: MAX_BUFFER,
  });
  return stdout.trim();
}

export function runWithStdin(file: string, args: string[], input: string): string {
  return execFileSync(file, args, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    input,
    maxBuffer: MAX_BUFFER,
  }).trim();
}

export function runSilent(file: string, args: string[]): boolean {
  try {
    execFileSync(file, args, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
