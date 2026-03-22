import { Search, MonitorPlay, Users, CreditCard, BarChart2, AlertCircle, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useInvoiceList } from '../hooks/useInvoice'
import { ListLoadingState } from '../components/AppState'

export default function Dashboard() {
    const navigate = useNavigate()
    const { data: invoices, isLoading } = useInvoiceList()
    
    // Compute KPI proxies from the invoice list
    const revenue = invoices?.reduce((acc: number, inv: any) => acc + (inv.base_grand_total || inv.grand_total || 0), 0) || 0
    const visitors = (invoices?.length || 0) * 3 // Proxy: 3 visitors per invoice
    const arpv = visitors > 0 ? (revenue / visitors) : 0
    const recentInvoices = invoices?.slice(0, 3) || []

    return (
        <div className="screen active">
            <div className="topbar">
                <div className="topbar-title">Amuse</div>
                <div className="topbar-btn">
                    <Search size={20} />
                </div>
            </div>
            
            <div className="scroll-area">
                <div className="metric-row">
                    <div className="metric">
                        <div className="metric-label">Total Revenue</div>
                        <div className="metric-val">&#8377;{(revenue / 1000).toFixed(1)}K</div>
                        <div className="metric-delta up">+12%</div>
                    </div>
                    <div className="metric">
                        <div className="metric-label">Visitors Est.</div>
                        <div className="metric-val">{visitors}</div>
                        <div className="metric-delta up">+8%</div>
                    </div>
                    <div className="metric">
                        <div className="metric-label">ARPV</div>
                        <div className="metric-val">&#8377;{arpv.toFixed(0)}</div>
                        <div className="metric-delta down">-3%</div>
                    </div>
                    <div className="metric">
                        <div className="metric-label">Invoices</div>
                        <div className="metric-val">{invoices?.length || 0}</div>
                        <div className="metric-delta up">+5%</div>
                    </div>
                </div>

                <div className="section-head">
                    <span className="section-label">Quick actions</span>
                </div>
                <div className="quick-grid">
                    <div className="quick-btn" onClick={() => navigate('/pos')}>
                        <MonitorPlay />
                        <span>New sale</span>
                    </div>
                    <div className="quick-btn" onClick={() => navigate('/billing')}>
                        <Search />
                        <span>Search</span>
                    </div>
                    <div className="quick-btn" onClick={() => navigate('/customers')}>
                        <Users />
                        <span>Customers</span>
                    </div>
                    <div className="quick-btn" onClick={() => navigate('/pos')}>
                        <CreditCard />
                        <span>Collect</span>
                    </div>
                    <div className="quick-btn" onClick={() => navigate('/exceptions')}>
                        <AlertCircle />
                        <span>Exceptions</span>
                    </div>
                    <div className="quick-btn" onClick={() => navigate('/pricing')}>
                        <BarChart2 />
                        <span>Pricing Intel</span>
                    </div>
                </div>

                <div className="section-head">
                    <span className="section-label">Recent invoices</span>
                    <span className="section-link" onClick={() => navigate('/billing')}>View all</span>
                </div>
                
                {isLoading ? (
                    <ListLoadingState title="Loading activity" description="Fetching recent invoices…" />
                ) : recentInvoices.length > 0 ? (
                    recentInvoices.map((inv: any) => {
                        const isDraft = inv.status === 'Draft'
                        const isPaid = inv.status === 'Paid'
                        const pillClass = isDraft ? 'pill-amber' : isPaid ? 'pill-green' : 'pill-blue'

                        return (
                            <div key={inv.name} className="app-list-row" onClick={() => navigate('/billing')}>
                                <div className="list-avatar">
                                    <FileText size={20} />
                                </div>
                                <div className="list-body">
                                    <div className="list-name">{inv.customer_name || 'Walk-in Customer'}</div>
                                    <div className="list-sub">{inv.name} &middot; {inv.posting_date}</div>
                                </div>
                                <div className="list-right">
                                    <div className="list-amount">{inv.currency} {inv.base_grand_total || inv.grand_total}</div>
                                    <div className="list-meta"><span className={`pill ${pillClass}`}>{inv.status}</span></div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>No recent invoices.</div>
                )}

                <div className="section-head" style={{ marginTop: 10 }}>
                    <span className="section-label">Exceptions</span>
                    <span className="section-link" onClick={() => navigate('/exceptions')}>3 open</span>
                </div>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>Snapshot failed: Bumper cars regime</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>2h ago &middot; Job failure</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', cursor: 'pointer', padding: 8 }}>Retry</div>
                </div>
            </div>
        </div>
    )
}
