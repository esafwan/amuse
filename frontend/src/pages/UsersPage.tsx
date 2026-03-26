import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { usePermissions } from '../contexts/PermissionsContext'
import { ListLoadingState } from '../components/AppState'
import {
    useInviteUser,
    useRoleList,
    useSetUserEnabled,
    useUpdateUserRole,
    useUserList,
} from '../hooks/usePermissions'

export default function UsersPage() {
    const { hasCapability, isLoading: permLoading } = usePermissions()
    const canManage = hasCapability('users.manage')
    const canInvite = hasCapability('users.invite')

    const { data: rows = [], isLoading, error, refetch } = useUserList(canManage && !permLoading)
    const { data: roles = [] } = useRoleList(canManage && !permLoading)

    const inviteMut = useInviteUser()
    const updateRoleMut = useUpdateUserRole()
    const setEnabledMut = useSetUserEnabled()

    const [inviteOpen, setInviteOpen] = useState(false)
    const [email, setEmail] = useState('')
    const [fullName, setFullName] = useState('')
    const [inviteRole, setInviteRole] = useState('')

    const roleNameById = useMemo(() => {
        const m = new Map<string, string>()
        for (const r of roles) m.set(r.name, r.role_name)
        return m
    }, [roles])

    if (permLoading) {
        return (
            <div className="screen active">
                <ListLoadingState title="Users" description="Checking permissions…" />
            </div>
        )
    }

    if (!canManage) {
        return (
            <div className="screen active">
                <div className="topbar">
                    <div className="topbar-title">Users</div>
                </div>
                <div className="scroll-area">
                    <div className="inline-state-empty">
                        <p className="inline-state-empty-title">No access</p>
                        <p className="inline-state-empty-desc">
                            You need the <strong>Manage Users</strong> capability to view this directory.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const submitInvite = async () => {
        if (!email.trim() || !fullName.trim() || !inviteRole) return
        try {
            await inviteMut.mutateAsync({
                email: email.trim(),
                full_name: fullName.trim(),
                amuse_role: inviteRole,
            })
            setInviteOpen(false)
            setEmail('')
            setFullName('')
            setInviteRole('')
        } catch {
            /* error surfaced below */
        }
    }

    return (
        <div className="screen active">
            <div className="topbar">
                <div className="topbar-title">Users</div>
                {canInvite && (
                    <div className="topbar-actions">
                        <button
                            type="button"
                            className="topbar-text-btn"
                            onClick={() => setInviteOpen(true)}
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                                Invite
                            </span>
                        </button>
                    </div>
                )}
            </div>

            <div className="scroll-area">
                {isLoading && (
                    <ListLoadingState title="Loading users" description="Fetching Amuse user assignments…" />
                )}
                {error && (
                    <p className="px-4 text-center text-sm text-red-500">
                        {error.message}
                        <button type="button" className="topbar-text-btn mx-auto mt-2 block" onClick={() => refetch()}>
                            Retry
                        </button>
                    </p>
                )}
                {!isLoading && !error && rows.length === 0 && (
                    <div className="inline-state-empty">
                        <p className="inline-state-empty-title">No Amuse users yet</p>
                        <p className="inline-state-empty-desc">
                            Invite colleagues and assign an Amuse role. They also receive the linked Frappe role for
                            Desk access.
                        </p>
                    </div>
                )}
                {!isLoading &&
                    !error &&
                    rows.map((row) => (
                        <div
                            key={row.name}
                            className="mb-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
                        >
                            <div className="flex w-full items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="list-name">{row.full_name || row.user}</div>
                                    <div className="list-sub">{row.user}</div>
                                </div>
                                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-2)]">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 accent-[var(--accent)]"
                                        checked={!!row.enabled}
                                        disabled={setEnabledMut.isPending}
                                        onChange={(e) =>
                                            setEnabledMut.mutate({ user: row.user, enabled: e.target.checked })
                                        }
                                    />
                                    Active
                                </label>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[var(--accent-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-text)]">
                                    {roleNameById.get(row.amuse_role) || row.amuse_role}
                                </span>
                                <select
                                    className="pos-select max-w-[200px] flex-1 text-sm"
                                    value={row.amuse_role}
                                    disabled={updateRoleMut.isPending}
                                    onChange={(e) => {
                                        const v = e.target.value
                                        if (v && v !== row.amuse_role) {
                                            updateRoleMut.mutate({ user: row.user, amuse_role: v })
                                        }
                                    }}
                                >
                                    {roles.map((r) => (
                                        <option key={r.name} value={r.name}>
                                            {r.role_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-[11px] text-[var(--text-3)]">
                                Invited {row.invited_on ? new Date(row.invited_on).toLocaleString() : '—'}
                                {row.invited_by ? ` · by ${row.invited_by}` : ''}
                            </div>
                        </div>
                    ))}
            </div>

            {inviteOpen && (
                <div className="pos-modal-backdrop" role="presentation" onClick={() => setInviteOpen(false)}>
                    <div
                        className="pos-modal"
                        role="dialog"
                        aria-labelledby="invite-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 id="invite-title" className="pos-modal-title">
                            Invite user
                        </h2>
                        <p className="pos-modal-desc">Creates a system user and assigns an Amuse role.</p>
                        <div className="space-y-3">
                            <div>
                                <label className="pos-field-label" htmlFor="inv-email">
                                    Email
                                </label>
                                <input
                                    id="inv-email"
                                    className="pos-select"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="pos-field-label" htmlFor="inv-name">
                                    Full name
                                </label>
                                <input
                                    id="inv-name"
                                    className="pos-select"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="pos-field-label" htmlFor="inv-role">
                                    Amuse role
                                </label>
                                <select
                                    id="inv-role"
                                    className="pos-select"
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                >
                                    <option value="">Select…</option>
                                    {roles.map((r) => (
                                        <option key={r.name} value={r.name}>
                                            {r.role_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {inviteMut.isError && (
                            <p className="pos-form-error">{(inviteMut.error as Error).message}</p>
                        )}
                        <div className="pos-modal-actions">
                            <button type="button" className="pos-modal-cancel" onClick={() => setInviteOpen(false)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
                                disabled={inviteMut.isPending}
                                onClick={() => void submitInvite()}
                            >
                                {inviteMut.isPending ? 'Sending…' : 'Invite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
