import React, {useEffect, useState} from 'react';

type EditorType = React.ComponentType<any> | null;

export default function MonacoTest() {
  const [status, setStatus] = useState<'idle'|'loading'|'loaded'|'error'>('idle');
  const [EditorComp, setEditorComp] = useState<EditorType>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      try {
        // Dynamically import the Monaco React wrapper. If it's not installed,
        // this will fail and we handle it gracefully so the app doesn't crash.
        const mod = await import('@monaco-editor/react');
        if (!mounted) return;
        // The package exports a default component (Editor)
        setEditorComp(() => (mod && (mod as any).default) || null);
        setStatus('loaded');
      } catch (err: any) {
        console.error('Monaco dynamic import failed:', err);
        setErrorMsg(String(err?.message || err));
        setStatus('error');
      }
    }

    load();

    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Monaco dynamic import test</h2>
      {status === 'idle' || status === 'loading' ? (
        <div>
          <p>Loading Monaco editor...</p>
          <p className="text-sm text-muted-foreground">This is a safe, dynamic import that will not crash the app if the package is missing.</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="mt-4">
          <p className="text-red-600">Failed to load @monaco-editor/react.</p>
          {errorMsg ? <pre className="whitespace-pre-wrap text-sm">{errorMsg}</pre> : null}
          <p className="mt-2 text-sm">If you want to proceed, install the package: <code>npm i -D @monaco-editor/react</code> or enable the feature flag.</p>
        </div>
      ) : null}

      {status === 'loaded' && EditorComp ? (
        <div className="mt-4 border rounded">
          {/* Render the dynamically imported Monaco editor component. */}
          <EditorComp
            height="60vh"
            defaultLanguage="javascript"
            defaultValue={"// Monaco loaded successfully\nconsole.log('Hello from Monaco');"}
            options={{automaticLayout: true}}
          />
        </div>
      ) : null}
    </div>
  );
}
