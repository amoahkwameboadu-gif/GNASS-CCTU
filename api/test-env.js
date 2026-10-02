// Minimal test endpoint - JavaScript version
module.exports = async function handler(req, res) {
  const signup = String(process.env.ALLOW_SIGNUP ?? 'true').trim().toLowerCase()
  res.setHeader('Content-Type', 'application/json')
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    githubStorageConfigured: Boolean(process.env.GITHUB_TOKEN),
    adminAccountsConfigured: Boolean(process.env.SESSION_SECRET || process.env.GITHUB_TOKEN),
    signupAllowed: signup !== 'false' && signup !== '0' && signup !== 'no',
  })
}