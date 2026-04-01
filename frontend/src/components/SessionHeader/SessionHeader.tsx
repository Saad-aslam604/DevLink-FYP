import React from 'react'

interface Participant {
  _id?: string | number
  firstName?: string
  lastName?: string
  name?: string
  avatar?: string
}

interface Session {
  otherName?: string
  mentor?: Participant
  startTime?: string
  date?: string
  time?: string
}

interface Props {
  session: Session
  hideMessagesHeading?: boolean
  children?: React.ReactNode
}

const SessionHeader: React.FC<Props> = ({ session, hideMessagesHeading = false, children }) => {
  const name = session?.otherName || session?.mentor?.firstName || session?.mentor?.name || 'Mentor'
  const time = session?.startTime || session?.date || session?.time || null

  return (
    <div className="bg-blue-50 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">Session with {name}</div>
          {time && <div className="text-sm text-gray-600">{new Date(time).toLocaleString()}</div>}
        </div>
        {!hideMessagesHeading && <div className="text-sm text-gray-500">Messages</div>}
      </div>

      {children}
    </div>
  )
}

export default SessionHeader
