export class ConfigError extends Error {
  readonly variableNames: readonly string[];
  constructor(message: string, variableNames: readonly string[] = []) {
    super(message);
    this.name = "ConfigError";
    this.variableNames = variableNames;
  }
}
