import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useCustomer, useCustomerGroups, useCustomerListPaged } from '../hooks/useCustomer'
import { InlineLoadingState, ListEmptyState, ListLoadingState } from '../components/AppState'

export default function Customers() {
    const [filter, setFilter] = useState('all')
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchInput), 320)
        return () => window.clearTimeout(t)
    }, [searchInput])

    const { data: groups = [] } = useCustomerGroups()
    const {
        data,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useCustomerListPaged(filter, debouncedSearch)

    const customers = useMemo(() => data?.pages.flat() ?? [], [data])

    const { data: customerData, isLoading: isCustomerLoading } = useCustomer(selectedCustomer?.name || '')

    if (isLoading) {
        return (
            <div className="screen active">
                <ListLoadingState title="Loading customers" description="Syncing your customer directory…" />
            </div>
        )
    }
    if (error) return <div className="p-8 text-center text-sm text-red-500">Failed to load: {error.message}</div>

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
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
            </div>

            <div className="chip-row">
                <div
                    key="all"
                    className={`chip ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setFilter('all')
                        }
                    }}
                >
                    All
                </div>
                {groups.map((g) => (
                    <div
                        key={g}
                        className={`chip ${filter === g ? 'active' : ''}`}
                        onClick={() => setFilter(g)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setFilter(g)
                            }
                        }}
                    >
                        {g}
                    </div>
                ))}
            </div>

            <div className="scroll-area">
                {customers.map((c) => {
                    const initials = c.customer_name.substring(0, 2).toUpperCase()
                    const visits = Math.floor(Math.random() * 20) + 1
                    const revenue = visits * Math.floor(Math.random() * 500 + 100)

                    return (
                        <div key={c.name} className="app-list-row" onClick={() => setSelectedCustomer(c)}>
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
                {hasNextPage && (
                    <div style={{ padding: '12px 0 24px', display: 'flex', justifyContent: 'center' }}>
                        <button
                            type="button"
                            className="chip"
                            style={{ cursor: isFetchingNextPage ? 'wait' : 'pointer', opacity: isFetchingNextPage ? 0.6 : 1 }}
                            disabled={isFetchingNextPage}
                            onClick={() => fetchNextPage()}
                        >
                            {isFetchingNextPage ? 'Loading…' : 'Load more'}
                        </button>
                    </div>
                )}
                {customers.length === 0 && (
                    <ListEmptyState
                        title={debouncedSearch || filter !== 'all' ? 'No customers match' : 'No customers yet'}
                        description={
                            debouncedSearch || filter !== 'all'
                                ? 'Try another search term or filter—or switch back to All.'
                                : 'Add customers in Desk or import a list to see them here.'
                        }
                    />
                )}
            </div>

            {/* Mobile Detached Detail Overlay */}
            {selectedCustomer && (
                <div className="customer-detail open">
                    <div className="cd-header">
                        <button type="button" className="cd-back" onClick={() => setSelectedCustomer(null)} aria-label="Back to list">
                            <svg viewBox="0 0 24 24" aria-hidden><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <div className="cd-title">Customer profile</div>
                    </div>
                    {isCustomerLoading ? (
                        <InlineLoadingState title="Loading profile…" />
                    ) : (
                        <div className="cd-profile">
                            <div className="cd-avatar-big">{selectedCustomer.customer_name.substring(0, 2).toUpperCase()}</div>
                            <div className="cd-name">{selectedCustomer.customer_name}</div>
                            <div className="cd-sub">{customerData?.email_id || selectedCustomer.email_id || 'No Email'} &middot; {customerData?.customer_group || selectedCustomer.customer_group}</div>
                            
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
                                    <div className="cd-stat-val">{customerData?.territory || 'Default'}</div>
                                    <div className="cd-stat-label">Territory</div>
                                </div>
                                <div className="cd-stat">
                                    <div className="cd-stat-val">{customerData?.default_currency || 'INR'}</div>
                                    <div className="cd-stat-label">Currency</div>
                                </div>
                                <div className="cd-stat">
                                    <div className="cd-stat-val">{customerData?.disabled ? 'Inactive' : 'Active'}</div>
                                    <div className="cd-stat-label">Status</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
