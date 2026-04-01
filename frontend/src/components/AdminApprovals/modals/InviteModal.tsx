import React, { useState } from 'react'
import { Clipboard, Mail } from 'lucide-react'

type Props = {
  isOpen: boolean
  onClose: () => void
  defaultMessage?: string
}

const InviteModal: React.FC<Props> = ({ isOpen, onClose, defaultMessage }) => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState(defaultMessage || 'We think you\'d be a great fit to mentor on DevLink — apply here: https://devlink.example/apply')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleSend = () => {
    // Use mailto as a simple fallback — real implementation would POST to an email service
    const subject = encodeURIComponent('Invitation to apply as a DevLink mentor')
    const body = encodeURIComponent(message)
    const href = email ? `mailto:${email}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`
    window.open(href)
    onClose()
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('copy failed', e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invite mentors</h3>
          <button onClick={onClose} className="text-sm text-gray-500">Close</button>
        </div>

        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Email (optional)</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="person@example.com" className="w-full mb-3 px-3 py-2 border rounded bg-gray-50 dark:bg-gray-700" />

        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} className="w-full mb-3 px-3 py-2 border rounded bg-gray-50 dark:bg-gray-700 text-sm" />

        <div className="flex gap-2 justify-end">
          <button onClick={handleCopy} className="inline-flex items-center gap-2 px-3 py-2 border rounded text-sm text-gray-700">
            <Clipboard className="w-4 h-4" />
            <span>{copied ? 'Copied' : 'Copy message'}</span>
          </button>
          <button onClick={handleSend} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">
            <Mail className="w-4 h-4" />
            <span>Send Invite</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default InviteModal
