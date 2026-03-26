import { Outlet } from 'react-router-dom'
import { PermissionsProvider } from '../contexts/PermissionsContext'

/** Loads `get_me` once for the authenticated shell and exposes capabilities to children. */
export default function PermissionsLayout() {
    return (
        <PermissionsProvider>
            <Outlet />
        </PermissionsProvider>
    )
}
