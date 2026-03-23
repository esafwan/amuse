import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callMethod } from '../api/client'

export function useInvoiceList(params?: any) {
    return useQuery({
        queryKey: ['amuse', 'invoices', 'list', params],
        queryFn: () => callMethod<any[]>('amuse.api.billing.list_invoices', params),
    })
}

export function useInvoiceDetails(name: string) {
    return useQuery({
        queryKey: ['amuse', 'invoices', 'detail', name],
        queryFn: () => callMethod<any>('amuse.api.billing.get_invoice', { name }),
        enabled: !!name,
    })
}

export function useCreateInvoice() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (doc: any) => callMethod('amuse.api.billing.create_invoice', { doc }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['amuse', 'invoices'] })
        },
    })
}

export function useSubmitInvoice() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (name: string) => callMethod('amuse.api.billing.submit_invoice', { name }),
        onSuccess: (_, name) => {
            queryClient.invalidateQueries({ queryKey: ['amuse', 'invoices'] })
            queryClient.invalidateQueries({ queryKey: ['amuse', 'invoices', 'detail', name] })
        },
    })
}
