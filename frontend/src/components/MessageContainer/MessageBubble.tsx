import React from 'react'

type Sender = { _id?: string | number; firstName?: string; lastName?: string; avatar?: string }

type MessageShape = { id?: string; text?: string; ts?: string; createdAt?: string; sender?: Sender | string | null }

type Props = { message: MessageShape; currentUserId?: string; children?: React.ReactNode }

const initialsFrom = (s?: Sender | string | null) => {
  if (!s) return 'U'
  if (typeof s === 'string') return String(s).charAt(0).toUpperCase()
  const name = `${s.firstName || ''} ${s.lastName || ''}`.trim()
  if (!name) return 'U'
  return String(name).charAt(0).toUpperCase()
}

const formatTime = (iso?: string) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return iso || ''
  }
}

const MessageContainer: React.FC<Props> = ({ message, currentUserId, children }) => {
  const senderObj = message?.sender && typeof message.sender === 'object' ? (message.sender as Sender) : null
  const senderId = senderObj?._id ? String(senderObj._id) : (typeof message.sender === 'string' ? message.sender : undefined)
  const meId = currentUserId ? String(currentUserId) : undefined
  const isMe = !!(meId && senderId && meId === String(senderId))

  return (
    <div className={`flex items-start gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm shrink-0">
          {senderObj?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={String(senderObj.avatar)} alt={String(senderObj.firstName || '')} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <span className="select-none">{initialsFrom(senderObj)}</span>
          )}
        </div>
      )}

      <div className={`max-w-md ${isMe ? 'text-right' : 'text-left'}`}>
        <div
          className={
            isMe
              ? 'bg-blue-500 text-white rounded-2xl rounded-tr-none max-w-md px-4 py-2'
              : 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none max-w-md px-4 py-2'
          }
        >
          {children}
        </div>

        <div className={`text-xs text-gray-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
          {formatTime(message.createdAt || message.ts)}
        </div>
        {/* Status for outgoing messages: prefer computedStatus provided by server, else persisted status */}
        {isMe && (
          <div className="text-xs text-gray-400 mt-1 ml-2">
            {(() => {
              const st = (message as any).computedStatus || (message as any).status || 'sent';
              if (st === 'sending') return <span className="text-gray-400">•</span>;
              if (st === 'failed') return <span className="text-red-500">!</span>;
              if (st === 'sent') return <span>✓</span>;
              if (st === 'delivered') return <span>✓✓</span>;
              if (st === 'read') return <span className="text-blue-400">✓✓✓</span>;
              return <span>✓</span>;
            })()}
          </div>
        )}
      </div>

      {isMe && (
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm shrink-0">
          <span className="select-none">{initialsFrom(senderObj)}</span>
        </div>
      )}
    </div>
  )
}

export default MessageContainer
