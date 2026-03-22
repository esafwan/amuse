import { useState } from 'react'
import { useInvoiceList, useSubmitInvoice } from '../hooks/useInvoice'
import { FileText, Plus, Search } from 'lucide-react'

export default function Billing() {
    const { data: invoices, isLoading } = useInvoiceList()
    const { mutate: submitInvoice, isPending } = useSubmitInvoice()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const selectedInvoice = invoices?.find((i: any) => i.name === selectedId)

    const filteredInvoices = invoices?.filter((inv: any) => 
        !search || 
        inv.name.toLowerCase().includes(search.toLowerCase()) || 
        inv.customer_name?.toLowerCase().includes(search.toLowerCase())
    ) || []

    return (
        <div className="screen active">
            <div className="topbar">
                <div className="topbar-title">Billing</div>
                <div className="topbar-btn">
                    <Plus size={20} />
                </div>
            </div>

            <div className="search-box">
                <Search size={20} />
                <input 
                    placeholder="Search invoices..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="scroll-area">
                <div className="section-head">
                    <span className="section-label">Sales Invoices</span>
                    <span className="section-link">{filteredInvoices.length} entries</span>
                </div>

                {isLoading ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Loading invoices...</div>
                ) : (
                    filteredInvoices.map((inv: any) => {
                        const isDraft = inv.status === 'Draft'
                        const isPaid = inv.status === 'Paid'
                        const pillClass = isDraft ? 'pill-amber' : isPaid ? 'pill-green' : 'pill-blue'

                        return (
                            <div key={inv.name} className="list-item" onClick={() => setSelectedId(inv.name)}>
                                <div className="list-avatar">
                                    <FileText size={20} />
                                </div>
                                <div className="list-body">
                                    <div className="list-name">{inv.customer_name || 'Walk-in Customer'}</div>
                                    <div className="list-sub">{inv.name}</div>
                                </div>
                                <div className="list-right">
                                    <div className="list-amount">{inv.currency} {inv.base_grand_total}</div>
                                    <div className="list-meta">
                                        <span className={`pill ${pillClass}`}>{inv.status}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}

                {filteredInvoices.length === 0 && !isLoading && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 14 }}>
                        No invoices match your search.
                    </div>
                )}
            </div>

            {/* Mobile Detached Detail Overlay (Repurposing Customer Detail logic) */}
            {selectedInvoice && (
                <div className="customer-detail open">
                    <div className="cd-header">
                        <div className="cd-back" onClick={() => setSelectedId(null)}>
                            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>Invoice Detail</div>
                    </div>
                    <div className="cd-profile">
                        <div className="cd-avatar-big" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
                            <FileText size={28} />
                        </div>
                        <div className="cd-name">{selectedInvoice.name}</div>
                        <div className="cd-sub">{selectedInvoice.customer_name} &middot; {selectedInvoice.status}</div>
                        
                        <div className="cd-actions">
                            {selectedInvoice.docstatus === 0 && (
                                <div className="cd-action" onClick={() => submitInvoice(selectedInvoice.name)} style={{ opacity: isPending ? 0.5 : 1 }}>
                                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    <span>{isPending ? 'Submitting' : 'Submit'}</span>
                                </div>
                            )}
                            <div className="cd-action">
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                <span>Print</span>
                            </div>
                        </div>
                        
                        <div className="cd-stat-row">
                            <div className="cd-stat">
                                <div className="cd-stat-val">{selectedInvoice.currency} {selectedInvoice.base_grand_total}</div>
                                <div className="cd-stat-label">Total Amount</div>
                            </div>
                        </div>

                        <div className="section-head" style={{ marginTop: 24 }}>
                            <span className="section-label">Line Items</span>
                        </div>
                        
                        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>TKT-REGULAR</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Qty: 4.0</div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>25.00</div>
                        </div>

                        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>PK-BNDL-VIP</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Qty: 2.0</div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>150.00</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
