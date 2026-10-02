module.exports = async function handler(req, res) {
  const out = { node: process.version }

  try {
    const mod = require('@octokit/rest')
    out.octokitRequire = 'ok'
    out.octokitExport = typeof mod.Octokit
  } catch (error) {
    out.octokitRequire = `FAIL ${error.code || ''} ${String(error.message).slice(0, 140)}`
  }

  try {
    const crypto = require('node:crypto')
    out.crypto = typeof crypto.timingSafeEqual
    out.hasBase64url = typeof crypto.createHash('sha256').digest('base64url')
  } catch (error) {
    out.crypto = `FAIL ${error.code || ''} ${String(error.message).slice(0, 140)}`
  }

  res.setHeader('Content-Type', 'application/json')
  return res.status(200).json(out)
}