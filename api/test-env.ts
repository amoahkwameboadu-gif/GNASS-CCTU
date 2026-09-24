import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Simple test endpoint to verify function infrastructure and env vars
  const hasToken = !!process.env.GITHUB_TOKEN;
  const tokenPrefix = process.env.GITHUB_TOKEN?.slice(0, 4) || 'NOT_SET';
  const owner = process.env.GITHUB_REPO_OWNER || 'NOT_SET';
  const repo = process.env.GITHUB_REPO_NAME || 'NOT_SET';
  const branch = process.env.GITHUB_BRANCH || 'NOT_SET';
  
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      GITHUB_TOKEN: `${tokenPrefix}... (${process.env.GITHUB_TOKEN?.length || 0} chars)`,
      GITHUB_REPO_OWNER: owner,
      GITHUB_REPO_NAME: repo,
      GITHUB_BRANCH: branch,
    },
    message: hasToken ? 'GitHub token configured' : 'GITHUB_TOKEN NOT SET!'
  });
}