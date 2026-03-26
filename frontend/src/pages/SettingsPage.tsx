import { ExternalLink } from 'lucide-react'
import { usePermissions } from '../contexts/PermissionsContext'
import { ListLoadingState } from '../components/AppState'

export default function SettingsPage() {
    const { hasCapability, isLoading } = usePermissions()

    if (isLoading) {
        return (
            <div className="screen active">
                <ListLoadingState title="Settings" description="Loading…" />
            </div>
        )
    }

    if (!hasCapability('system.settings')) {
        return (
            <div className="screen active">
                <div className="topbar">
                    <div className="topbar-title">Settings</div>
                </div>
                <div className="scroll-area">
                    <div className="inline-state-empty">
                        <p className="inline-state-empty-title">No access</p>
                        <p className="inline-state-empty-desc">
                            You need the <strong>Manage Settings</strong> capability to change app configuration.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="screen active">
            <div className="topbar">
                <div className="topbar-title">Settings</div>
            </div>
            <div className="scroll-area">
                <div className="mx-4 space-y-4">
                    <p className="text-sm leading-relaxed text-[var(--text-2)]">
                        Advanced configuration lives in Frappe Desk. Use the links below to open standard admin
                        screens in a new tab.
                    </p>
                    <a
                        href="/app/pricing-settings"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[15px] font-medium text-[var(--text-1)] shadow-[var(--shadow-sm)]"
                    >
                        Pricing Settings
                        <ExternalLink className="h-4 w-4 shrink-0 text-[var(--text-3)]" strokeWidth={1.75} />
                    </a>
                    <a
                        href="/app"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[15px] font-medium text-[var(--text-1)] shadow-[var(--shadow-sm)]"
                    >
                        Frappe Desk home
                        <ExternalLink className="h-4 w-4 shrink-0 text-[var(--text-3)]" strokeWidth={1.75} />
                    </a>
                </div>
            </div>
        </div>
    )
}
