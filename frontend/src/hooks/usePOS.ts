import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { callMethod } from '../api/client'

export function useOpeningEntry() {
    return useQuery({
        queryKey: ['pos', 'opening'],
        queryFn: () => callMethod<any[]>('amuse.api.pos.check_opening'),
    })
}

export function useCreateOpeningEntry() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (params: { pos_profile: string; company: string; balance_details: any[] }) => 
            callMethod('amuse.api.pos.create_opening', params),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['pos', 'opening'] }),
    })
}

export function usePOSItems(params: { price_list: string; pos_profile: string; search_term?: string }) {
    return useQuery({
        queryKey: ['pos', 'items', params],
        queryFn: () => callMethod<any>('amuse.api.pos.get_items', { ...params, start: 0, page_length: 40 }),
        enabled: !!params.price_list && !!params.pos_profile,
    })
}

export function usePastOrders() {
    return useQuery({
        queryKey: ['pos', 'past_orders'],
        queryFn: () => callMethod<any[]>('amuse.api.pos.get_past_orders'),
    })
}
