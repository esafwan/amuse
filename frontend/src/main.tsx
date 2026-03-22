import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const themeKey = 'amuse-theme'
try {
    const t = localStorage.getItem(themeKey)
    if (t === 'light' || t === 'dark') {
        document.documentElement.setAttribute('data-theme', t)
    }
} catch {
    /* ignore */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="app-root">
      <App />
    </div>
  </StrictMode>,
)
