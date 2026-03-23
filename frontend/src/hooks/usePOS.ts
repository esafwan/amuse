import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callMethod } from '../api/client'

export function useOpeningEntry() {
    return useQuery({
        queryKey: ['amuse', 'pos', 'opening'],
        queryFn: () => callMethod<any[]>('amuse.api.pos.check_opening'),
    })
}

export function useCreateOpeningEntry() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (params: { pos_profile: string; company: string; balance_details: any[] }) => 
            callMethod('amuse.api.pos.create_opening', params),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['amuse', 'pos', 'opening'] }),
    })
}

export function usePOSProfiles() {
    return useQuery({
        queryKey: ['amuse', 'pos', 'profiles'],
        queryFn: () => callMethod<any[]>('amuse.api.pos.list_pos_profiles'),
    })
}

export function usePOSProfile(name?: string) {
    return useQuery({
        queryKey: ['amuse', 'pos', 'profile', name],
        queryFn: () => callMethod<any>('amuse.api.pos.get_profile', { pos_profile: name }),
        enabled: !!name,
    })
}

export function usePOSItems(params: { price_list: string; pos_profile: string; search_term?: string }) {
    return useQuery({
        queryKey: ['amuse', 'pos', 'items', params],
        queryFn: () => callMethod<any>('amuse.api.pos.get_items', { ...params, start: 0, page_length: 40 }),
        enabled: !!params.price_list && !!params.pos_profile,
    })
}

export function usePastOrders() {
    return useQuery({
        queryKey: ['amuse', 'pos', 'past_orders'],
        queryFn: () => callMethod<any[]>('amuse.api.pos.get_past_orders'),
    })
}

export function useClosingPreview(posOpeningEntry: string | undefined, enabled: boolean) {
    return useQuery({
        queryKey: ['amuse', 'pos', 'closing_preview', posOpeningEntry],
        queryFn: () =>
            callMethod<any>('amuse.api.pos.get_closing_preview', {
                pos_opening_entry: posOpeningEntry,
            }),
        enabled: Boolean(enabled && posOpeningEntry),
    })
}

export function useSubmitPosClosing() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (p: {
            pos_opening_entry: string
            payment_reconciliation?: { mode_of_payment: string; closing_amount: number }[]
        }) => callMethod<any>('amuse.api.pos.submit_pos_closing', p),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['amuse', 'pos'] })
            qc.invalidateQueries({ queryKey: ['amuse', 'invoices'] })
        },
    })
}
