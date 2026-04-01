import React from 'react'
import WebRTCCall from './WebRTCCall'

export default function VideoCall({ onProvideRemoteStream, confirmLeave }: { onProvideRemoteStream?: (s: MediaStream | null) => void, confirmLeave?: () => Promise<boolean> | (() => boolean) }) {
  // Render the WebRTC-based call component (replaces the previous Daily iframe integration)
  return <WebRTCCall onProvideRemoteStream={onProvideRemoteStream} confirmLeave={confirmLeave} />
}
