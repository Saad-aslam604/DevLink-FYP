import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../UX/ToastProvider'

const API_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

export default function GoogleSignIn() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { signInWithGoogle } = useAuth()
  const [loaded, setLoaded] = useState(false)
  const [renderOk, setRenderOk] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const win = window as any
    console.debug('[GoogleSignIn] mount, API_CLIENT_ID=', API_CLIENT_ID)
    if (win.google && win.google.accounts && loaded === false) {
      console.debug('[GoogleSignIn] google.accounts already present')
      setLoaded(true)
      tryInit()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      setLoaded(true)
      tryInit()
    }
    document.body.appendChild(script)

    function tryInit() {
      try {
        if (!API_CLIENT_ID) {
          console.warn('VITE_GOOGLE_CLIENT_ID not set')
          return
        }
        console.debug('[GoogleSignIn] initializing google.accounts.id with client id', API_CLIENT_ID)
        win.google.accounts.id.initialize({
          client_id: API_CLIENT_ID,
          callback: async (resp: any) => {
            const idToken = resp?.credential
            if (!idToken) return
            const result = await signInWithGoogle(idToken)
            try {
              if (result && result.error) {
                toast.show(typeof result.error === 'string' ? result.error : 'Google sign-in failed', 'error')
              } else {
                toast.show('Signed in with Google', 'success')
              }
            } catch (e) {
              console.debug('Toast show failed', e)
            }
          },
        })

        // render Google's button into our container (it will use Google's styles)
        if (containerRef.current) {
          try {
            win.google.accounts.id.renderButton(containerRef.current, {
              theme: 'outline',
              size: 'large',
            })
            setRenderOk(true)
            console.debug('[GoogleSignIn] renderButton succeeded')
          } catch (renderErr) {
            setRenderOk(false)
            console.error('[GoogleSignIn] renderButton failed', renderErr)
          }
        }
      } catch (err) {
        console.error('Failed to init Google Identity Services', err)
      }
    }

    return () => {
      // cleanup: remove script if mounted
      // leave google.accounts in case other parts use it
    }
  }, [signInWithGoogle])

  const debug = (import.meta.env.VITE_DEBUG_UI as string) === '1'

  return (
    <div className="mt-4">
      <div className="flex items-center my-4">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <div className="px-3 text-sm text-gray-500 dark:text-gray-300">Or continue with</div>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className={`w-full ${debug ? 'border-2 border-red-300' : ''} p-4 rounded-md bg-white dark:bg-gray-800`}>
        {/* Container for Google's rendered button. We force full-width and no-wrap so the text is visible */}
        <div ref={containerRef} className="w-full whitespace-nowrap" />

        {/* Fallback/custom styled button (visible if Google button doesn't render or for consistent styling) */}
        {(!renderOk) && (
          <button
            type="button"
            onClick={() => {
              const win = window as any
              if (win.google && win.google.accounts) {
                win.google.accounts.id.prompt()
              } else {
                // show info toast if prompt can't be invoked
                try { toast.show('Google sign-in not available', 'info') } catch (e) { console.debug(e) }
              }
            }}
            className="mt-3 w-full inline-flex items-center justify-center p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100 whitespace-nowrap"
          >
            <svg className="h-5 w-5 mr-3" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path fill="#4285F4" d="M533.5 278.4c0-18.2-1.6-36.1-4.7-53.4H272v101.2h147.1c-6.3 33.8-25 62.5-53.4 81.7v68.1h86.3c50.6-46.6 83.5-115.4 83.5-197.6z" />
              <path fill="#34A853" d="M272 544.3c72.8 0 134-24.1 178.6-65.3l-86.3-68.1c-24.1 16.2-54.9 25.8-92.3 25.8-70.9 0-131.1-47.8-152.5-112.1H31.5v70.7C76 487.3 167.7 544.3 272 544.3z" />
              <path fill="#FBBC05" d="M119.5 322.7c-10.9-32.2-10.9-66.7 0-98.9V153.1H31.5c-39.6 78.8-39.6 171.6 0 250.4l88-80.8z" />
              <path fill="#EA4335" d="M272 107.7c39.6 0 75.1 13.6 103.2 40.4l77.3-77.3C405.7 24.6 344.5 0 272 0 167.7 0 76 57 31.5 153.1l88 70.7C140.9 155.5 201.1 107.7 272 107.7z" />
            </svg>
            <span className="font-medium">Continue with Google</span>
          </button>
        )}
      </div>
    </div>
  )
}
