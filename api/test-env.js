// Minimal test endpoint - JavaScript version
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    githubStorageConfigured: Boolean(process.env.GITHUB_TOKEN),
    adminAuthenticationConfigured: Boolean(process.env.GNAAS_ADMIN_TOKEN),
  });
}