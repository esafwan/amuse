import { NavLink } from 'react-router-dom'
import {
    CreditCard,
    LayoutGrid,
    Shield,
    Tag,
    Users,
    AlertTriangle,
    Settings,
} from 'lucide-react'
import clsx from 'clsx'
import { usePermissions } from '../contexts/PermissionsContext'
import { ListLoadingState } from '../components/AppState'

type MoreLink = {
    to: string
    label: string
    cap: string | null
    icon: typeof Tag
}

const LINKS: MoreLink[] = [
    { to: '/billing', label: 'Billing', cap: 'billing.view', icon: CreditCard },
    { to: '/pricing', label: 'Pricing', cap: 'pricing.view', icon: Tag },
    { to: '/exceptions', label: 'Exceptions', cap: 'system.exceptions', icon: AlertTriangle },
    { to: '/users', label: 'Users', cap: 'users.manage', icon: Users },
    { to: '/roles', label: 'Roles', cap: 'roles.manage', icon: Shield },
    { to: '/settings', label: 'Settings', cap: 'system.settings', icon: Settings },
]

export default function MorePage() {
    const { hasCapability, isLoading } = usePermissions()

    if (isLoading) {
        return (
            <div className="screen active">
                <ListLoadingState title="Loading" description="Fetching your access…" />
            </div>
        )
    }

    const visible = LINKS.filter((l) => hasCapability(l.cap))

    return (
        <div className="screen active">
            <div className="topbar">
                <div className="topbar-title">More</div>
                <div className="topbar-btn" aria-hidden>
                    <LayoutGrid size={20} />
                </div>
            </div>
            <div className="scroll-area">
                <p className="mx-4 mb-4 text-sm leading-relaxed text-[var(--text-2)]">
                    Shortcuts to areas you can access. Items you are not allowed to open are hidden.
                </p>
                {visible.length === 0 ? (
                    <div className="inline-state-empty mx-4">
                        <p className="inline-state-empty-title">No extra modules</p>
                        <p className="inline-state-empty-desc">
                            Your role does not include access to additional screens here. Use the bottom
                            navigation for Home, Sell, and other primary areas.
                        </p>
                    </div>
                ) : (
                    <nav className="mx-4 flex flex-col gap-2 pb-8" aria-label="More navigation">
                        {visible.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    clsx(
                                        'flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[15px] font-medium text-[var(--text-1)] shadow-[var(--shadow-sm)] transition-colors',
                                        isActive && 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent-text)]',
                                    )
                                }
                            >
                                <item.icon className="h-5 w-5 shrink-0 opacity-80" strokeWidth={1.75} />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                )}
            </div>
        </div>
    )
}
