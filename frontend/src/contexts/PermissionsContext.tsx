import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    type ReactNode,
} from 'react'
import { usePermissionsMeQuery } from '../hooks/usePermissions'

export type PermissionsContextType = {
    user: string | null
    fullName: string | null
    amuseRole: string | null
    amuseRoleLabel: string | null
    capabilities: string[]
    isLoading: boolean
    error: Error | null
    hasCapability: (cap: string | null | undefined) => boolean
    refresh: () => Promise<unknown>
}

const PermissionsContext = createContext<PermissionsContextType | null>(null)

export function PermissionsProvider({ children }: { children: ReactNode }) {
    const { data, isLoading, isError, error, refetch } = usePermissionsMeQuery()

    const hasCapability = useCallback(
        (cap: string | null | undefined) => {
            if (cap == null || cap === '') return true
            return (data?.capabilities ?? []).includes(cap)
        },
        [data?.capabilities],
    )

    const value = useMemo<PermissionsContextType>(
        () => ({
            user: data?.user ?? null,
            fullName: data?.full_name ?? null,
            amuseRole: data?.amuse_role ?? null,
            amuseRoleLabel: data?.amuse_role_label ?? null,
            capabilities: data?.capabilities ?? [],
            isLoading,
            error: isError ? (error instanceof Error ? error : new Error(String(error))) : null,
            hasCapability,
            refresh: () => refetch(),
        }),
        [data, error, hasCapability, isError, isLoading, refetch],
    )

    return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions(): PermissionsContextType {
    const ctx = useContext(PermissionsContext)
    if (!ctx) {
        throw new Error('usePermissions must be used within PermissionsProvider')
    }
    return ctx
}
