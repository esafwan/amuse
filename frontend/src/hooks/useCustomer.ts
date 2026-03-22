import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { callMethod } from '../api/client'

export function useCustomerSearch(searchTerm: string) {
    return useQuery({
        queryKey: ['customers', 'search', searchTerm],
        queryFn: () => callMethod<any[]>('amuse.api.customers.search_customers', { txt: searchTerm }),
        enabled: searchTerm.length > 2,
    })
}

export function useCustomerGroups() {
    return useQuery({
        queryKey: ['customers', 'groups'],
        queryFn: () => callMethod<string[]>('amuse.api.customers.list_customer_groups'),
    })
}

/** Paginated list: filter = Customer Group name or "all"; search = server-side name/email/phone match */
export function useCustomerListPaged(filter: string, search: string) {
    return useInfiniteQuery({
        queryKey: ['customers', 'list', filter, search],
        queryFn: ({ pageParam }) => {
            const filters: Record<string, string> = {}
            if (filter && filter !== 'all') {
                filters.customer_group = filter
            }
            return callMethod<any[]>('amuse.api.customers.list_customers', {
                filters,
                search: search.trim() || undefined,
                limit_start: pageParam,
                limit_page_length: 30,
            })
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage || lastPage.length < 30) return undefined
            return allPages.length * 30
        },
    })
}

export function useCustomer(name: string) {
    return useQuery({
        queryKey: ['customers', 'detail', name],
        queryFn: () => callMethod<any>('amuse.api.customers.get_customer', { name }),
        enabled: !!name,
    })
}
