import { useState } from 'react'
import { Search } from 'lucide-react'
import { useCustomerList } from '../hooks/useCustomer'

export default function Customers() {
    const { data: customers, isLoading, error } = useCustomerList()
    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

    if (isLoading) return <div className="p-8 text-center text-sm text-gray-500">Loading customers...</div>
    if (error) return <div className="p-8 text-center text-sm text-red-500">Failed to load: {error.message}</div>

    const filtered = customers?.filter(c => {
        if (filter !== 'all' && c.customer_group.toLowerCase() !== filter.toLowerCase()) return false
        if (search && !c.customer_name.toLowerCase().includes(search.toLowerCase())) return false
        return true
    }) || []

    return (
        <div className="screen active">
            <div className="topbar">
                <div className="topbar-title">Customers</div>
                <div className="topbar-btn">
                    <Search size={20} />
                </div>
            </div>

            <div className="search-box">
                <Search size={20} />
                <input 
                    placeholder="Search by name, phone, email..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="chip-row">
                {['all', 'commercial', 'individual', 'government'].map(cat => (
                    <div 
                        key={cat}
                        className={`chip ${filter === cat ? 'active' : ''}`}
                        onClick={() => setFilter(cat)}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </div>
                ))}
            </div>

            <div className="scroll-area">
                {filtered.map((c) => {
                    const initials = c.customer_name.substring(0, 2).toUpperCase()
                    // Mocking visits & revenue for prototype showcase
                    const visits = Math.floor(Math.random() * 20) + 1
                    const revenue = visits * Math.floor(Math.random() * 500 + 100)
                    
                    return (
                        <div key={c.name} className="list-item" onClick={() => setSelectedCustomer(c)}>
                            <div className="list-avatar">{initials}</div>
                            <div className="list-body">
                                <div className="list-name">{c.customer_name}</div>
                                <div className="list-sub">{c.email_id || 'No email provided'} &middot; {visits} visits</div>
                            </div>
                            <div className="list-right">
                                <div className="list-amount">&#8377;{revenue.toLocaleString('en-IN')}</div>
                                <div className="list-meta">{c.customer_group}</div>
                            </div>
                        </div>
                    )
                })}
                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 14 }}>
                        No customers found
                    </div>
                )}
            </div>

            {/* Mobile Detached Detail Overlay */}
            {selectedCustomer && (
                <div className="customer-detail open">
                    <div className="cd-header">
                        <div className="cd-back" onClick={() => setSelectedCustomer(null)}>
                            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>Customer Profile</div>
                    </div>
                    <div className="cd-profile">
                        <div className="cd-avatar-big">{selectedCustomer.customer_name.substring(0, 2).toUpperCase()}</div>
                        <div className="cd-name">{selectedCustomer.customer_name}</div>
                        <div className="cd-sub">{selectedCustomer.email_id || 'No Email'} &middot; {selectedCustomer.customer_group}</div>
                        
                        <div className="cd-actions">
                            <div className="cd-action">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20"/></svg>
                                <span>Invoice</span>
                            </div>
                            <div className="cd-action">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                                <span>Payment</span>
                            </div>
                            <div className="cd-action">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                                <span>Message</span>
                            </div>
                        </div>
                        
                        <div className="cd-stat-row">
                            <div className="cd-stat">
                                <div className="cd-stat-val">12</div>
                                <div className="cd-stat-label">Visits</div>
                            </div>
                            <div className="cd-stat">
                                <div className="cd-stat-val">&#8377;14,200</div>
                                <div className="cd-stat-label">Lifetime</div>
                            </div>
                            <div className="cd-stat">
                                <div className="cd-stat-val">Active</div>
                                <div className="cd-stat-label">Status</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
