import * as Y from 'yjs'
import { getSocket } from '../utils/socket'

// Lightweight Y.Doc provider over existing Socket.IO room (bookingId).
// Behavior:
// - Creates a Y.Doc and wires doc updates -> socket.emit('yjs-update')
// - Listens for 'yjs-update' from socket and applies updates to the doc
// - Avoids re-applying local updates by relying on server broadcast semantics

export function createYDocForBooking(bookingId: string) {
  const doc = new Y.Doc()
  const socket = getSocket() || (window as any).socket
  if (!socket) {
    console.warn('[ySocketProvider] No socket available for Y.Doc')
    return { doc, destroy: () => doc.destroy() }
  }

  // Attempt to join the booking room so server will forward updates
  try {
    // server join-room handler accepts ({ bookingId }, ack)
    socket.emit && socket.emit('join-room', { bookingId }, (ack: any) => {
      try { console.debug('[ySocketProvider] join-room ack', ack) } catch (e) {}
    })
  } catch (e) { console.warn('[ySocketProvider] join-room emit failed', e) }

  const outboundHandler = (update: Uint8Array) => {
    try {
      // Convert to array for JSON-safe send
      const arr = Array.from(update)
      socket.emit && socket.emit('yjs-update', { bookingId, update: arr })
    } catch (e) {
      console.warn('[ySocketProvider] Failed to emit yjs-update', e)
    }
  }

  // send local updates
  doc.on('update', outboundHandler)

  // receive remote updates
  const inboundHandler = (data: any) => {
    try {
      if (!data || !data.update) return
      const u8 = new Uint8Array(data.update)
      // apply update (this will merge remote changes)
      Y.applyUpdate(doc, u8)
    } catch (e) {
      console.warn('[ySocketProvider] Failed to apply incoming update', e)
    }
  }

  socket.on && socket.on('yjs-update', inboundHandler)

  const destroy = () => {
    try {
      doc.off('update', outboundHandler)
    } catch (e) {}
    try { socket.off && socket.off('yjs-update', inboundHandler) } catch (e) {}
    try { doc.destroy() } catch (e) {}
  }

  return { doc, destroy }
}
