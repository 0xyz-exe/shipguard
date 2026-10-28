import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function safeReadFile(filePath: string, maxBytes = 1024 * 1024): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > maxBytes) return null;
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function walkDirectory(
  rootDir: string,
  options: {
    maxDepth?: number;
    ignoredDirs?: string[];
    extensions?: string[];
  } = {}
): Promise<string[]> {
  const maxDepth = options.maxDepth ?? 5;
  const ignored = new Set(options.ignoredDirs ?? ['node_modules', '.git', 'dist', 'coverage', '.shipguard']);
  const files: string[] = [];

  async function walk(currentDir: string, depth: number) {
    if (depth > maxDepth) return;
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!ignored.has(entry.name)) {
            await walk(path.join(currentDir, entry.name), depth + 1);
          }
        } else if (entry.isFile()) {
          if (!options.extensions || options.extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(path.join(currentDir, entry.name));
          }
        }
      }
    } catch {
      // Ignore read errors for inaccessible folders
    }
  }

  await walk(rootDir, 0);
  return files;
}
