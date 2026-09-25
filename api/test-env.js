// Minimal test endpoint - JavaScript version
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasToken: !!process.env.GITHUB_TOKEN,
    tokenLength: process.env.GITHUB_TOKEN?.length || 0,
    owner: process.env.GITHUB_REPO_OWNER || 'NOT_SET',
    repo: process.env.GITHUB_REPO_NAME || 'NOT_SET',
    branch: process.env.GITHUB_BRANCH || 'NOT_SET',
  });
}