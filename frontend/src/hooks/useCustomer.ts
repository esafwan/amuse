import { useQuery } from '@tanstack/react-query'
import { callMethod } from '../api/client'

export function useCustomerSearch(searchTerm: string) {
    return useQuery({
        queryKey: ['customers', 'search', searchTerm],
        queryFn: () => callMethod<any[]>('amuse.api.customers.search_customers', { txt: searchTerm }),
        enabled: searchTerm.length > 2,
    })
}

export function useCustomerList(filters?: any) {
    return useQuery({
        queryKey: ['customers', 'list', filters],
        queryFn: () => callMethod<any[]>('amuse.api.customers.list_customers', { filters }),
    })
}

export function useCustomer(name: string) {
    return useQuery({
        queryKey: ['customers', 'detail', name],
        queryFn: () => callMethod<any>('amuse.api.customers.get_customer', { name }),
        enabled: !!name,
    })
}
