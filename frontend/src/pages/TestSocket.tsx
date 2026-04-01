import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function TestSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  useEffect(() => {
    // connect to socket (no auth token here; in prod pass JWT)
    const s = io();
    setSocket(s);
    s.on('connect', () => console.log('connected', s.id));
    s.on('chat-message', (m) => setMessages((prev) => [...prev, m]));
    return () => { s.disconnect(); };
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Socket Test</h2>
      <div>Connected: {socket ? String(socket.connected) : 'no'}</div>
      <ul className="mt-4 space-y-2">
        {messages.map((m) => (
          <li key={m._id || Math.random()} className="p-2 bg-white rounded shadow-sm">{m.content || JSON.stringify(m)}</li>
        ))}
      </ul>
    </div>
  );
}
