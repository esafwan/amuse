import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'amuse-theme'

function readStored(): 'light' | 'dark' | null {
    try {
        const v = localStorage.getItem(STORAGE_KEY)
        if (v === 'light' || v === 'dark') return v
    } catch {
        /* ignore */
    }
    return null
}

function systemPref(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle() {
    const [mode, setMode] = useState<'light' | 'dark'>(() => readStored() ?? systemPref())

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', mode)
        try {
            localStorage.setItem(STORAGE_KEY, mode)
        } catch {
            /* ignore */
        }
    }, [mode])

    return (
        <button
            type="button"
            className="theme-toggle"
            aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title="Theme"
            onClick={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
        >
            {mode === 'dark' ? <Sun size={20} strokeWidth={1.8} /> : <Moon size={20} strokeWidth={1.8} />}
        </button>
    )
}
