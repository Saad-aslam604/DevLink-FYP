import React, { useState } from 'react'
import { PlayIcon, ClearIcon, Spinner, CheckCircleIcon, AlertCircleIcon } from './Icons'

interface CodeExecutorProps {
  code: string
  language: string
  onOutput?: (output: string) => void
}

export default function CodeExecutor({ code, language, onOutput }: CodeExecutorProps) {
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const runJS = async (src: string) => {
    setLoading(true)
    setError(null)
    const logs: string[] = []

    const capture = (...args: any[]) => {
      try {
        const s = args.map(a => {
          try { return typeof a === 'string' ? a : JSON.stringify(a) } catch (e) { return String(a) }
        }).join(' ')
        logs.push(s)
      } catch (e) { logs.push(String(args)) }
    }

    const customConsole = {
      log: (...args: any[]) => { capture(...args); console.log(...args) },
      info: (...args: any[]) => { capture(...args); console.info(...args) },
      warn: (...args: any[]) => { capture('[warn]', ...args); console.warn(...args) },
      error: (...args: any[]) => { capture('[error]', ...args); console.error(...args) },
    }

    try {
      // Use AsyncFunction so both sync and async code can run
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
      // Run the user code with a custom console
      const fn = new AsyncFunction('console', src)
      const result = await fn(customConsole)
      if (typeof result !== 'undefined') logs.push(String(result))
      const out = logs.join('\n') || (typeof result === 'undefined' ? '' : String(result))
      setOutput(out)
      onOutput && onOutput(out)
    } catch (err: any) {
      const msg = (err && err.stack) ? String(err.stack) : String(err)
      setError(msg)
      setOutput((logs.length ? logs.join('\n') + '\n' : '') + msg)
      onOutput && onOutput(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRun = () => {
    setOutput('')
    setError(null)
    if (!code || !code.trim()) {
      setOutput('// No code to run')
      return
    }

    if (language === 'javascript') runJS(code)
    else if (language === 'html') {
      setOutput('HTML preview mode — open in a new window to preview.')
    } else {
      setOutput(`${language} execution coming soon`)
    }
  }

  const handleClear = () => {
    setOutput('')
    setError(null)
  }

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #1f2937', background: '#0b1220', color: '#e6eef8', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Code Runner</div>
        <div style={{ marginLeft: '8px', padding: '4px 8px', background: '#111827', borderRadius: 6, fontSize: 12 }}>{language}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handleRun} disabled={loading} style={{ padding: '6px 10px', background: loading ? '#6b7280' : '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: loading ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {loading ? (<><Spinner size={14} /> <span>Running...</span></>) : (<><PlayIcon size={14} /> <span>Run Code</span></>)}
          </button>
          <button onClick={handleClear} style={{ padding: '6px 10px', background: '#1f2937', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ClearIcon size={14} /> <span>Clear</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {error ? (
          <><AlertCircleIcon size={16} /> <div style={{ fontSize: 13, fontWeight: 600 }}>Error</div></>
        ) : (
          <><CheckCircleIcon size={16} /> <div style={{ fontSize: 13, fontWeight: 600 }}>Output</div></>
        )}
      </div>

  <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace', fontSize: 13, lineHeight: 1.4, borderRadius: 6, padding: 10, background: '#071025', minHeight: 80, whiteSpace: 'pre-wrap', overflowY: 'auto', maxHeight: '40vh', boxSizing: 'border-box' }}>
        {output ? (
          <div style={{ color: error ? '#fecaca' : '#bbf7d0' }}>{output}</div>
        ) : (
          <div style={{ color: '#94a3b8' }}>{loading ? 'Executing...' : 'Output will appear here'}</div>
        )}
      </div>
    </div>
  )
}
