import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Shield } from 'lucide-react'
import type { AmuseRoleRow } from '../api/permissions'
import { usePermissions } from '../contexts/PermissionsContext'
import { ListLoadingState } from '../components/AppState'
import { useCapabilitiesCatalogue, useCreateAmuseRole, useRoleList, useUpdateAmuseRole } from '../hooks/usePermissions'

export default function RolesPage() {
    const { hasCapability, isLoading: permLoading } = usePermissions()
    const canRoles = hasCapability('roles.manage')

    const { data: roles = [], isLoading, error, refetch } = useRoleList(canRoles && !permLoading)
    const { data: cat } = useCapabilitiesCatalogue(canRoles && !permLoading)
    const catalogue = cat?.capabilities ?? []

    const createMut = useCreateAmuseRole()
    const updateMut = useUpdateAmuseRole()

    const [expanded, setExpanded] = useState<string | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [newCaps, setNewCaps] = useState<Set<string>>(new Set())

    const [editCaps, setEditCaps] = useState<Set<string>>(new Set())
    const [editTarget, setEditTarget] = useState<AmuseRoleRow | null>(null)

    const capLabel = useMemo(() => {
        const m = new Map<string, string>()
        for (const c of catalogue) m.set(c.key, c.label)
        return m
    }, [catalogue])

    const openEdit = (role: AmuseRoleRow) => {
        setEditTarget(role)
        setEditCaps(new Set(role.capabilities ?? []))
    }

    const submitCreate = async () => {
        const n = newName.trim()
        if (!n) return
        try {
            await createMut.mutateAsync({
                role_name: n,
                description: newDesc.trim() || undefined,
                capabilities: Array.from(newCaps),
            })
            setCreateOpen(false)
            setNewName('')
            setNewDesc('')
            setNewCaps(new Set())
        } catch {
            /* surfaced */
        }
    }

    const submitEdit = async () => {
        if (!editTarget) return
        try {
            await updateMut.mutateAsync({
                role_name: editTarget.name,
                capabilities: Array.from(editCaps),
            })
            setEditTarget(null)
            setExpanded(null)
        } catch {
            /* surfaced */
        }
    }

    if (permLoading) {
        return (
            <div className="screen active">
                <ListLoadingState title="Roles" description="Checking permissions…" />
            </div>
        )
    }

    if (!canRoles) {
        return (
            <div className="screen active">
                <div className="topbar">
                    <div className="topbar-title">Roles</div>
                </div>
                <div className="scroll-area">
                    <div className="inline-state-empty">
                        <p className="inline-state-empty-title">No access</p>
                        <p className="inline-state-empty-desc">
                            You need the <strong>Manage Roles</strong> capability to view or edit Amuse roles.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const toggleCap = (set: Set<string>, key: string, on: boolean) => {
        const next = new Set(set)
        if (on) next.add(key)
        else next.delete(key)
        return next
    }

    return (
        <div className="screen active">
            <div className="topbar">
                <div className="topbar-title">Roles</div>
                <div className="topbar-actions">
                    <button type="button" className="topbar-text-btn" onClick={() => setCreateOpen(true)}>
                        <span className="inline-flex items-center gap-1.5">
                            <Plus className="h-4 w-4" strokeWidth={1.75} />
                            New role
                        </span>
                    </button>
                </div>
            </div>

            <div className="scroll-area">
                {isLoading && (
                    <ListLoadingState title="Loading roles" description="Fetching Amuse roles and capabilities…" />
                )}
                {error && (
                    <p className="px-4 text-center text-sm text-red-500">
                        {error.message}
                        <button type="button" className="topbar-text-btn mx-auto mt-2 block" onClick={() => refetch()}>
                            Retry
                        </button>
                    </p>
                )}
                {!isLoading &&
                    !error &&
                    roles.map((role) => {
                        const isOpen = expanded === role.name
                        return (
                            <div
                                key={role.name}
                                className="mx-0 mb-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
                            >
                                <button
                                    type="button"
                                    className="flex w-full items-start justify-between gap-3 text-left"
                                    onClick={() => setExpanded(isOpen ? null : role.name)}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[15px] font-semibold text-[var(--text-1)]">
                                                {role.role_name}
                                            </span>
                                            {role.is_system_role ? (
                                                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">
                                                    System
                                                </span>
                                            ) : null}
                                        </div>
                                        {role.description ? (
                                            <p className="mt-1 text-sm text-[var(--text-2)]">{role.description}</p>
                                        ) : null}
                                        <p className="mt-2 text-[11px] text-[var(--text-3)]">
                                            {(role.capabilities ?? []).length} capabilities
                                        </p>
                                    </div>
                                    {isOpen ? (
                                        <ChevronUp className="h-5 w-5 shrink-0 text-[var(--text-3)]" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 shrink-0 text-[var(--text-3)]" />
                                    )}
                                </button>
                                {isOpen && (
                                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {(role.capabilities ?? []).map((c) => (
                                                <span
                                                    key={c}
                                                    className="rounded-full bg-[var(--accent-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-text)]"
                                                >
                                                    {capLabel.get(c) || c}
                                                </span>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            className="topbar-text-btn mt-3 px-0"
                                            onClick={() => openEdit(role)}
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                <Shield className="h-4 w-4" strokeWidth={1.75} />
                                                Edit capabilities
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
            </div>

            {createOpen && (
                <div className="pos-modal-backdrop" role="presentation" onClick={() => setCreateOpen(false)}>
                    <div
                        className="pos-modal max-h-[90vh]"
                        role="dialog"
                        aria-labelledby="cr-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 id="cr-title" className="pos-modal-title">
                            New Amuse role
                        </h2>
                        <p className="pos-modal-desc">Creates a custom Frappe role and links it to a new Amuse role.</p>
                        <div className="space-y-3">
                            <div>
                                <label className="pos-field-label" htmlFor="cr-name">
                                    Role name
                                </label>
                                <input
                                    id="cr-name"
                                    className="pos-select"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="pos-field-label" htmlFor="cr-desc">
                                    Description
                                </label>
                                <input
                                    id="cr-desc"
                                    className="pos-select"
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                />
                            </div>
                        </div>
                        <p className="pos-field-label mt-4">Capabilities</p>
                        <div className="mt-2 max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                            {catalogue.map((c) => (
                                <label
                                    key={c.key}
                                    className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-sm)] border border-transparent px-1 py-1 text-sm hover:bg-[var(--surface-2)]"
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                                        checked={newCaps.has(c.key)}
                                        onChange={(e) => setNewCaps(toggleCap(newCaps, c.key, e.target.checked))}
                                    />
                                    <span>
                                        <span className="font-medium text-[var(--text-1)]">{c.label}</span>
                                        <span className="ml-1.5 text-xs text-[var(--text-3)]">{c.key}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        {createMut.isError && (
                            <p className="pos-form-error">{(createMut.error as Error).message}</p>
                        )}
                        <div className="pos-modal-actions">
                            <button type="button" className="pos-modal-cancel" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
                                disabled={createMut.isPending}
                                onClick={() => void submitCreate()}
                            >
                                {createMut.isPending ? 'Creating…' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editTarget && (
                <div className="pos-modal-backdrop" role="presentation" onClick={() => setEditTarget(null)}>
                    <div
                        className="pos-modal max-h-[90vh]"
                        role="dialog"
                        aria-labelledby="ed-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 id="ed-title" className="pos-modal-title">
                            Edit {editTarget.role_name}
                        </h2>
                        <p className="pos-modal-desc">Toggle capabilities for this role. Users with this role sync on save.</p>
                        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                            {catalogue.map((c) => (
                                <label
                                    key={c.key}
                                    className="flex cursor-pointer items-start gap-2 rounded-[var(--radius-sm)] border border-transparent px-1 py-1 text-sm hover:bg-[var(--surface-2)]"
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                                        checked={editCaps.has(c.key)}
                                        onChange={(e) => setEditCaps(toggleCap(editCaps, c.key, e.target.checked))}
                                    />
                                    <span>
                                        <span className="font-medium text-[var(--text-1)]">{c.label}</span>
                                        <span className="ml-1.5 text-xs text-[var(--text-3)]">{c.key}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        {updateMut.isError && (
                            <p className="pos-form-error">{(updateMut.error as Error).message}</p>
                        )}
                        <div className="pos-modal-actions">
                            <button type="button" className="pos-modal-cancel" onClick={() => setEditTarget(null)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
                                disabled={updateMut.isPending}
                                onClick={() => void submitEdit()}
                            >
                                {updateMut.isPending ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
