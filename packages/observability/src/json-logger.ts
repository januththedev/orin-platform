export function writeJsonLog(value: unknown, write: (line: string) => void = console.log): void {
  write(JSON.stringify(value));
}
