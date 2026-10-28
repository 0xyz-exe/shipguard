import { AnalyzerCategory, IAnalyzer } from '../types/index.js';

export class AnalyzerRegistry {
  private static instance: AnalyzerRegistry;
  private analyzers: Map<string, IAnalyzer> = new Map();

  private constructor() {}

  public static getInstance(): AnalyzerRegistry {
    if (!AnalyzerRegistry.instance) {
      AnalyzerRegistry.instance = new AnalyzerRegistry();
    }
    return AnalyzerRegistry.instance;
  }

  public register(analyzer: IAnalyzer): void {
    this.analyzers.set(analyzer.id, analyzer);
  }

  public get(id: string): IAnalyzer | undefined {
    return this.analyzers.get(id);
  }

  public getAll(): IAnalyzer[] {
    return Array.from(this.analyzers.values());
  }

  public getByCategory(category: AnalyzerCategory): IAnalyzer[] {
    return Array.from(this.analyzers.values()).filter(a => a.category === category);
  }

  public clear(): void {
    this.analyzers.clear();
  }
}
