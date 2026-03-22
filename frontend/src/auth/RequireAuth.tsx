import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AuthLoadingState } from '../components/AppState'

/**
 * Only render the app when a real Frappe session exists.
 * Guest (or missing session) → redirect to standard login so the SPA shell is not usable without auth.
 */
export default function RequireAuth() {
    const [allowed, setAllowed] = useState(false)

    useEffect(() => {
        let cancelled = false

        ;(async () => {
            try {
                const res = await fetch('/api/method/frappe.auth.get_logged_user', {
                    credentials: 'include',
                })
                const json = await res.json()
                const user = json?.message
                if (cancelled) return
                if (user && user !== 'Guest') {
                    setAllowed(true)
                    return
                }
            } catch {
                /* redirect below */
            }
            if (cancelled) return
            const target = window.location.pathname + window.location.search + window.location.hash
            window.location.href = '/login?redirect-to=' + encodeURIComponent(target)
        })()

        return () => {
            cancelled = true
        }
    }, [])

    if (!allowed) {
        return <AuthLoadingState />
    }

    return <Outlet />
}
