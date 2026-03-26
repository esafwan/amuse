import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    createAmuseRole,
    fetchAmuseRoles,
    fetchCapabilitiesCatalogue,
    fetchMe,
    fetchUsers,
    inviteUser,
    setUserEnabled,
    updateAmuseRole,
    updateUserRole,
} from '../api/permissions'

export const amuseQueryKeys = {
    permissions: {
        root: ['amuse', 'permissions'] as const,
        me: () => [...amuseQueryKeys.permissions.root, 'me'] as const,
        users: () => [...amuseQueryKeys.permissions.root, 'users'] as const,
        roles: () => [...amuseQueryKeys.permissions.root, 'roles'] as const,
        catalogue: () => [...amuseQueryKeys.permissions.root, 'catalogue'] as const,
    },
}

/** Server-side current user + capabilities (shared with PermissionsProvider). */
export function usePermissionsMeQuery() {
    return useQuery({
        queryKey: amuseQueryKeys.permissions.me(),
        queryFn: () => fetchMe(),
        staleTime: 120_000,
    })
}

export function useUserList(enabled = true) {
    return useQuery({
        queryKey: amuseQueryKeys.permissions.users(),
        queryFn: () => fetchUsers(),
        enabled,
    })
}

export function useRoleList(enabled = true) {
    return useQuery({
        queryKey: amuseQueryKeys.permissions.roles(),
        queryFn: () => fetchAmuseRoles(),
        enabled,
    })
}

export function useCapabilitiesCatalogue(enabled = true) {
    return useQuery({
        queryKey: amuseQueryKeys.permissions.catalogue(),
        queryFn: () => fetchCapabilitiesCatalogue(),
        enabled,
    })
}

export function useInviteUser() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: inviteUser,
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: amuseQueryKeys.permissions.users() })
        },
    })
}

export function useUpdateUserRole() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: updateUserRole,
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: amuseQueryKeys.permissions.users() })
            void qc.invalidateQueries({ queryKey: amuseQueryKeys.permissions.me() })
        },
    })
}

export function useSetUserEnabled() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: setUserEnabled,
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: amuseQueryKeys.permissions.users() })
            void qc.invalidateQueries({ queryKey: amuseQueryKeys.permissions.me() })
        },
    })
}

export function useCreateAmuseRole() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: createAmuseRole,
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: amuseQueryKeys.permissions.roles() })
        },
    })
}

export function useUpdateAmuseRole() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: updateAmuseRole,
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: amuseQueryKeys.permissions.roles() })
            void qc.invalidateQueries({ queryKey: amuseQueryKeys.permissions.users() })
            void qc.invalidateQueries({ queryKey: amuseQueryKeys.permissions.me() })
        },
    })
}
