---
name: react-query-patterns
description: >
  Server state management patterns using TanStack Query (React Query). 
  Includes query keys, caching strategies, mutations, and invalidation 
  patterns. Consult this skill for data fetching, caching, or sync 
  between server and client state.
category: patterns
---

# React Query Patterns

## Overview

The frontend uses TanStack Query (formerly React Query) for:

- **Server State Management**: Caching, deduping, background refetching
- **Data Synchronization**: Keeping UI in sync with server
- **Mutation Handling**: Create/update/delete with optimistic updates
- **Loading States**: Standardized pending/error states

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/hooks/usePermissions.ts` | Permission-related queries |
| `frontend/src/hooks/usePOS.ts` | POS session and items queries |
| `frontend/src/hooks/useInvoice.ts` | Invoice queries and mutations |
| `frontend/src/hooks/useCustomer.ts` | Customer queries |
| `frontend/src/hooks/usePricing.ts` | Pricing data queries |
| `frontend/src/App.tsx` | QueryClientProvider setup |

## How It Works

### Query Key Structure

```typescript
export const amuseQueryKeys = {
    permissions: {
        root: ['amuse', 'permissions'] as const,
        me: () => [...amuseQueryKeys.permissions.root, 'me'] as const,
        users: () => [...amuseQueryKeys.permissions.root, 'users'] as const,
        roles: () => [...amuseQueryKeys.permissions.root, 'roles'] as const,
    },
    pos: {
        opening: ['pos', 'opening'] as const,
        items: (priceList: string, posProfile: string) => 
            ['pos', 'items', priceList, posProfile] as const,
        profile: (name: string) => ['pos', 'profile', name] as const,
    },
}
```

### Query Hook Pattern

```typescript
export function usePermissionsMeQuery() {
    return useQuery({
        queryKey: amuseQueryKeys.permissions.me(),
        queryFn: () => fetchMe(),
        staleTime: 120_000, // 2 minutes
    })
}
```

### Mutation with Invalidation

```typescript
export function useInviteUser() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: inviteUser,
        onSuccess: () => {
            void qc.invalidateQueries({ 
                queryKey: amuseQueryKeys.permissions.users() 
            })
        },
    })
}
```

### Component Usage

```typescript
const { data, isLoading, error } = useUserList()
const { mutate, isPending } = useInviteUser()

// Loading state
if (isLoading) return <Loading />

// Error state
if (error) return <Error message={error.message} />

// Mutate
mutate({ email, full_name, amuse_role })
```

## Extension Points

### Adding New Query Hooks

1. Define query key in appropriate keys object:
```typescript
invoices: {
    list: () => ['invoices', 'list'] as const,
    detail: (name: string) => ['invoices', 'detail', name] as const,
}
```

2. Create hook:
```typescript
export function useInvoice(name: string) {
    return useQuery({
        queryKey: amuseQueryKeys.invoices.detail(name),
        queryFn: () => fetchInvoice(name),
        enabled: !!name,
    })
}
```

### Optimistic Updates

```typescript
return useMutation({
    mutationFn: updateItem,
    onMutate: async (newItem) => {
        await qc.cancelQueries({ queryKey: ['items'] })
        const previous = qc.getQueryData(['items'])
        qc.setQueryData(['items'], (old) => 
            old.map(i => i.id === newItem.id ? newItem : i)
        )
        return { previous }
    },
    onError: (err, newItem, context) => {
        qc.setQueryData(['items'], context.previous)
    },
})
```

## Dependencies

- **@tanstack/react-query**: Core library
- **frontend/api/***: API client functions

## Gotchas

1. **Stale Time vs Cache Time**: 
   - `staleTime`: How long before refetch (used)
   - `gcTime` (was `cacheTime`): How long to keep in cache after unmount

2. **Query Key Arrays**: Always use arrays, not strings. Include all dependencies that affect the data.

3. **void Keyword**: Invalidations use `void` to indicate we don't await them:
   ```typescript
   void qc.invalidateQueries({...})
   ```

4. **Enabled Flag**: Use `enabled: !!param` to prevent fetching with undefined params.

5. **Error Types**: Errors are typed as `Error | null` but may need narrowing for specific error shapes.

6. **Background Refetch**: By default, queries refetch on window focus. This can be disabled globally:
   ```typescript
   new QueryClient({
       defaultOptions: {
           queries: { refetchOnWindowFocus: false }
       }
   })
   ```
