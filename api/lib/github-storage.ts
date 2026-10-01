import { Octokit } from '@octokit/rest'

const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'amoahkwameboadu-gif'
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'GNASS-CCTU'
const BRANCH = process.env.GITHUB_BRANCH || 'main'

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('Backend is not configured: add GITHUB_TOKEN to the Vercel project environment variables, then redeploy.')
  }
  return new Octokit({ auth: token })
}

interface FileContent {
  content: string
  sha: string
}

export interface ChapterContent {
  latestMessage: {
    title: string
    body: string
    mediaUrl?: string
    mediaType?: string
    updatedAt?: string
  } | null
  events: Array<{
    id: number | string
    title: string
    description?: string
    eventDate: string
    category: string
  }>
  mediaUpdates: Array<{
    id: number | string
    title: string
    body?: string
    mediaUrl: string
    mediaType: string
    createdAt?: string
  }>
}

async function getFile(path: string): Promise<FileContent | null> {
  try {
    const { data } = await getOctokit().repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      ref: BRANCH,
    })
    if ('content' in data && 'sha' in data) {
      let content = data.content
      if (!content && data.download_url) {
        const response = await fetch(data.download_url)
        if (!response.ok) throw new Error(`Could not download stored content (${response.status}).`)
        content = Buffer.from(await response.arrayBuffer()).toString('base64')
      }
      if (!content) throw new Error(`GitHub returned no content for ${path}.`)
      return {
        content: Buffer.from(content, 'base64').toString('utf-8'),
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
  await getOctokit().repos.createOrUpdateFileContents({
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
  } catch (error) {
    throw new Error(`Stored content file "${path}" is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function writeJSON(path: string, data: unknown, message: string): Promise<void> {
  const existing = await getFile(path)
  await writeFile(path, JSON.stringify(data, null, 2), message, existing?.sha)
}

export async function writeBinaryFile(path: string, content: Uint8Array, message: string): Promise<void> {
  const octokit = getOctokit()
  let sha: string | undefined

  try {
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      ref: BRANCH,
    })
    if ('sha' in data) sha = data.sha
  } catch (error: any) {
    if (error.status !== 404) throw error
  }

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

export function publicFileUrl(path: string): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  return `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${encodeURIComponent(BRANCH)}/${encodedPath}`
}

export type { FileContent }