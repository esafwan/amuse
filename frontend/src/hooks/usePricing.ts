import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPriceChangeLogs, getPriceChangeLogDetail, getPriceRegimeSummary, triggerSnapshotRebuild } from '../api/pricing'

export function usePriceChangeLogs(item?: string, limitStart = 0, limitPageLength = 20) {
    return useQuery({
        queryKey: ['pricing', 'logs', item, limitStart, limitPageLength],
        queryFn: () => getPriceChangeLogs(item, limitStart, limitPageLength),
    })
}

export function usePriceChangeLogDetail(name: string) {
    return useQuery({
        queryKey: ['pricing', 'log', name],
        queryFn: () => getPriceChangeLogDetail(name),
        enabled: !!name,
    })
}

export function usePriceRegimeSummary(name: string) {
    return useQuery({
        queryKey: ['pricing', 'summary', name],
        queryFn: () => getPriceRegimeSummary(name),
        enabled: !!name,
    })
}

export function useTriggerSnapshotRebuild() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (logName: string) => triggerSnapshotRebuild(logName),
        onSuccess: (_, logName) => {
            qc.invalidateQueries({ queryKey: ['pricing', 'log', logName] })
            qc.invalidateQueries({ queryKey: ['pricing', 'logs'] })
        }
    })
}
