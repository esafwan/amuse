import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'

export default function RequireAuth() {
    useEffect(() => {
        // Redirect to standard Frappe login if there is no valid session payload
        const boot = window.frappe?.boot as any;
        if (boot?.developer_mode) {
           return; // Safe for dev
        }
        if (!boot || boot?.user?.name === 'Guest') {
            window.location.href = '/login?redirect-to=/amuse'
        }
    }, [])

    return <Outlet />
}
