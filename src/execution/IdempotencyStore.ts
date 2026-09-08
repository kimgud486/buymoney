export class IdempotencyStore {
  private static processedKeys = new Set<string>();

  public static has(key: string): boolean {
    return this.processedKeys.has(key);
  }

  public static add(key: string): void {
    this.processedKeys.add(key);
  }

  public static clear(): void {
    this.processedKeys.clear();
  }
}
