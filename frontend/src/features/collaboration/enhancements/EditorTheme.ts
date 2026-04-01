import * as monaco from 'monaco-editor'

export const setupEditorThemes = () => {
  try {
    // dark theme
    monaco.editor.defineTheme('devlink-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'f8f8f2', background: '282a36' },
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'type', foreground: '8be9fd' },
      ],
      colors: {
        'editor.background': '#282a36',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#44475a',
        'editorLineNumber.foreground': '#6272a4',
        'editor.selectionBackground': '#44475a',
        'editorCursor.foreground': '#f8f8f2',
      }
    })

    // light theme
    monaco.editor.defineTheme('devlink-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '', foreground: '383a42', background: 'fafafa' },
        { token: 'comment', foreground: 'a0a1a7', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'a626a4' },
        { token: 'string', foreground: '50a14f' },
        { token: 'number', foreground: '986801' },
      ],
      colors: {
        'editor.background': '#fafafa',
        'editor.foreground': '#383a42',
        'editor.lineHighlightBackground': '#f0f0f0',
        'editorLineNumber.foreground': '#a0a1a7',
      }
    })
  } catch (e) {
    // monaco might not be available at module load time; callers should handle errors
    console.debug('setupEditorThemes failed', e)
  }
}
