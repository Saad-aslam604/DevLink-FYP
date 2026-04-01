
import { io, Socket } from 'socket.io-client';
import.meta.env;
let socket: Socket | null = null;

export function initSocket(token?: string) {
  if (socket) return socket;
  // If caller didn't provide a token, try to read it from localStorage for convenience.
  // Many components call initSocket() without args; reading localStorage here ensures
  // the auth token is used when available.
  try {
    if (!token && typeof window !== 'undefined') {
      const stored = localStorage.getItem('devlink_token') || localStorage.getItem('token')
      if (stored) token = stored
    }
  } catch (e) { /* ignore localStorage errors */ }
  // Connect to the same origin and use the standard socket.io path. Vite dev server
  // proxies `/socket.io` to the backend (see vite.config.ts) so the client can connect
  // via the current origin with the default path.
  socket = io('/', {
    path: '/socket.io',
    auth: token ? { token } : undefined,
    // Allow polling fallback in case websocket handshake is blocked by proxies
    // or intermediary tooling. Previously this client forced websocket-only
    // which can fail in some dev environments.
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  socket.on('connect', () => {
    console.info('[socket] connected', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connect_error', err && err.message ? err.message : err, err);
  });

  socket.on('disconnect', (reason) => {
    console.info('[socket] disconnected', reason);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
