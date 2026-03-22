import { RefreshCw, Search } from 'lucide-react'
import { usePriceChangeLogs, useTriggerSnapshotRebuild } from '../hooks/usePricing'

export default function ExceptionCenter() {
    const { data: logs, isLoading } = usePriceChangeLogs()
    const { mutate: rebuild, isPending } = useTriggerSnapshotRebuild()

    const failedLogs = logs?.filter((l: any) => l.snapshot_status === 'Failed') || []

    return (
        <div className="screen active">
            <div className="topbar">
                <div className="topbar-title">Exceptions</div>
                <div className="topbar-btn">
                    <Search size={20} />
                </div>
            </div>

            <div className="scroll-area">
                <div className="section-head">
                    <span className="section-label">Open Exceptions</span>
                    <span className="section-link">{failedLogs.length} open</span>
                </div>

                {isLoading ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Scanning queues...</div>
                ) : failedLogs.length === 0 ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--accent)', fontWeight: 500 }}>
                        No exceptions found. All pipelines nominal.
                    </div>
                ) : (
                    failedLogs.map((log: any) => (
                        <div key={log.name} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }}></div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{log.name}: {log.item_name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                    {new Date(log.change_timestamp).toLocaleDateString()} &middot; Sync Failure
                                </div>
                            </div>
                            <button 
                                onClick={() => rebuild(log.name)} 
                                disabled={isPending} 
                                style={{ 
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: 13, 
                                    fontWeight: 500, 
                                    color: isPending ? 'var(--text-3)' : 'var(--accent)', 
                                    cursor: isPending ? 'not-allowed' : 'pointer', 
                                    padding: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}
                            >
                                {isPending ? <RefreshCw className="animate-spin" size={14} /> : 'Retry'}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
