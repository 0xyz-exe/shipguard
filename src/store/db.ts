import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { AssessmentRecord, Finding, FindingStatus, ProjectPolicy, ProjectRecord } from '../types/index.js';
import { DEFAULT_POLICY } from '../config/defaults.js';

interface DatabaseSchema {
  projects: ProjectRecord[];
  assessments: AssessmentRecord[];
  findingOverrides: Record<string, { status: FindingStatus; updatedAt: string; comment?: string }>;
}

export class DatabaseStore {
  private static instance: DatabaseStore;
  private dbPath: string;
  private data: DatabaseSchema = {
    projects: [],
    assessments: [],
    findingOverrides: {}
  };
  private loaded = false;

  private constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), '.shipguard', 'db.json');
  }

  public static getInstance(dbPath?: string): DatabaseStore {
    if (!DatabaseStore.instance) {
      DatabaseStore.instance = new DatabaseStore(dbPath);
    }
    return DatabaseStore.instance;
  }

  public async init(): Promise<void> {
    if (this.loaded) return;
    try {
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });
      const content = await fs.readFile(this.dbPath, 'utf-8');
      this.data = JSON.parse(content);
    } catch {
      // Initialize with default current project if empty
      this.data = {
        projects: [
          {
            id: 'default-project',
            name: path.basename(process.cwd()) || 'current-project',
            path: process.cwd(),
            createdAt: new Date().toISOString(),
            policy: { ...DEFAULT_POLICY }
          }
        ],
        assessments: [],
        findingOverrides: {}
      };
      await this.save();
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    try {
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  public async getProjects(): Promise<ProjectRecord[]> {
    await this.init();
    return this.data.projects;
  }

  public async getProject(id: string): Promise<ProjectRecord | undefined> {
    await this.init();
    return this.data.projects.find(p => p.id === id);
  }

  public async createProject(project: Omit<ProjectRecord, 'id' | 'createdAt'>): Promise<ProjectRecord> {
    await this.init();
    const newProject: ProjectRecord = {
      ...project,
      id: `proj-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString()
    };
    this.data.projects.push(newProject);
    await this.save();
    return newProject;
  }

  public async updateProjectPolicy(id: string, policy: ProjectPolicy): Promise<ProjectRecord | undefined> {
    await this.init();
    const proj = this.data.projects.find(p => p.id === id);
    if (!proj) return undefined;
    proj.policy = policy;
    await this.save();
    return proj;
  }

  public async deleteProject(id: string): Promise<boolean> {
    await this.init();
    const idx = this.data.projects.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.projects.splice(idx, 1);
    this.data.assessments = this.data.assessments.filter(a => a.projectId !== id);
    await this.save();
    return true;
  }

  public async saveAssessment(assessment: AssessmentRecord): Promise<void> {
    await this.init();
    // Apply existing finding overrides to newly saved assessment findings
    for (const f of assessment.findings) {
      if (this.data.findingOverrides[f.fingerprint]) {
        f.status = this.data.findingOverrides[f.fingerprint].status;
      }
    }
    this.data.assessments.unshift(assessment);
    // Keep last 50 assessments
    if (this.data.assessments.length > 50) {
      this.data.assessments = this.data.assessments.slice(0, 50);
    }

    const proj = this.data.projects.find(p => p.id === assessment.projectId);
    if (proj) {
      proj.lastAssessmentAt = assessment.timestamp;
    }
    await this.save();
  }

  public async getAssessments(projectId?: string): Promise<AssessmentRecord[]> {
    await this.init();
    if (projectId) {
      return this.data.assessments.filter(a => a.projectId === projectId);
    }
    return this.data.assessments;
  }

  public async getAssessment(id: string): Promise<AssessmentRecord | undefined> {
    await this.init();
    return this.data.assessments.find(a => a.id === id);
  }

  public async updateFindingStatus(fingerprint: string, status: FindingStatus, comment?: string): Promise<void> {
    await this.init();
    this.data.findingOverrides[fingerprint] = {
      status,
      updatedAt: new Date().toISOString(),
      comment
    };
    for (const assessment of this.data.assessments) {
      for (const finding of assessment.findings) {
        if (finding.fingerprint === fingerprint) {
          finding.status = status;
        }
      }
    }
    await this.save();
  }
}
