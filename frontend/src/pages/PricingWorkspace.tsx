import { useState } from 'react'
import { usePriceChangeLogs } from '../hooks/usePricing'
import { Search } from 'lucide-react'
import PriceImpactDashboard from './PriceImpactDashboard'

export default function PricingWorkspace() {
    const { data: logs, isLoading } = usePriceChangeLogs()
    const [selectedLog, setSelectedLog] = useState<string | null>(null)

    return (
        <div className="screen active">
            <div className="topbar">
                <div className="topbar-title">Pricing Intel</div>
                <div className="topbar-btn">
                    <Search size={20} />
                </div>
            </div>

            <div className="scroll-area">
                <div className="metric-row">
                    <div className="metric">
                        <div className="metric-label">Active Changes</div>
                        <div className="metric-val">{logs?.length || 0}</div>
                        <div className="metric-delta up">Tracked</div>
                    </div>
                    <div className="metric">
                        <div className="metric-label">Failed Jobs</div>
                        <div className="metric-val" style={{ color: 'var(--red)' }}>
                            {logs?.filter((l: any) => l.snapshot_status === 'Failed').length || 0}
                        </div>
                        <div className="metric-delta down">Exceptions</div>
                    </div>
                    <div className="metric">
                        <div className="metric-label">Pending</div>
                        <div className="metric-val">
                            {logs?.filter((l: any) => l.snapshot_status !== 'Completed' && l.snapshot_status !== 'Failed').length || 0}
                        </div>
                        <div className="metric-delta">In Queue</div>
                    </div>
                    <div className="metric">
                        <div className="metric-label">Processed</div>
                        <div className="metric-val">
                            {logs?.filter((l: any) => l.snapshot_status === 'Completed').length || 0}
                        </div>
                        <div className="metric-delta up">Compiled</div>
                    </div>
                </div>

                {selectedLog && (
                    <div style={{ marginBottom: 16 }}>
                        <PriceImpactDashboard logName={selectedLog} />
                    </div>
                )}

                <div className="section-head" style={{ marginTop: 10 }}>
                    <span className="section-label">Price Change Ledger</span>
                    <span className="section-link" onClick={() => setSelectedLog(null)}>Refresh</span>
                </div>

                {isLoading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading ledgers...</div>
                ) : (
                    <>
                        {logs?.map((log: any) => {
                            const isSelected = selectedLog === log.name;
                            const isFailed = log.snapshot_status === 'Failed'
                            const isCompleted = log.snapshot_status === 'Completed'
                            const pillClass = isFailed ? 'pill-red' : isCompleted ? 'pill-green' : 'pill-amber'

                            return (
                                <div key={log.name} className="list-item" onClick={() => setSelectedLog(isSelected ? null : log.name)}>
                                    <div className="list-avatar" style={{ background: isFailed ? 'var(--red-bg)' : isCompleted ? 'var(--accent-bg)' : 'var(--amber-bg)', color: isFailed ? 'var(--red)' : isCompleted ? 'var(--accent-text)' : 'var(--amber)' }}>
                                        {log.item_name?.substring(0, 2).toUpperCase() || 'IT'}
                                    </div>
                                    <div className="list-body">
                                        <div className="list-name">{log.item_name || 'Unknown Item'}</div>
                                        <div className="list-sub">{log.name} &middot; {new Date(log.change_timestamp).toLocaleDateString()}</div>
                                    </div>
                                    <div className="list-right">
                                        <div className="list-amount">{log.change_type}</div>
                                        <div className="list-meta">
                                            <span className={`pill ${pillClass}`}>{log.snapshot_status}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {!logs?.length && (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                                No price change ledgers recorded yet.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
