import { callMethod } from './client'

export interface StandardResponse<T> {
    ok: boolean
    data: T
    meta: any
}

export async function getPriceChangeLogs(item?: string, limitStart = 0, limitPageLength = 20) {
    const res = await callMethod<StandardResponse<any>>('amuse.api.price_change.get_price_change_log_list', { item, limit_start: limitStart, limit_page_length: limitPageLength })
    return res.data
}

export async function getPriceChangeLogDetail(name: string) {
    const res = await callMethod<StandardResponse<any>>('amuse.api.price_change.get_price_change_log', { name })
    return res.data
}

export async function triggerSnapshotRebuild(logName: string) {
    const res = await callMethod<StandardResponse<any>>('amuse.api.price_change.trigger_snapshot_rebuild', { log_name: logName })
    return res.data
}

export async function getPriceRegimeSummary(logName: string) {
    const res = await callMethod<StandardResponse<any>>('amuse.api.analytics.get_price_regime_summary', { log_name: logName })
    return res.data
}
