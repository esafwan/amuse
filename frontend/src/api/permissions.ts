import { callMethod } from './client'

export type GetMeResponse = {
    user: string
    full_name: string | null
    amuse_user_role: string | null
    amuse_role: string | null
    amuse_role_label: string | null
    enabled: boolean
    capabilities: string[]
}

export type AmuseUserRow = {
    name: string
    user: string
    full_name: string | null
    amuse_role: string
    enabled: 0 | 1
    invited_by: string | null
    invited_on: string | null
    modified: string
}

export type AmuseRoleRow = {
    name: string
    role_name: string
    description: string | null
    is_system_role: 0 | 1
    frappe_role: string
    capabilities: string[]
}

export type CapabilityEntry = { key: string; label: string }

export function fetchMe(): Promise<GetMeResponse> {
    return callMethod<GetMeResponse>('amuse.api.permissions.get_me')
}

export function fetchUsers(): Promise<AmuseUserRow[]> {
    return callMethod<AmuseUserRow[]>('amuse.api.permissions.get_users')
}

export function fetchAmuseRoles(): Promise<AmuseRoleRow[]> {
    return callMethod<AmuseRoleRow[]>('amuse.api.permissions.get_amuse_roles')
}

export function fetchCapabilitiesCatalogue(): Promise<{ capabilities: CapabilityEntry[] }> {
    return callMethod<{ capabilities: CapabilityEntry[] }>('amuse.api.permissions.get_capabilities_catalogue')
}

export function inviteUser(payload: {
    email: string
    full_name: string
    amuse_role: string
}): Promise<{ ok: boolean; user: string; amuse_user_role: string }> {
    return callMethod('amuse.api.permissions.invite_user', payload as Record<string, unknown>)
}

export function updateUserRole(payload: { user: string; amuse_role: string }): Promise<{ ok: boolean; name: string }> {
    return callMethod('amuse.api.permissions.update_user_role', payload as Record<string, unknown>)
}

export function setUserEnabled(payload: { user: string; enabled: number | boolean }): Promise<{
    ok: boolean
    name: string
    enabled: boolean
}> {
    return callMethod('amuse.api.permissions.set_user_enabled', payload as Record<string, unknown>)
}

export function createAmuseRole(payload: {
    role_name: string
    description?: string
    capabilities: string[]
}): Promise<{ ok: boolean; name: string }> {
    return callMethod('amuse.api.permissions.create_amuse_role', payload as Record<string, unknown>)
}

export function updateAmuseRole(payload: {
    role_name: string
    capabilities?: string[]
    description?: string | null
}): Promise<{ ok: boolean; name: string }> {
    return callMethod('amuse.api.permissions.update_amuse_role', payload as Record<string, unknown>)
}
