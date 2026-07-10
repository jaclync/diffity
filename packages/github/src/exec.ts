import { execSync, exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

const execPromise = promisify(execCb);

// Async variant for server hot paths: execSync blocks the whole event loop
// for the duration of a network round-trip, stalling every other request.
export async function execAsync(cmd: string): Promise<string> {
  const { stdout } = await execPromise(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  return stdout.trim();
}

export function exec(cmd: string): string {
  return execSync(cmd, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

export function execJson<T>(cmd: string): T | null {
  try {
    const raw = exec(cmd);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function execSilent(cmd: string): boolean {
  try {
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
