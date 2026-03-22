import { useState } from 'react'
import { useInvoiceList, useSubmitInvoice, useInvoiceDetails } from '../hooks/useInvoice'
import { FileText, Plus, Search } from 'lucide-react'
import { InlineEmptyState, InlineLoadingState, ListEmptyState, ListLoadingState } from '../components/AppState'
import { openPrintviewInNewTab } from '../lib/printview'

export default function Billing() {
    const { data: invoices, isLoading } = useInvoiceList()
    const { mutate: submitInvoice, isPending } = useSubmitInvoice()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const selectedInvoice = invoices?.find((i: any) => i.name === selectedId)
    // Fetch deeper details (items, taxes) when an invoice is selected
    const { data: invoiceDetail, isLoading: isLoadingDetail } = useInvoiceDetails(selectedId || '')

    const filteredInvoices =
        invoices?.filter((inv: any) => {
            if (!search) return true
            const q = search.toLowerCase()
            return (
                inv.name?.toLowerCase().includes(q) ||
                inv.customer_name?.toLowerCase().includes(q) ||
                String(inv.status || '')
                    .toLowerCase()
                    .includes(q)
            )
        }) || []

    const totalInvoices = invoices?.length ?? 0

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
                    <ListLoadingState
                        title="Loading invoices"
                        description="Fetching your sales invoices from the server…"
                    />
                ) : (
                    filteredInvoices.map((inv: any) => {
                        const isDraft = inv.status === 'Draft'
                        const isPaid = inv.status === 'Paid'
                        const pillClass = isDraft ? 'pill-amber' : isPaid ? 'pill-green' : 'pill-blue'

                        return (
                            <div
                                key={inv.name}
                                className="app-list-row"
                                role="button"
                                tabIndex={0}
                                aria-label={`Invoice ${inv.name}, ${inv.customer_name || 'Customer'}, ${inv.status}`}
                                onClick={() => setSelectedId(inv.name)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        setSelectedId(inv.name)
                                    }
                                }}
                            >
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
                    <ListEmptyState
                        title={totalInvoices === 0 && !search ? 'No invoices yet' : 'No invoices match'}
                        description={
                            totalInvoices === 0 && !search
                                ? 'Create a sale from POS or Desk to see invoices here.'
                                : 'Try another invoice number, customer name, or status.'
                        }
                    />
                )}
            </div>

            {/* Mobile Detached Detail Overlay (Repurposing Customer Detail logic) */}
            {selectedInvoice && (
                <div className="customer-detail open">
                    <div className="cd-header">
                        <button type="button" className="cd-back" onClick={() => setSelectedId(null)} aria-label="Back to list">
                            <svg viewBox="0 0 24 24" aria-hidden><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <div className="cd-title">Invoice detail</div>
                    </div>
                    <div className="cd-profile">
                        <div className="cd-avatar-big" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
                            <FileText size={28} />
                        </div>
                        <div className="cd-name">{selectedInvoice.name}</div>
                        <div className="cd-sub">{selectedInvoice.customer_name || 'Walk-in Customer'} &middot; {selectedInvoice.status}</div>
                        
                        <div className="cd-stat-row">
                            <div className="cd-stat">
                                <div className="cd-stat-val">{selectedInvoice.currency} {selectedInvoice.base_grand_total}</div>
                                <div className="cd-stat-label">Total Amount</div>
                            </div>
                        </div>

                        <div className="cd-actions">
                            {selectedInvoice.docstatus === 0 && (
                                <button
                                    type="button"
                                    className="cd-action"
                                    disabled={isPending}
                                    onClick={() => submitInvoice(selectedInvoice.name)}
                                >
                                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    <span>{isPending ? 'Submitting…' : 'Submit'}</span>
                                </button>
                            )}
                            {selectedInvoice.docstatus === 1 && selectedInvoice.outstanding_amount > 0 && (
                                <button
                                    type="button"
                                    className="cd-action"
                                    style={{ background: 'var(--text-1)', color: 'var(--surface)' }}
                                >
                                    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                                    <span>Pay Now</span>
                                </button>
                            )}
                            <button
                                type="button"
                                className="cd-action"
                                onClick={() => openPrintviewInNewTab('Sales Invoice', selectedInvoice.name)}
                            >
                                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                <span>Print</span>
                            </button>
                        </div>

                        <div className="section-head" style={{ marginTop: 24 }}>
                            <span className="section-label">Line Items</span>
                        </div>
                        
                        {isLoadingDetail ? (
                            <InlineLoadingState title="Loading line items…" />
                        ) : invoiceDetail?.items?.length > 0 ? (
                            invoiceDetail.items.map((item: any, idx: number) => (
                                <div key={item.name || idx} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.item_name || item.item_code}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Qty: {item.qty} &times; {item.rate}</div>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{item.amount}</div>
                                </div>
                            ))
                        ) : (
                            <InlineEmptyState title="No line items" description="This invoice has no rows in the detail view." />
                        )}
                        
                        {/* Display taxes if any */}
                        {invoiceDetail?.taxes?.length > 0 && (
                            <>
                                <div className="section-head" style={{ marginTop: 24 }}>
                                    <span className="section-label">Taxes</span>
                                </div>
                                {invoiceDetail.taxes.map((tax: any, idx: number) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: 13 }}>
                                        <span style={{ color: 'var(--text-2)' }}>{tax.description}</span>
                                        <span style={{ fontWeight: 500 }}>{tax.tax_amount}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
