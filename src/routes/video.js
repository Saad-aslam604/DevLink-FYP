const express = require('express')
const router = express.Router()

router.use((req, res) => {
  res.status(410).json({ success: false, message: 'Video provider integration removed. Use WebRTC via Socket.IO (client-side).' })
})

module.exports = router
