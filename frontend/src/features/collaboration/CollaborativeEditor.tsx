import React, { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { setupEditorThemes } from './enhancements/EditorTheme'
import { initSocket, getSocket } from '../../utils/socket'
import type * as monaco from 'monaco-editor'

type Props = {
  bookingId?: string
  demo?: boolean
  initialCode?: string
  language?: string
}

export default function CollaborativeEditor({ bookingId, initialCode = '// Start typing...', language = 'javascript' }: Props): JSX.Element {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const sendTimerRef = useRef<number | null>(null)
  const isApplyingRemoteRef = useRef(false)
  const roomRef = useRef<string>(bookingId ?? 'shared-demo')

  useEffect(() => {
    try { initSocket() } catch (e) {}
    const s = getSocket()
    if (!s) {
      setStatus('disconnected')
      return
    }

    const onConnect = () => {
      setStatus('connected')
      try { s.emit && s.emit('join-collab-room', roomRef.current) } catch (e) {}
    }
    const onDisconnect = () => setStatus('disconnected')
    const onError = () => setStatus('error')

    s.on && s.on('connect', onConnect)
    s.on && s.on('disconnect', onDisconnect)
    s.on && s.on('connect_error', onError)

    const reconnectHandler = () => {
      try { s.emit && s.emit('join-collab-room', roomRef.current) } catch (e) {}
    }
    s.on && s.on('reconnect', reconnectHandler)

    const inbound = (payload: any) => {
      try {
        if (!payload || payload.roomId !== roomRef.current) return
        const sid = s.id || null
        if (payload.senderId && sid && payload.senderId === sid) return
        const code = typeof payload.code === 'string' ? payload.code : null
        if (code === null) return

        const editor = editorRef.current
        if (!editor) return

        isApplyingRemoteRef.current = true
        try {
          const model = editor.getModel()
          if (!model) return
          const sel = editor.getSelection()
          const fullRange = model.getFullModelRange()
          editor.executeEdits('collab-remote', [{ range: fullRange, text: code, forceMoveMarkers: true }])
          if (sel) {
            try { editor.setSelection(sel) } catch (e) {}
          }
          /* remote update applied */
        } finally {
          window.setTimeout(() => { isApplyingRemoteRef.current = false }, 20)
        }
      } catch (e) { /* inbound update failed */ }
    }

    s.on && s.on('collab-code-update', inbound)

    return () => {
      try {
        s.off && s.off('connect', onConnect)
        s.off && s.off('disconnect', onDisconnect)
        s.off && s.off('connect_error', onError)
        s.off && s.off('reconnect', reconnectHandler)
        s.off && s.off('collab-code-update', inbound)
      } catch (e) {}
    }
  }, [])

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    try {
      // register themes if available
      try { setupEditorThemes() } catch (e) {}
      try {
        const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        const mon = (window as any).monaco
        if (mon && mon.editor && mon.editor.setTheme) mon.editor.setTheme(prefersDark ? 'devlink-dark' : 'devlink-light')
      } catch (e) {}
    } catch (e) {}
    editorRef.current = editor
    try {
      const model = editor.getModel()
      if (model && model.getValue().trim() === '') model.setValue(initialCode)
    } catch (e) {}

    const changeListener = editor.onDidChangeModelContent(() => {
      try {
        if (isApplyingRemoteRef.current) return
        if (sendTimerRef.current) { window.clearTimeout(sendTimerRef.current); sendTimerRef.current = null }
        sendTimerRef.current = window.setTimeout(() => {
          try {
            const s = getSocket()
            if (!s || !(s && (s as any).connected)) return
            const model = editor.getModel()
            if (!model) return
            const code = model.getValue()
            const roomId = roomRef.current
            if (!roomId || typeof roomId !== 'string') return
            try { s.emit && s.emit('collab-code-update', { roomId, code }) } catch (e) { /* emit failed */ }
            /* update sent */
          } catch (e) { /* send failed */ }
        }, 300) as unknown as number
      } catch (e) { /* change listener failed */ }
    })

    try {
      const s = getSocket()
      if (s && (s as any).connected) { try { s.emit && s.emit('join-collab-room', roomRef.current) } catch (e) {} }
    } catch (e) {}

    ;(editor as any)._collabCleanup = () => {
      try { changeListener && changeListener.dispose && changeListener.dispose() } catch (e) {}
      try { if (sendTimerRef.current) { window.clearTimeout(sendTimerRef.current); sendTimerRef.current = null } } catch (e) {}
      try { const s = getSocket(); if (s) { try { s.emit && s.emit('leave-collab-room', roomRef.current) } catch (e) {} } } catch (e) {}
      editorRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      try { if (editorRef.current && (editorRef.current as any)._collabCleanup) (editorRef.current as any)._collabCleanup() } catch (e) {}
    }
  }, [])

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e6e6e6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 13 }}>Realtime (socket)</strong>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: status === 'connected' ? '#16a34a' : status === 'connecting' ? '#f59e0b' : status === 'error' ? '#dc2626' : '#9ca3af' }} />
          <span style={{ color: '#374151', fontSize: 13 }}>{status}</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#374151' }}>Language</label>
          <select defaultValue={language} onChange={(ev) => {
            try { const mon = (window as any).monaco; const ed = editorRef.current; if (ed && ed.getModel && mon) { mon.editor.setModelLanguage(ed.getModel(), ev.target.value) } } catch (e) {}
          }} style={{ padding: '6px 8px', borderRadius: 6 }}>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, minHeight: 0, overflow: 'hidden' }} className="monaco-editor-wrapper">
        <Editor height="100%" defaultLanguage={language} defaultValue={initialCode} onMount={handleEditorMount} theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 14 }} />
      </div>
    </div>
  )
}