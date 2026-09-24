import { Octokit } from '@octokit/rest'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'amoahkwameboadu-gif'
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'GNASS-CCTU'
const BRANCH = process.env.GITHUB_BRANCH || 'main'

if (!GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN environment variable is required')
}

const octokit = new Octokit({ auth: GITHUB_TOKEN })

interface FileContent {
  content: string
  sha: string
}

async function getFile(path: string): Promise<FileContent | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      ref: BRANCH,
    })
    if ('content' in data && data.content) {
      return {
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
        sha: data.sha,
      }
    }
    return null
  } catch (error: any) {
    if (error.status === 404) return null
    throw error
  }
}

async function writeFile(path: string, content: string, message: string, sha?: string): Promise<void> {
  await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha,
    branch: BRANCH,
  })
}

export async function readJSON<T>(path: string, fallback: T): Promise<T> {
  const file = await getFile(path)
  if (!file) return fallback
  try {
    return JSON.parse(file.content) as T
  } catch {
    return fallback
  }
}

export async function writeJSON(path: string, data: unknown, message: string): Promise<void> {
  const existing = await getFile(path)
  await writeFile(path, JSON.stringify(data, null, 2), message, existing?.sha)
}

export type { FileContent }