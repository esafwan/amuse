import { Outlet, NavLink } from 'react-router-dom'
import { Home, Tag, Store, ReceiptText, Users } from 'lucide-react'
import clsx from 'clsx'

export default function AppShell() {
    
    // Updated Navigation Array corresponding to prototype bottom-nav choices: "Home", "POS", "Pricing Intel", "Customers", "Reports"
    const navItems = [
        { name: 'Home', path: '/dashboard', icon: Home },
        { name: 'POS', path: '/pos', icon: Store },
        { name: 'Pricing Intel', path: '/pricing', icon: Tag },
        { name: 'Customers', path: '/customers', icon: Users },
        { name: 'Exceptions', path: '/exceptions', icon: ReceiptText },
    ]

    return (
        <div className="app">
            {/* The individual subroutes render their own `.screen active` container and `.topbar` elements */}
            <Outlet />

            <div className="bottom-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => clsx("nav-item", isActive && "active")}
                    >
                        <item.icon />
                        <span>{item.name}</span>
                        {item.name === 'Exceptions' && <div className="nav-badge"></div>}
                    </NavLink>
                ))}
            </div>
        </div>
    )
}
