import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../config';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type JobType = 'generate' | 'remove-bg' | 'convert-3d' | 'pipeline' | 'bulk';

export interface JobInput {
  prompt?: string;
  imageUrl?: string;
  assetId?: string;
  options?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface JobOutput {
  assetId?: string;
  assetPath?: string;
  modelPath?: string;
  error?: string;
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  input: JobInput;
  output?: JobOutput;
  progress: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  parentJobId?: string;
  childJobIds?: string[];
}

export interface JobsRegistry {
  jobs: Job[];
}

function getJobsFilePath(): string {
  const config = getConfig();
  const dataDir = join(process.cwd(), config.storage.dataDir);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return join(dataDir, 'jobs.json');
}

function loadJobsRegistry(): JobsRegistry {
  const filePath = getJobsFilePath();
  if (!existsSync(filePath)) {
    return { jobs: [] };
  }
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { jobs: [] };
  }
}

function saveJobsRegistry(registry: JobsRegistry): void {
  const filePath = getJobsFilePath();
  writeFileSync(filePath, JSON.stringify(registry, null, 2));
}

export function createJob(
  type: JobType,
  input: JobInput,
  parentJobId?: string
): Job {
  const now = new Date().toISOString();
  const job: Job = {
    id: uuidv4(),
    type,
    status: 'pending',
    input,
    progress: 0,
    createdAt: now,
    updatedAt: now,
    parentJobId,
  };

  const registry = loadJobsRegistry();
  registry.jobs.push(job);

  if (parentJobId) {
    const parentIndex = registry.jobs.findIndex((j) => j.id === parentJobId);
    if (parentIndex !== -1) {
      if (!registry.jobs[parentIndex].childJobIds) {
        registry.jobs[parentIndex].childJobIds = [];
      }
      registry.jobs[parentIndex].childJobIds!.push(job.id);
    }
  }

  saveJobsRegistry(registry);

  return job;
}

export function updateJob(
  id: string,
  updates: Partial<Pick<Job, 'status' | 'progress' | 'message' | 'output'>>
): Job | null {
  const registry = loadJobsRegistry();
  const index = registry.jobs.findIndex((j) => j.id === id);

  if (index === -1) {
    return null;
  }

  const job = registry.jobs[index];
  const now = new Date().toISOString();

  Object.assign(job, updates, { updatedAt: now });

  if (updates.status === 'completed' || updates.status === 'failed') {
    job.completedAt = now;
  }

  saveJobsRegistry(registry);

  return job;
}

export function getJob(id: string): Job | null {
  const registry = loadJobsRegistry();
  return registry.jobs.find((j) => j.id === id) || null;
}

export function listJobs(filter?: {
  type?: JobType;
  status?: JobStatus;
  limit?: number;
}): Job[] {
  const registry = loadJobsRegistry();
  let jobs = registry.jobs;

  if (filter?.type) {
    jobs = jobs.filter((j) => j.type === filter.type);
  }

  if (filter?.status) {
    jobs = jobs.filter((j) => j.status === filter.status);
  }

  jobs = jobs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (filter?.limit) {
    jobs = jobs.slice(0, filter.limit);
  }

  return jobs;
}

export function deleteJob(id: string): boolean {
  const registry = loadJobsRegistry();
  const index = registry.jobs.findIndex((j) => j.id === id);

  if (index === -1) {
    return false;
  }

  registry.jobs.splice(index, 1);
  saveJobsRegistry(registry);

  return true;
}

export function cleanupOldJobs(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
  const registry = loadJobsRegistry();
  const cutoff = Date.now() - maxAge;

  const originalCount = registry.jobs.length;
  registry.jobs = registry.jobs.filter(
    (j) =>
      j.status === 'pending' ||
      j.status === 'processing' ||
      new Date(j.createdAt).getTime() > cutoff
  );

  const removedCount = originalCount - registry.jobs.length;

  if (removedCount > 0) {
    saveJobsRegistry(registry);
  }

  return removedCount;
}
