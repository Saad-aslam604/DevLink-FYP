import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useParams, useNavigate } from 'react-router-dom'
import { initSocket } from '../../utils/socket'
import { 
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  Link as LinkIcon,
  MonitorOff,
  Settings,
  User,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

export default function WebRTCCall({ bookingId: propBookingId, onProvideRemoteStream, confirmLeave }: { bookingId?: string, onProvideRemoteStream?: (s: MediaStream | null) => void, confirmLeave?: () => Promise<boolean> | (() => boolean) }) {
  const params = useParams()
  const bookingId = propBookingId || params.bookingId || null
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? localStorage.getItem('devlink_token') : null
  const { user } = useAuth() || {}

  const [status, setStatus] = useState<string>('Idle')
  const [pc, setPc] = useState<RTCPeerConnection | null>(null)
  const [iceState, setIceState] = useState<string>('new')
  const [connectionState, setConnectionState] = useState<string>('new')
  const [signalingState, setSignalingState] = useState<string>('stable')
  const [debugOpen, setDebugOpen] = useState<boolean>(false)
  const [muted, setMuted] = useState<boolean>(false)
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true)
  const [remoteCallEnded, setRemoteCallEnded] = useState<boolean>(false)
  const [showCallEndedModal, setShowCallEndedModal] = useState<boolean>(false)
  // Add this line with your other useState declarations
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [originalVideoTrack, setOriginalVideoTrack] = useState<MediaStreamTrack | null>(null)
  // ========== ADD THESE STATE VARIABLES ==========
  // Add with your other useState declarations
  const [callDuration, setCallDuration] = useState<number>(0)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ========== ADD TIMER FUNCTIONS ==========
  const startTimer = useCallback(() => {
    // Guard: don't start if already running
    if (isTimerRunning) {
      console.log('Timer already running, skipping start')
      return
    }

    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current as any)
      timerRef.current = null
    }

    console.log('Starting call timer')
    setIsTimerRunning(true)
    // don't reset callDuration here so we continue counting if already incremented

    // Small delay to ensure connection is stable before counting
    setTimeout(() => {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }, 500)
  }, [isTimerRunning])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current as any)
      timerRef.current = null
      console.log('Stopped timer. Final duration:', callDuration, 'seconds')
    }
    setIsTimerRunning(false)
  }, [callDuration])

  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Start timer when connection becomes established; stop when disconnected/failed
  useEffect(() => {
    try {
      const connState = connectionState
      if (iceState === 'connected' || iceState === 'completed' || connState === 'connected') {
        if (!isTimerRunning) {
          console.log('Timer: Starting timer (connected state detected)')
          startTimer()
        } else {
          console.log('Timer: Already running, not restarting')
        }
      } else if (connState === 'closed' || iceState === 'disconnected' || iceState === 'failed') {
        stopTimer()
      }
    } catch (e) { console.warn('[WebRTC] timer effect failed', e) }
    // only run when connection/ice state changes
  }, [connectionState, iceState, startTimer, stopTimer, isTimerRunning])

  // Stop timer when remote call ended
  useEffect(() => {
    if (remoteCallEnded) stopTimer()
  }, [remoteCallEnded, stopTimer])

  // ========== TIMER DEBUG EFFECT ==========
  useEffect(() => {
    try {
      if (!pcRef.current) {
        console.log('❌ Timer Debug: No peer connection ref')
        return
      }

      console.log('✅ Timer Debug: Peer connection exists')
      console.log('📊 Timer Debug: isTimerRunning:', isTimerRunning)
      console.log('⏱️ Timer Debug: callDuration:', callDuration)

      const logConnectionState = () => {
        const ice = pcRef.current?.iceConnectionState
        const conn = (pcRef.current as any)?.connectionState
        console.log('🔌 Timer Debug: ICE State:', ice)
        console.log('🔌 Timer Debug: Connection State:', conn)

        if (ice === 'connected' || ice === 'completed') {
          console.log('🎯 Timer Debug: Should be running timer!')
          if (!isTimerRunning) {
            console.log('⚠️ Timer Debug: Timer not running but should be!')
          }
        }
      }

      pcRef.current.addEventListener('iceconnectionstatechange', logConnectionState)
      logConnectionState() // initial

      return () => {
        try { pcRef.current?.removeEventListener('iceconnectionstatechange', logConnectionState) } catch (e) {}
      }
    } catch (e) { console.warn('[WebRTC] timer debug effect failed', e) }
  }, [isTimerRunning, callDuration])

  // ========== RESET TIMER ==========
  const resetTimer = useCallback(() => {
    try {
      stopTimer()
    } catch (e) { console.warn('[WebRTC] resetTimer stop failed', e) }
    try {
      setCallDuration(0)
      setIsTimerRunning(false)
    } catch (e) { console.warn('[WebRTC] resetTimer set state failed', e) }
    console.log('Timer completely reset')
  }, [stopTimer])
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localAudioRef = useRef<HTMLAudioElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const socketRef = useRef<any>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)

  // mount stabilization
  const [isStableMount, setIsStableMount] = useState(false)
  const mountTimeoutRef = useRef<any>(null)

  useEffect(() => {
    try { /* mount complete */ } catch (e) {}
    mountTimeoutRef.current = setTimeout(() => {
      try { /* stable state achieved */ } catch (e) {}
      setIsStableMount(true)
    }, 800)

    return () => {
      try { if (mountTimeoutRef.current) clearTimeout(mountTimeoutRef.current) } catch (e) {}
      try { setIsStableMount(false) } catch (e) {}
    }
  }, [])

  // queued ICE candidates arriving before remoteDescription is set
  const queuedIceCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const remoteDescriptionSetRef = useRef<boolean>(false)
  const initializedRef = useRef<boolean>(false)
  const signalingLockRef = useRef<boolean>(false)

  // IMPORTANT: Add ALL your original WebRTC logic here including:
  // 1. useEffect for mount stabilization
  // 2. initializeCall function with WebRTC setup
  // 3. Socket event handlers (webrtc-offer, webrtc-answer, webrtc-candidate)
  // 4. ICE candidate handling
  // 5. ontrack handler for remote video
  // 6. All the working code from before deletion

  const endCall = async () => {
    try { resetTimer() } catch (e) { console.warn('[WebRTC] endCall resetTimer failed', e) }

    // Ask parent/host for confirmation if a hook is provided. Wrap parent
    // promise with a timeout so we never hang if the parent fails to resolve.
    try {
      if (confirmLeave) {
        let ok: boolean = false
        try {
          const res = confirmLeave()
          if (res && typeof (res as any).then === 'function') {
            // wait for parent response but don't hang forever
            const timed = await Promise.race([
              (res as Promise<boolean>),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
            ])
            if (timed === null) {
              console.warn('[WebRTC] confirmLeave timed out after 5s; falling back to browser confirm')
              const fallbackMessage = `Leave video call — Are you sure you want to leave?\n\nYour call will end and other participants will be notified. You can rejoin anytime using the same link.`
              const fallback = typeof window.confirm === 'function' ? window.confirm(fallbackMessage) : false
              if (!fallback) {
                /* endCall aborted */
                return
              }
              ok = true
            } else {
              ok = Boolean(timed)
            }
          } else {
            ok = Boolean(res)
          }
          /* leave confirmed */
        } catch (e) { console.warn('[WebRTC] confirmLeave threw', e); ok = false }

        if (!ok) {
          /* endCall aborted */
          return
        }
      }
    } catch (e) { console.warn('[WebRTC] confirmLeave invocation failed', e) }

    try {
      if (socketRef.current) {
        // Notify other peers in-room that call ended (existing behavior)
        socketRef.current.emit('call-ended', { bookingId })
        // Also emit end-call so the server can mark booking completed and emit meeting_ended
        try {
          const localUserId = (user && (user as any)._id) ? String((user as any)._id) : null
          socketRef.current.emit('end-call', { bookingId, userId: localUserId, timestamp: new Date().toISOString() })
        } catch (e) { console.warn('[WebRTC] emit end-call failed', e) }
      }
    } catch (e) { console.warn('[WebRTC] call end emits failed', e) }

    // Close and cleanup connections/tracks robustly
    try { pcRef.current?.close(); pcRef.current = null; setPc(null) } catch (e) { console.warn('[WebRTC] pc close failed', e) }
    try { if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null } } catch (e) { console.warn('[WebRTC] stop tracks failed', e) }

    const s = socketRef.current
    try { if (s) s.emit('leave-room', { bookingId }) } catch (e) { console.warn('[WebRTC] leave-room emit failed', e) }

    // navigate to sessions/dashboard to avoid accidental back navigation
    try { navigate('/app/sessions') } catch (e) { try { navigate('/') } catch (ee) { console.warn('[WebRTC] navigate after end failed', ee) } }
  }

  // Handler for when remote participant ends the call
  const handleRemoteCallEnded = () => {
    try {
      if (pc) pc.close()
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop())
    } catch (e) { console.warn('[WebRTC] handleRemoteCallEnded cleanup failed', e) }
    // navigate away after a short delay so user can see the modal
    setTimeout(() => navigate('/app/sessions'), 1000)
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = muted })
      setMuted(!muted)
    }
  }

  const toggleVideo = async () => {
    try {
      if (videoEnabled) {
        localStreamRef.current?.getVideoTracks().forEach(t => t.stop())
        setVideoEnabled(false)
      } else {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (s) {
          localStreamRef.current = s
          if (localVideoRef.current) { localVideoRef.current.srcObject = s; localVideoRef.current.muted = true; localVideoRef.current.play().catch(() => {}) }
          // replace sender track if available
          try {
            const sender = pcRef.current?.getSenders().find(s => s.track && s.track.kind === 'video')
            const track = s.getVideoTracks()[0]
            if (sender && (sender as any).replaceTrack) await (sender as any).replaceTrack(track)
            else if (pcRef.current && track) pcRef.current.addTrack(track, s)
          } catch (e) { console.warn('[WebRTC] toggleVideo replaceTrack failed', e) }
          setVideoEnabled(true)
        }
      }
    } catch (e) { console.warn('[WebRTC] toggleVideo error', e); setStatus('Failed to toggle camera') }
  }

  // ========== ULTIMATE SCREEN SHARING SOLUTION (complete DOM removal) ==========
  const restoreLocalPreview = useCallback(() => {
    if (localVideoRef.current) {
      try {
        localVideoRef.current.style.display = 'block'
        localVideoRef.current.style.visibility = 'visible'
        localVideoRef.current.style.opacity = '1'
      } catch (e) { console.warn('[WebRTC] restoreLocalPreview failed', e) }
    }

    // Clean up hidden video if present
    if (hiddenVideoRef.current) {
      try { hiddenVideoRef.current.remove() } catch (e) { console.warn('[WebRTC] remove hidden video failed', e) }
      hiddenVideoRef.current = null
    }
  }, [])

  const stopScreenSharing = useCallback(async () => {
    console.log('🖥️ Stopping screen sharing...')

    const videoSender = pcRef.current?.getSenders().find((s: any) => s.track?.kind === 'video')

    if (videoSender && originalVideoTrack) {
      try {
        await (videoSender as any).replaceTrack(originalVideoTrack)
        console.log('✅ Restored camera track')
      } catch (e) { console.warn('[WebRTC] restore original track failed', e) }
    } else if (videoSender) {
      // Fallback: get fresh camera
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cameraStream.getVideoTracks().length > 0) {
          try { await (videoSender as any).replaceTrack(cameraStream.getVideoTracks()[0]) } catch (e) { console.warn('[WebRTC] replace with fresh camera failed', e) }
          // Update local stream reference
          try { if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()) } } catch (e) {}
          localStreamRef.current = cameraStream
          console.log('✅ Got fresh camera stream')
        }
      } catch (cameraError) { console.error('❌ Failed to get camera:', cameraError) }
    }

    // Restore UI and cleanup
    restoreLocalPreview()
    setIsScreenSharing(false)
    setOriginalVideoTrack(null)
    console.log('✅ Screen sharing stopped')
  }, [originalVideoTrack, restoreLocalPreview])

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        console.log('🖥️ Starting screen sharing (PHYSICAL DOM REMOVAL)...');

        // 1. Store original video sender track
        const videoSender = pcRef.current?.getSenders().find((s: any) => s.track?.kind === 'video');
        if (!videoSender || !videoSender.track) {
          console.error('[WebRTC] No video track found to replace');
          return;
        }
        setOriginalVideoTrack(videoSender.track as MediaStreamTrack);

        // 2. CRITICAL: PHYSICALLY MOVE VIDEO ELEMENT OUT OF MAIN UI DOM
        let originalParent: HTMLElement | null = null;
        if (localVideoRef.current) {
          // Store original parent for restoration
          originalParent = localVideoRef.current.parentElement;

          // Create a hidden container COMPLETELY OFF-SCREEN in document.body
          const hiddenContainer = document.createElement('div');
          hiddenContainer.id = 'hidden-video-container-' + Date.now();
          hiddenContainer.style.position = 'fixed';
          hiddenContainer.style.top = '-9999px';
          hiddenContainer.style.left = '-9999px';
          hiddenContainer.style.width = '1px';
          hiddenContainer.style.height = '1px';
          hiddenContainer.style.opacity = '0';
          hiddenContainer.style.pointerEvents = 'none';
          hiddenContainer.style.zIndex = '-1000';
          hiddenContainer.style.overflow = 'hidden';

          // Move video element to hidden container (OUTSIDE main UI)
          document.body.appendChild(hiddenContainer);
          hiddenContainer.appendChild(localVideoRef.current);

          // Store references for later restoration
          (window as any).__originalVideoParent = originalParent;
          (window as any).__hiddenVideoContainer = hiddenContainer;

          console.log('✅ Video element physically moved out of main UI DOM');
        }

        // 3. WAIT for browser to re-render (CRITICAL - gives time for DOM update)
        await new Promise(resolve => {
          // Force browser reflow to ensure video is gone from UI
          document.body.offsetHeight;
          setTimeout(resolve, 300);
        });

        // 4. NOW ask for screen share (video element is GONE from main UI)
        const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: { 
            cursor: 'always', 
            displaySurface: 'window' // Prefer window over screen to avoid capturing browser
          } as any,
          audio: false
        }) as MediaStream;

        if (!screenStream || screenStream.getVideoTracks().length === 0) {
          // User cancelled - restore video immediately
          restoreVideoToOriginalPosition();
          return;
        }

        // 5. Replace WebRTC track with screen track
        try {
          await (videoSender as any).replaceTrack(screenStream.getVideoTracks()[0]);
          setIsScreenSharing(true);
          console.log('✅ Screen sharing active (video completely removed from UI)');
        } catch (e) { 
          console.warn('[WebRTC] replaceTrack with screen failed', e);
          restoreVideoToOriginalPosition();
          return;
        }

        // 6. Handle when user stops via browser controls
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.onended = () => {
          console.log('🛑 Browser stopped screen share');
          try { 
            stopScreenSharing(); 
            restoreVideoToOriginalPosition();
          } catch (e) { console.warn('[WebRTC] stopScreenSharing onended failed', e) }
        };
        (screenStream as any).oninactive = () => {
          console.log('📺 Screen stream inactive');
          try { 
            stopScreenSharing(); 
            restoreVideoToOriginalPosition();
          } catch (e) { console.warn('[WebRTC] stopScreenSharing oninactive failed', e) }
        };

      } else {
        // User clicked to stop sharing
        await stopScreenSharing();
        restoreVideoToOriginalPosition();
      }
    } catch (error) {
      console.error('❌ Screen sharing error:', error);
      restoreVideoToOriginalPosition();
      setIsScreenSharing(false);
    }
  }, [isScreenSharing, stopScreenSharing]);

  // Function to restore video element to its original position in DOM
  const restoreVideoToOriginalPosition = useCallback(() => {
    try {
      const originalParent = (window as any).__originalVideoParent;
      const hiddenContainer = (window as any).__hiddenVideoContainer;
      
      if (localVideoRef.current && originalParent && hiddenContainer) {
        // Move video back to its original parent element
        originalParent.appendChild(localVideoRef.current);
        
        // Remove the hidden container from DOM
        try { hiddenContainer.remove() } catch (e) { console.warn('[WebRTC] remove hidden container failed', e) }
        
        // Clean up global references
        delete (window as any).__originalVideoParent;
        delete (window as any).__hiddenVideoContainer;
        
        console.log('✅ Video element restored to original DOM position');
      }
    } catch (e) {
      console.warn('[WebRTC] restoreVideoToOriginalPosition failed', e);
    }
  }, []);

  // Try to force playback on both video elements (useful when autoplay is blocked)
  const testPlayback = async () => {
    try {
      if (remoteVideoRef.current) await remoteVideoRef.current.play()
      if (localVideoRef.current) await localVideoRef.current.play()
      setStatus('Playback OK')
    } catch (e) {
      console.warn('[WebRTC] testPlayback failed', e)
      setStatus('Playback failed - user interaction required')
    }
  }

  // ICE restart helper: createOffer with iceRestart and send via signaling
  const restartIce = async () => {
    try {
      const peer = pcRef.current
      const socket = socketRef.current
      if (!peer || !socket) {
        setStatus('No peer/socket to restart ICE')
        return
      }

      if (signalingLockRef.current) {
        setStatus('Signaling busy')
        return
      }
      signalingLockRef.current = true

      setStatus('Requesting ICE restart')
      const offer = await peer.createOffer({ iceRestart: true })
      await peer.setLocalDescription(offer)
      // reuse existing signaling channel - emit an offer that peers will treat as an ICE restart
      socket.emit('webrtc-offer', { bookingId, offer: peer.localDescription })
      setTimeout(() => { signalingLockRef.current = false }, 1000)
    } catch (e) {
      console.warn('[WebRTC] restartIce failed', e)
      setStatus('ICE restart failed')
      signalingLockRef.current = false
    }
  }

  // Main WebRTC initialize effect
  useEffect(() => {
    if (!isStableMount) return
    if (!bookingId) return
    if (initializedRef.current) return
    initializedRef.current = true

    let mounted = true

    const initializeCall = async () => {
      setStatus('Initializing')
  const socket = initSocket(typeof window !== 'undefined' ? (localStorage.getItem('devlink_token') || undefined) : undefined)
      socketRef.current = socket
      try { socket.on('connect', () => { setStatus('Socket connected') }) } catch (e) {}
      try { 
        socket.on('disconnect', () => { 
          setStatus('Socket disconnected - attempting to reconnect...')
          // Auto-reconnect after 2 seconds
          const timer = setTimeout(() => {
            try { 
              if (socketRef.current && typeof socketRef.current.connect === 'function') {
                socketRef.current.connect()
                setStatus('Reconnecting...')
              }
            } catch (e) { console.warn('[WebRTC] reconnect failed', e) }
          }, 2000)
          return () => clearTimeout(timer)
        }) 
      } catch (e) {}

      const configuration: any = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          {
            urls: [
              'turn:openrelay.metered.ca:80',
              'turn:openrelay.metered.ca:443',
              'turn:openrelay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all'
      }

      const peer = new RTCPeerConnection(configuration)
      pcRef.current = peer
      setPc(peer)

      // connection/ICE/signaling state listeners for diagnostics and UI
      try {
        setIceState(peer.iceConnectionState || 'new')
        setConnectionState((peer as any).connectionState || 'new')
        setSignalingState(peer.signalingState || 'stable')

        peer.addEventListener('iceconnectionstatechange', () => {
          const s = peer.iceConnectionState
          /* ice connection state changed */
          setIceState(s)
          if (s === 'connected' || s === 'completed') setStatus('Connected')
          else if (s === 'failed') setStatus('ICE failed')
          else if (s === 'disconnected') setStatus('ICE disconnected')
          else setStatus(s)
        })

        peer.addEventListener('connectionstatechange', () => {
          const s = (peer as any).connectionState || 'unknown'
          /* connection state changed */
          setConnectionState(s)
        })

        peer.addEventListener('signalingstatechange', () => {
          const s = peer.signalingState || 'unknown'
          /* signaling state changed */
          setSignalingState(s)
        })
      } catch (e) { console.warn('[WebRTC] add state listeners failed', e) }

      peer.onicecandidate = (event) => {
        try {
          if (event.candidate) {
            socket.emit('webrtc-candidate', { bookingId, candidate: event.candidate })
          }
        } catch (e) { console.warn('[WebRTC] emit candidate failed', e) }
      }

      peer.ontrack = (event) => {
        try {
          /* remote track received */
          const stream = (event.streams && event.streams[0]) || new MediaStream([event.track])

          if (remoteVideoRef.current) {
            if (remoteVideoRef.current.srcObject !== stream) remoteVideoRef.current.srcObject = stream
            try { if (onProvideRemoteStream) onProvideRemoteStream(stream) } catch (e) {}
            const playPromise = remoteVideoRef.current.play()
            if (playPromise !== undefined) {
              playPromise.then(() => {
                /* remote video playing */
                setStatus(prev => (prev === 'Initializing' ? 'Playing' : prev))
              }).catch((err) => {
                console.warn('[WebRTC] remote play failed', err)
                // Autoplay is often blocked; reflect in status so user can interact
                setStatus('Autoplay blocked - user action required')
              })
            }
          }

          if (remoteAudioRef.current) {
            if (remoteAudioRef.current.srcObject !== stream) remoteAudioRef.current.srcObject = stream
            remoteAudioRef.current.play().catch(() => {})
          }
        } catch (e) { console.warn('[WebRTC] ontrack error', e) }
      }

      // safe setter for remote description and queued candidates
      const setRemoteDescriptionSafe = async (desc: any) => {
        try {
          if (!desc) return
          const remoteDesc = (desc && desc.type && desc.sdp) ? desc : (desc && (desc.answer || desc.offer) ? (desc.answer || desc.offer) : desc)
          await peer.setRemoteDescription(remoteDesc)
          remoteDescriptionSetRef.current = true
          const queued = queuedIceCandidatesRef.current || []
          for (const q of queued) { try { await peer.addIceCandidate(q as any) } catch (e) { console.warn('[WebRTC] queued addIceCandidate failed', e) } }
          queuedIceCandidatesRef.current = []
        } catch (e) { console.warn('[WebRTC] setRemoteDescriptionSafe failed', e) }
      }

      const handleIncomingCandidate = async (candidate: any) => {
        try {
          if (!candidate) return

          /* ICE candidate ready */

          // Normalize and validate different candidate shapes
          let rtc: RTCIceCandidate

          // Case 1: Already an RTCIceCandidate instance
          if (candidate instanceof RTCIceCandidate) {
            rtc = candidate
          }
          // Case 2: Wrapper { candidate: string, sdpMid, sdpMLineIndex }
          else if (candidate.candidate && typeof candidate.candidate === 'string') {
            rtc = new RTCIceCandidate({
              candidate: candidate.candidate,
              sdpMid: candidate.sdpMid ?? null,
              sdpMLineIndex: candidate.sdpMLineIndex ?? null
            })
          }
          // Case 3: The socket forwarded a plain candidate string
          else if (typeof candidate === 'string') {
            rtc = new RTCIceCandidate({ candidate, sdpMid: null, sdpMLineIndex: null })
          }
          // Case 4: Nested object like { candidate: { candidate: '...', sdpMid, ... } }
          else if (candidate.candidate && typeof candidate.candidate === 'object') {
            rtc = new RTCIceCandidate(candidate.candidate)
          }
          // Unknown format: bail out after logging
          else {
            console.warn('[WebRTC] Unrecognized candidate format, skipping:', candidate)
            return
          }

          if (!remoteDescriptionSetRef.current) {
            queuedIceCandidatesRef.current.push(rtc as any)
            /* ICE candidate queued */
            return
          }

          await peer.addIceCandidate(rtc)
          /* ICE candidate added */
        } catch (e) {
          console.warn('[WebRTC] handleIncomingCandidate failed:', e)
          // swallow errors to avoid breaking signaling
        }
      }

      // socket handlers
      socket.on('webrtc-offer', async (data: any) => {
        try {
          /* SDP offer received */
          await setRemoteDescriptionSafe(data.offer || data)
          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          socket.emit('webrtc-answer', { bookingId, answer: peer.localDescription })
        } catch (e) { console.warn('[WebRTC] offer handler failed', e) }
      })

      socket.on('webrtc-answer', async (data: any) => {
        try {
          /* SDP answer received */
          await setRemoteDescriptionSafe(data.answer || data)
        } catch (e) { console.warn('[WebRTC] answer handler failed', e) }
      })

      socket.on('webrtc-candidate', async (data: any) => {
        try {
          try {
            console.log('🔍 RAW CANDIDATE DATA FROM SOCKET:', {
              fullData: data,
              candidateString: data?.candidate?.candidate,
              typeOfCandidate: typeof data?.candidate,
              isRTCIceCandidate: (data && data.candidate) instanceof RTCIceCandidate
            })
          } catch (e) { console.warn('[WebRTC] candidate logging failed', e) }

          if (data && data.candidate) await handleIncomingCandidate(data.candidate)
        } catch (e) { console.warn('[WebRTC] candidate handler failed', e) }
      })

      // remote call ended signaling
      socket.on('remote-call-ended', (data: any) => {
        try {
          /* remote ended call */
          setRemoteCallEnded(true)
          setShowCallEndedModal(true)
          setStatus('Call ended by other participant')

          setTimeout(() => {
            try { handleRemoteCallEnded() } catch (e) { console.warn('[WebRTC] delayed remote end failed', e) }
          }, 5000)
        } catch (e) { console.warn('[WebRTC] remote-call-ended handler failed', e) }
      })

      // get local media and add tracks
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: true })
        localStreamRef.current = stream
        if (localVideoRef.current) { localVideoRef.current.srcObject = stream; localVideoRef.current.muted = true; localVideoRef.current.play().catch(() => {}) }
        if (localAudioRef.current) { localAudioRef.current.srcObject = stream; localAudioRef.current.muted = true }
        stream.getTracks().forEach(t => { try { peer.addTrack(t, stream) } catch (e) {} })
      } catch (e) {
        console.warn('[WebRTC] getUserMedia failed', e)
        setStatus('Media access denied')
      }

      // negotiate via onnegotiationneeded
      peer.onnegotiationneeded = async () => {
        if (signalingLockRef.current) return
        signalingLockRef.current = true
        try {
          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          socket.emit('webrtc-offer', { bookingId, offer: peer.localDescription })
        } catch (e) { console.warn('[WebRTC] negotiate failed', e) } finally { setTimeout(() => { signalingLockRef.current = false }, 1000) }
      }

      // join the room so signaling messages get forwarded
      try {
        try { /* join-room emitting */ } catch (e) {}
        socket.emit('join-room', { bookingId })
        try { /* join-room emitted */ } catch (e) {}
      } catch (e) {
        try { console.warn('[DIAG] WebRTCCall join-room emit failed', e) } catch (ee) {}
      }

    }

    initializeCall().catch(e => console.warn('[WebRTC] initializeCall error', e))

    return () => {
      try { pcRef.current?.close(); pcRef.current = null } catch (e) {}
      try { localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null } catch (e) {}
      try { socketRef.current?.emit('leave-room', { bookingId }); socketRef.current = null } catch (e) {}
      initializedRef.current = false
      remoteDescriptionSetRef.current = false
      queuedIceCandidatesRef.current = []
    }
  }, [isStableMount, bookingId])

  // =================== AUTO-END CALL LISTENERS (frontend) ===================
  useEffect(() => {
    const socket = socketRef.current
    const localUserId = (user && (user as any)._id) ? String((user as any)._id) : null
    if (!socket || !bookingId) return

    const handleRemoteCallEnded = (data: any) => {
      try {
        console.log('Remote call ended received:', data)
        setStatus('Call ended by other participant')
        setRemoteCallEnded(true)
        setShowCallEndedModal(true)

        // Clean up peer connection
        try { pcRef.current?.close(); pcRef.current = null } catch (e) { console.warn(e) }

        // Stop local media tracks
        try {
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop())
            localStreamRef.current = null
          }
        } catch (e) { console.warn(e) }

        // Clear video elements
        try { if (localVideoRef.current) localVideoRef.current.srcObject = null } catch (e) {}
        try { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null } catch (e) {}

        // navigate away after short delay so user can see modal
        setTimeout(() => { try { navigate('/app/sessions') } catch (e) { console.warn(e) } }, 3000)
      } catch (e) { console.warn('[WebRTC] handleRemoteCallEnded failed', e) }
    }

    const handleCallEndedConfirmation = (data: any) => {
      try {
        console.log('Call ended confirmation:', data && data.message ? data.message : data)
        setStatus('Call ended')
      } catch (e) { console.warn(e) }
    }

    const handleUserLeft = (data: any) => {
      try {
        console.log('User left room:', data)
        if (!data || !data.userId || !data.roomId) return
        if (data.roomId === `booking_${bookingId}` && String(data.userId) !== localUserId) {
          handleRemoteCallEnded({ endedBy: data.userId, reason: data.reason, timestamp: new Date().toISOString() })
        }
      } catch (e) { console.warn(e) }
    }

    socket.on('remote-call-ended', handleRemoteCallEnded)
    socket.on('call-ended-confirmation', handleCallEndedConfirmation)
    socket.on('user_left', handleUserLeft)

    // Listen for end session message from live coding window
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'END_SESSION_FROM_CODING') {
        try {
          console.log('Live coding ended - closing video call')
          handleEndCall()
        } catch (e) { console.warn('Failed to end call from coding message', e) }
      }
    }
    window.addEventListener('message', handleMessage)

    return () => {
      try { socket.off('remote-call-ended', handleRemoteCallEnded) } catch (e) {}
      try { socket.off('call-ended-confirmation', handleCallEndedConfirmation) } catch (e) {}
      try { socket.off('user_left', handleUserLeft) } catch (e) {}
      window.removeEventListener('message', handleMessage)
    }
  }, [bookingId, user, navigate])

  // Ensure hiddenVideoRef is removed on unmount
  useEffect(() => {
    return () => {
      try {
        if (hiddenVideoRef.current) {
          hiddenVideoRef.current.remove()
          hiddenVideoRef.current = null
        }
      } catch (e) { console.warn('[WebRTC] cleanup hidden video failed', e) }
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* ========== MAIN VIDEO AREA (80% of screen) ========== */}
      <div className="flex-1 relative">
        {/* Remote Video - Full screen */}
        <div className="absolute inset-0">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Subtle gradient at bottom for better control visibility */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900/80 to-transparent pointer-events-none" />
        </div>

        {/* Local Video - Picture-in-Picture */}
        <div className="absolute top-4 right-4 w-64 h-48 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {/* You badge */}
          <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            You {muted ? '🔇' : '🎤'}
          </div>
        </div>

        {/* Connection Status */}
        <div className="absolute top-4 left-4 bg-black/80 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm">Connected</span>
            <span className="text-xs text-white/60 ml-2">
              {formatTime(callDuration)}
            </span>
          </div>
        </div>

        {/* Screen Sharing Status Indicator (top center) */}
        {isScreenSharing && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-purple-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 border border-purple-400">
              <Monitor className="w-5 h-5" />
              <span className="font-semibold">Sharing Screen</span>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse ml-2" />
              <button
                onClick={stopScreenSharing}
                className="ml-4 text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
              >
                Stop Sharing
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== CONTROLS BAR (20% of screen) ========== */}
      <div className="bg-gray-900 border-t border-white/10">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left: Timer & Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-black/40 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${isTimerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="font-mono font-bold text-white">{formatTime(callDuration)}</span>
                <span className={`text-sm ${isTimerRunning ? 'text-emerald-400' : 'text-white/60'}`}>{isTimerRunning ? 'Live' : 'Ready'}</span>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((bar) => (
                    <div key={bar} className="w-1 h-3 bg-emerald-500 rounded-full" />
                  ))}
                </div>
                <span className="text-sm text-white/70">Excellent</span>
              </div>
            </div>

            {/* Center: Main Controls */}
            <div className="flex items-center gap-3">
              <button onClick={toggleMute} className={`p-3 rounded-full transition-all duration-200 ${muted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`} title={muted ? 'Unmute' : 'Mute'}>
                {muted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
              </button>

              <button onClick={toggleVideo} className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center font-semibold ${!videoEnabled ? 'bg-red-600 hover:bg-red-700 ring-2 ring-red-400' : 'bg-blue-600 hover:bg-blue-700'}`} title={videoEnabled ? 'Stop Video (Alt+V)' : 'Start Video (Alt+V)'}>
                {videoEnabled ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-white" />}
              </button>

              {/* Screen Share Button */}
              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-full transition-all duration-200 ${
                  isScreenSharing 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
              >
                {isScreenSharing ? (
                  <MonitorOff className="w-5 h-5 text-white" />
                ) : (
                  <Monitor className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Live Coding (PIP navigation) - navigate to /app/video/{id}?mode=coding in same tab */}
              <button
                onClick={() => {
                  try {
                    const token = (typeof window !== 'undefined')
                      ? (localStorage.getItem('devlink_token') || localStorage.getItem('token'))
                      : null
                    const encodedToken = token ? encodeURIComponent(token) : ''
                    
                    // Store the video call URL so live coding can return to it
                    try {
                      sessionStorage.setItem(`video-call-url-${bookingId}`, `/app/video/${bookingId}`)
                    } catch (e) { console.warn('Failed to store video call URL', e) }
                    
                    const url = bookingId
                      ? `/app/video/${bookingId}?mode=coding${encodedToken ? `&token=${encodedToken}` : ''}`
                      : `/app/video?mode=coding${encodedToken ? `&token=${encodedToken}` : ''}`
                    console.log('🎯 Button clicked: Navigating to YouTube PIP mode', url)
                    window.location.href = url
                  } catch (err) {
                    console.error('Failed to navigate to PIP video route:', err)
                  }
                }}
                className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                title="Start Live Coding"
              >
                Live Coding
              </button>


              {/* Copy Meeting Link Button */}
              <button
                onClick={() => {
                  try {
                    const meetingLink = bookingId ? `${window.location.origin}/app/video/${bookingId}` : window.location.href
                    navigator.clipboard.writeText(meetingLink).then(() => {
                      console.log('📋 Meeting link copied:', meetingLink)
                    }).catch(err => {
                      console.error('Failed to copy link:', err)
                    })
                  } catch (err) { console.error('Copy link error', err) }
                }}
                className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                title="Copy Meeting Link"
              >
                <LinkIcon className="w-5 h-5 text-white" />
              </button>

              <div className="w-px h-8 bg-white/20 mx-2" />

              <button onClick={endCall} className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-200 shadow-lg" title="End Call">
                <PhoneOff className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Right: Settings */}
            <button onClick={() => setDebugOpen(!debugOpen)} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-all duration-200" title="Settings">
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Control labels removed per UI request; tooltips remain on the buttons */}

          {/* Settings / Diagnostics Panel */}
          {debugOpen && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
              <div className="pointer-events-auto w-full max-w-md m-4 bg-gray-800/90 border border-white/10 rounded-lg p-4 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-white font-semibold">Call Settings & Diagnostics</h3>
                    <p className="text-sm text-white/70">Useful tools to diagnose connection and media.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDebugOpen(false)} className="text-white/70 hover:text-white px-2 py-1 rounded-md">Close</button>
                  </div>
                </div>

                <div className="mt-3 text-sm text-white/80">
                  <div className="mb-2"><strong>Status:</strong> <span className="ml-2">{status}</span></div>
                  <div className="mb-2"><strong>ICE:</strong> <span className="ml-2">{iceState}</span> &nbsp;|&nbsp; <strong>Conn:</strong> <span className="ml-2">{connectionState}</span></div>
                  <div className="mb-2"><strong>Signaling:</strong> <span className="ml-2">{signalingState}</span></div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={restartIce} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Restart ICE</button>
                  <button onClick={testPlayback} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Test Playback</button>
                  <button onClick={() => { console.log('Queued ICE candidates:', queuedIceCandidatesRef.current) }} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Show Queued ICE</button>
                  <button onClick={() => { navigator.mediaDevices?.getSupportedConstraints && console.log('Supported media constraints:', navigator.mediaDevices.getSupportedConstraints()) }} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Media Info</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

