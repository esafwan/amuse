import { Outlet, NavLink } from 'react-router-dom'
import { Home, LayoutGrid, ShoppingCart, Tag, Users, ReceiptText } from 'lucide-react'
import clsx from 'clsx'
import ThemeToggle from './ThemeToggle'
import { usePermissions } from '../contexts/PermissionsContext'

type NavItem = {
    name: string
    path: string
    icon: typeof Home
    capability: string | null
}

const NAV_ITEMS: NavItem[] = [
    { name: 'Home', path: '/dashboard', icon: Home, capability: null },
    { name: 'Sell', path: '/pos', icon: ShoppingCart, capability: 'pos.use' },
    { name: 'Pricing', path: '/pricing', icon: Tag, capability: 'pricing.view' },
    { name: 'Customers', path: '/customers', icon: Users, capability: 'customers.view' },
    { name: 'Exceptions', path: '/exceptions', icon: ReceiptText, capability: 'system.exceptions' },
    { name: 'More', path: '/more', icon: LayoutGrid, capability: null },
]

export default function AppShell() {
    const { hasCapability } = usePermissions()

    const navItems = NAV_ITEMS.filter(
        (item) => item.capability === null || item.capability === '' || hasCapability(item.capability),
    )

    return (
        <div className="app">
            <Outlet />

            <nav className="bottom-nav" aria-label="Primary">
                <div className="bottom-nav-links">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => clsx('nav-item', isActive && 'active')}
                        >
                            <item.icon />
                            <span>{item.name}</span>
                            {item.name === 'Exceptions' && <div className="nav-badge" aria-hidden />}
                        </NavLink>
                    ))}
                </div>
                <ThemeToggle />
            </nav>
        </div>
    )
}
