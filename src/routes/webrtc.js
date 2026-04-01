const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

// GET /api/webrtc/turn
// Returns ICE servers (STUN + TURN) configuration. Falls back to a public TURN server if none configured.
router.get('/turn', (req, res) => {
  try {
    const turnUrls = process.env.TURN_URL || process.env.TURNSERVER_URL || 'turn:openrelay.metered.ca:80?transport=udp,turn:openrelay.metered.ca:443?transport=tcp'
    const username = process.env.TURN_USERNAME || process.env.TURN_USER || 'openrelayproject'
    const credential = process.env.TURN_PASSWORD || process.env.TURN_PASS || 'openrelayproject'

    const urls = turnUrls.split(',').map(s => s.trim()).filter(Boolean)

    const iceServers = [
      // common STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // TURN server (may be public fallback)
      {
        urls,
        username: username || undefined,
        credential: credential || undefined,
      },
    ]

    return res.json({ success: true, iceServers })
  } catch (err) {
    console.error('/api/webrtc/turn error:', err)
    return res.status(500).json({ success: false, message: 'Server error', error: err && err.message })
  }
})

  // POST /api/webrtc/stats
  // Accepts diagnostics snapshots from clients (bookingId + snapshot) and persists them
  router.post('/stats', (req, res) => {
    try {
      const { bookingId, snapshot } = req.body || {}
      const entry = {
        timestamp: new Date().toISOString(),
        bookingId: bookingId || null,
        ip: req.ip || null,
        snapshot: snapshot || null,
      }

      // Persist as JSON-lines in backups/webrtc-stats.jsonl for later inspection
      try {
        const outDir = path.join(__dirname, '..', '..', 'backups')
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
        const outFile = path.join(outDir, 'webrtc-stats.jsonl')
        fs.appendFileSync(outFile, JSON.stringify(entry) + '\n')
      } catch (fsErr) {
        console.warn('/api/webrtc/stats: failed to write backup file', fsErr)
      }

      console.info('/api/webrtc/stats received:', { bookingId: bookingId || null, hasSnapshot: !!snapshot })
      return res.json({ success: true })
    } catch (err) {
      console.error('/api/webrtc/stats error:', err)
      return res.status(500).json({ success: false, message: 'Server error', error: err && err.message })
    }
  })

module.exports = router

