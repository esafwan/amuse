import { Search, MonitorPlay, Users, CreditCard, BarChart2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
    const navigate = useNavigate()
    
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
                        <div className="metric-label">Revenue today</div>
                        <div className="metric-val">&#8377;1.24L</div>
                        <div className="metric-delta up">+12%</div>
                    </div>
                    <div className="metric">
                        <div className="metric-label">Visitors</div>
                        <div className="metric-val">342</div>
                        <div className="metric-delta up">+8%</div>
                    </div>
                    <div className="metric">
                        <div className="metric-label">ARPV</div>
                        <div className="metric-val">&#8377;362</div>
                        <div className="metric-delta down">-3%</div>
                    </div>
                    <div className="metric">
                        <div className="metric-label">Combo rate</div>
                        <div className="metric-val">41%</div>
                        <div className="metric-delta up">+5pp</div>
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
                    <div className="quick-btn">
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
                
                <div className="list-item">
                    <div className="list-avatar">ST</div>
                    <div className="list-body">
                        <div className="list-name">Skyline Tours (group)</div>
                        <div className="list-sub">INV-2026-0340 &middot; 22 Mar</div>
                    </div>
                    <div className="list-right">
                        <div className="list-amount">&#8377;12,400</div>
                        <div className="list-meta"><span className="pill pill-amber">Partial</span></div>
                    </div>
                </div>
                <div className="list-item">
                    <div className="list-avatar">AR</div>
                    <div className="list-body">
                        <div className="list-name">Al Rashid family</div>
                        <div className="list-sub">INV-2026-0341 &middot; 22 Mar</div>
                    </div>
                    <div className="list-right">
                        <div className="list-amount">&#8377;1,547</div>
                        <div className="list-meta"><span className="pill pill-green">Paid</span></div>
                    </div>
                </div>
                <div className="list-item">
                    <div className="list-avatar">WI</div>
                    <div className="list-body">
                        <div className="list-name">Walk-in #1087</div>
                        <div className="list-sub">INV-2026-0342 &middot; 22 Mar</div>
                    </div>
                    <div className="list-right">
                        <div className="list-amount">&#8377;799</div>
                        <div className="list-meta"><span className="pill pill-green">Paid</span></div>
                    </div>
                </div>

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
