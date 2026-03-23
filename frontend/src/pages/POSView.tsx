import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, Store } from 'lucide-react'
import { ListEmptyState, ListLoadingState } from '../components/AppState'
import {
    useClosingPreview,
    useCreateOpeningEntry,
    useOpeningEntry,
    usePOSItems,
    usePOSProfile,
    usePOSProfiles,
    useSubmitPosClosing,
} from '../hooks/usePOS'
import { useCreateInvoice } from '../hooks/useInvoice'

type PanelStep = null | 'cart' | 'payment'

function formatSessionStart(iso?: string) {
    if (!iso) return ''
    try {
        const d = new Date(iso)
        return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    } catch {
        return iso
    }
}

export default function POSView() {
    const { data: opening, isLoading: isOpeningLoading } = useOpeningEntry()
    const activeSession = opening?.[0]
    const posProfileName = activeSession?.pos_profile

    const { data: profile } = usePOSProfile(posProfileName)
    const priceList = profile?.selling_price_list

    const { data: profiles, isLoading: profilesLoading } = usePOSProfiles()
    const [selectedProfileName, setSelectedProfileName] = useState('')
    const { data: profileForOpen } = usePOSProfile(selectedProfileName || undefined)
    const [openingFloats, setOpeningFloats] = useState<Record<string, string>>({})
    const [openShiftError, setOpenShiftError] = useState<string | null>(null)

    const { mutate: createOpening, isPending: isOpeningSubmitting } = useCreateOpeningEntry()

    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [cart, setCart] = useState<Record<string, { qty: number; item: any }>>({})
    const [panelStep, setPanelStep] = useState<PanelStep>(null)
    const [posBanner, setPosBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    const [showCloseModal, setShowCloseModal] = useState(false)
    const { data: closePreview, isLoading: closePreviewLoading, error: closePreviewError } = useClosingPreview(
        activeSession?.name,
        showCloseModal,
    )
    const [closeAmounts, setCloseAmounts] = useState<Record<string, number>>({})
    const { mutate: submitClose, isPending: isClosingSubmitting } = useSubmitPosClosing()

    useEffect(() => {
        if (profiles?.length && !selectedProfileName) {
            setSelectedProfileName(profiles[0].name)
        }
    }, [profiles, selectedProfileName])

    useEffect(() => {
        const payments = profileForOpen?.payments
        if (!payments?.length) {
            setOpeningFloats({})
            return
        }
        setOpeningFloats((prev) => {
            const next: Record<string, string> = {}
            for (const p of payments) {
                const m = p.mode_of_payment as string
                next[m] = prev[m] ?? '0'
            }
            return next
        })
    }, [selectedProfileName, profileForOpen?.name])

    useEffect(() => {
        const rows = closePreview?.payment_reconciliation
        if (!rows?.length) return
        const m: Record<string, number> = {}
        for (const r of rows) {
            m[r.mode_of_payment] = Number(r.closing_amount ?? 0)
        }
        setCloseAmounts(m)
    }, [closePreview])

    const { data: itemsRes, isLoading: itemsLoading } = usePOSItems({
        price_list: priceList || '',
        pos_profile: posProfileName || '',
    })

    const { mutate: createInvoice, isPending: isCheckingOut } = useCreateInvoice()

    let cartCount = 0
    let cartTotal = 0
    Object.values(cart).forEach(({ qty, item }) => {
        cartCount += qty
        cartTotal += qty * (item.price_list_rate || 0)
    })

    useEffect(() => {
        if (cartCount === 0 && panelStep !== null) {
            setPanelStep(null)
        }
    }, [cartCount, panelStep])

    const fetchedItems = useMemo(() => {
        if (!itemsRes) return []
        const itemsList = Array.isArray(itemsRes) ? itemsRes : itemsRes.items || []
        return itemsList.filter((i: any) => {
            if (filter !== 'all') {
                const group = i.item_group?.toLowerCase() || ''
                if (!group.includes(filter.toLowerCase())) return false
            }
            if (search) {
                if (
                    !i.item_name?.toLowerCase().includes(search.toLowerCase()) &&
                    !i.item_code?.toLowerCase().includes(search.toLowerCase())
                ) {
                    return false
                }
            }
            return true
        })
    }, [itemsRes, filter, search])

    const handleAddToCart = (item: any) => {
        setCart((prev) => ({
            ...prev,
            [item.item_code]: { qty: (prev[item.item_code]?.qty || 0) + 1, item },
        }))
    }

    const changeQty = (itemCode: string, delta: number) => {
        setCart((prev) => {
            const next = { ...prev }
            if (!next[itemCode]) return next
            next[itemCode].qty += delta
            if (next[itemCode].qty <= 0) delete next[itemCode]
            return next
        })
    }

    const clearCart = () => {
        setCart({})
        setPanelStep(null)
    }

    const getTierColor = (idx: number) => {
        const colors = [
            { bg: 'var(--accent-bg)', text: 'var(--accent)' },
            { bg: 'var(--amber-bg)', text: 'var(--amber)' },
            { bg: 'var(--blue-bg)', text: 'var(--blue)' },
            { bg: 'var(--surface-2)', text: 'var(--text-3)' },
        ]
        return colors[idx % colors.length]
    }

    const handleConfirmPayment = () => {
        const doc = {
            customer: profile?.customer || 'Amuse Guest',
            company: activeSession?.company,
            is_pos: 1,
            is_created_using_pos: 1,
            pos_profile: posProfileName,
            set_posting_time: 1,
            items: Object.values(cart).map(({ qty, item }) => ({
                item_code: item.item_code,
                qty: qty,
                rate: item.price_list_rate,
            })),
        }
        createInvoice(doc, {
            onSuccess: () => {
                setCart({})
                setPanelStep(null)
                setPosBanner({ type: 'ok', text: 'Invoice saved as draft. Submit from Billing if needed.' })
            },
            onError: (err: any) => {
                setPosBanner({ type: 'err', text: err?.message || 'Checkout failed.' })
            },
        })
    }

    const handlePanelBack = () => {
        if (panelStep === 'payment') {
            setPanelStep('cart')
        } else {
            setPanelStep(null)
        }
    }

    const handleOpenShift = () => {
        setOpenShiftError(null)
        if (!selectedProfileName || !profileForOpen?.company) {
            setOpenShiftError('Select a POS profile.')
            return
        }
        const balance_details = (profileForOpen.payments || []).map((p: any) => ({
            mode_of_payment: p.mode_of_payment,
            opening_amount: parseFloat(openingFloats[p.mode_of_payment] || '0') || 0,
        }))
        if (!balance_details.length) {
            setOpenShiftError('This POS profile has no payment modes. Add them in Desk.')
            return
        }
        createOpening(
            {
                pos_profile: selectedProfileName,
                company: profileForOpen.company,
                balance_details,
            },
            {
                onSuccess: () => setPosBanner({ type: 'ok', text: 'Shift opened. You can start selling.' }),
                onError: (e: any) => setOpenShiftError(e?.message || 'Could not open shift.'),
            },
        )
    }

    const handleSubmitClose = () => {
        if (!activeSession?.name || !closePreview?.payment_reconciliation) return
        const payment_reconciliation = closePreview.payment_reconciliation.map((r: any) => ({
            mode_of_payment: r.mode_of_payment,
            closing_amount: closeAmounts[r.mode_of_payment] ?? Number(r.closing_amount ?? 0),
        }))
        submitClose(
            { pos_opening_entry: activeSession.name, payment_reconciliation },
            {
                onSuccess: (doc: any) => {
                    setShowCloseModal(false)
                    setCart({})
                    setPanelStep(null)
                    setPosBanner({
                        type: 'ok',
                        text: `Shift closed${doc?.name ? ` (${doc.name})` : ''}.`,
                    })
                },
                onError: (e: any) => {
                    setPosBanner({ type: 'err', text: e?.message || 'Could not close shift.' })
                },
            },
        )
    }

    if (isOpeningLoading) {
        return (
            <div className="screen active empty-state empty-state-loading" role="status" aria-live="polite">
                <div className="empty-state-inner">
                    <div className="empty-state-icon-wrap" aria-hidden>
                        <Loader2 />
                    </div>
                    <p className="empty-state-title">Checking POS session</p>
                    <p className="empty-state-desc">Verifying your shift with the server…</p>
                </div>
            </div>
        )
    }

    if (!activeSession) {
        return (
            <div className="screen active pos-open-shift">
                <div className="topbar">
                    <div className="topbar-title">Open shift</div>
                </div>
                <div className="scroll-area pos-open-shift-body">
                    <div className="empty-state-inner" style={{ maxWidth: 420, margin: '0 auto' }}>
                        <div className="empty-state-icon-wrap" aria-hidden>
                            <Store />
                        </div>
                        <h2 className="empty-state-title">Start your POS session</h2>
                        <p className="empty-state-desc">
                            Enter opening floats per payment mode, then open shift. You need a POS profile assigned to your
                            user (or System Manager access).
                        </p>
                        {profilesLoading ? (
                            <ListLoadingState title="Loading profiles" description="Fetching POS profiles…" />
                        ) : !profiles?.length ? (
                            <p className="pos-form-error">
                                No POS profile is available for your user. Ask an admin to add you under POS Profile →
                                Applicable for Users, or open a shift from Desk.
                            </p>
                        ) : (
                            <div className="pos-open-shift-form">
                                <label className="pos-field-label" htmlFor="pos-profile-select">
                                    POS profile
                                </label>
                                <select
                                    id="pos-profile-select"
                                    className="pos-select"
                                    value={selectedProfileName}
                                    onChange={(e) => setSelectedProfileName(e.target.value)}
                                >
                                    {profiles.map((p: any) => (
                                        <option key={p.name} value={p.name}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                {profileForOpen?.payments?.length ? (
                                    <>
                                        <p className="pos-field-hint">Opening amounts (float in drawer)</p>
                                        {profileForOpen.payments.map((p: any) => (
                                            <div key={p.mode_of_payment} className="pos-float-row">
                                                <label htmlFor={`float-${p.mode_of_payment}`}>{p.mode_of_payment}</label>
                                                <input
                                                    id={`float-${p.mode_of_payment}`}
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    className="pos-float-input"
                                                    value={openingFloats[p.mode_of_payment] ?? '0'}
                                                    onChange={(e) =>
                                                        setOpeningFloats((prev) => ({
                                                            ...prev,
                                                            [p.mode_of_payment]: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <p className="pos-field-hint">This profile has no payment rows yet.</p>
                                )}
                                {openShiftError && <p className="pos-form-error">{openShiftError}</p>}
                                <button
                                    type="button"
                                    className="pos-checkout-btn"
                                    disabled={isOpeningSubmitting || !profileForOpen?.payments?.length}
                                    onClick={handleOpenShift}
                                >
                                    {isOpeningSubmitting ? 'Opening…' : 'Open shift'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const panelOpen = panelStep !== null

    return (
        <div className="screen active">
            <div className="topbar">
                <div className="topbar-title">New sale</div>
                <div className="topbar-actions">
                    <span className="pos-session-pill" title="Active POS session">
                        {posProfileName}
                        <span className="pos-session-pill-meta">{formatSessionStart(activeSession.period_start_date)}</span>
                    </span>
                    <button type="button" className="topbar-text-btn" onClick={() => setShowCloseModal(true)}>
                        Close shift
                    </button>
                    <div className="topbar-btn">
                        <Search size={20} />
                    </div>
                </div>
            </div>

            {posBanner && (
                <div className={`pos-inline-banner ${posBanner.type === 'err' ? 'is-error' : ''}`}>
                    <span>{posBanner.text}</span>
                    <button type="button" className="pos-banner-dismiss" onClick={() => setPosBanner(null)} aria-label="Dismiss">
                        ×
                    </button>
                </div>
            )}

            <div className="search-box">
                <Search size={20} />
                <input placeholder="Search catalog..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="chip-row">
                {['all', 'combo', 'premium', 'standard', 'value'].map((cat) => (
                    <div
                        key={cat}
                        className={`chip ${filter === cat ? 'active' : ''}`}
                        onClick={() => setFilter(cat)}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </div>
                ))}
            </div>

            <div className="pos-grid">
                {itemsLoading ? (
                    <div className="col-span-4">
                        <ListLoadingState title="Loading catalog" description="Fetching items and prices…" />
                    </div>
                ) : fetchedItems.length === 0 ? (
                    <div className="col-span-4">
                        <ListEmptyState
                            title="No items match"
                            description="Try another search term or filter—or confirm your price list in POS profile."
                        />
                    </div>
                ) : (
                    fetchedItems.map((item: any, idx: number) => {
                        const qty = cart[item.item_code]?.qty || 0
                        const tier = getTierColor(idx)
                        return (
                            <div
                                key={item.item_code}
                                className={`pos-item ${qty > 0 ? 'in-cart' : ''}`}
                                onClick={() => handleAddToCart(item)}
                            >
                                <span className="pos-tier" style={{ background: tier.bg, color: tier.text }}>
                                    {item.item_group ? item.item_group.substring(0, 8) : 'Item'}
                                </span>
                                <div className="pos-name">{item.item_name}</div>
                                <div className="pos-price">&#8377;{item.price_list_rate || 0}</div>
                                {qty > 0 && <div className="pos-qty">{qty}</div>}
                            </div>
                        )
                    })
                )}
            </div>

            {cartCount > 0 && (
                <button type="button" className="cart-bar" onClick={() => setPanelStep('cart')}>
                    <span className="cart-bar-count">{cartCount}</span>
                    <span className="cart-bar-label">View cart</span>
                    <span className="cart-bar-total">&#8377;{cartTotal.toLocaleString('en-IN')}</span>
                </button>
            )}

            {panelOpen && (
                <div
                    className="customer-detail pos-panel open"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="pos-panel-title"
                >
                    <div className="cd-header">
                        <button
                            type="button"
                            className="cd-back"
                            onClick={handlePanelBack}
                            aria-label={panelStep === 'payment' ? 'Back to cart' : 'Close cart'}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden>
                                <path
                                    d="M15 18l-6-6 6-6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                        <div className="cd-title" id="pos-panel-title">
                            {panelStep === 'payment' ? 'Payment' : 'Cart'}
                        </div>
                        {panelStep === 'cart' ? (
                            <button type="button" className="cd-header-link" onClick={clearCart}>
                                Clear all
                            </button>
                        ) : (
                            <span className="cd-header-spacer" aria-hidden />
                        )}
                    </div>

                    <div className="cd-profile pos-panel-scroll">
                        {panelStep === 'cart' && (
                            <>
                                <div className="pos-cart-lines">
                                    {Object.entries(cart).map(([itemCode, { qty, item }]) => {
                                        const rate = item.price_list_rate || 0
                                        const lineTotal = rate * qty
                                        return (
                                            <div key={itemCode} className="pos-cart-line">
                                                <div className="pos-cart-line-top">
                                                    <div>
                                                        <div className="pos-cart-line-name">{item.item_name}</div>
                                                        <div className="pos-cart-line-unit">
                                                            &#8377;{rate.toLocaleString('en-IN')} each
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pos-cart-line-controls">
                                                    <div className="pos-cart-qty-row">
                                                        <button
                                                            type="button"
                                                            className="pos-cart-qty-btn"
                                                            aria-label="Decrease quantity"
                                                            onClick={() => changeQty(itemCode, -1)}
                                                        >
                                                            −
                                                        </button>
                                                        <span className="pos-cart-qty-val">{qty}</span>
                                                        <button
                                                            type="button"
                                                            className="pos-cart-qty-btn"
                                                            aria-label="Increase quantity"
                                                            onClick={() => changeQty(itemCode, 1)}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <div className="pos-cart-line-total">
                                                        &#8377;{lineTotal.toLocaleString('en-IN')}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="pos-cart-summary">
                                    <span className="pos-cart-summary-label">Total</span>
                                    <span className="pos-cart-summary-val">
                                        &#8377;{cartTotal.toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="pos-checkout-btn"
                                    onClick={() => setPanelStep('payment')}
                                >
                                    Checkout · &#8377;{cartTotal.toLocaleString('en-IN')}
                                </button>
                            </>
                        )}

                        {panelStep === 'payment' && (
                            <div className="pos-payment-body">
                                <p className="pos-payment-due-label">Amount due</p>
                                <p className="pos-payment-due-amount">&#8377;{cartTotal.toLocaleString('en-IN')}</p>
                                <div className="pos-payment-modes" role="group" aria-label="Payment mode">
                                    <span className="chip active">Cash</span>
                                    <span className="chip pos-chip-soon">Card</span>
                                    <span className="chip pos-chip-soon">UPI</span>
                                </div>
                                <p className="pos-payment-hint">Tender is recorded on the invoice; default mode comes from your POS profile.</p>
                                <button
                                    type="button"
                                    className="pos-checkout-btn"
                                    onClick={handleConfirmPayment}
                                    disabled={isCheckingOut}
                                >
                                    {isCheckingOut ? 'Processing…' : 'Confirm payment'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showCloseModal && (
                <div
                    className="pos-modal-backdrop"
                    role="presentation"
                    onClick={() => !isClosingSubmitting && setShowCloseModal(false)}
                >
                    <div
                        className="pos-modal"
                        role="dialog"
                        aria-labelledby="pos-close-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 id="pos-close-title" className="pos-modal-title">
                            Close shift
                        </h2>
                        <p className="pos-modal-desc">
                            Enter counted cash (and other modes) to match ERPNext&apos;s POS Closing Entry. Draft POS
                            invoices must be submitted or removed in Desk first.
                        </p>
                        {closePreviewLoading && <ListLoadingState title="Building preview" description="Loading reconciliation…" />}
                        {closePreviewError && (
                            <p className="pos-form-error">{(closePreviewError as Error)?.message || 'Could not load preview.'}</p>
                        )}
                        {closePreview?.payment_reconciliation?.length ? (
                            <div className="pos-close-rows">
                                {closePreview.payment_reconciliation.map((r: any) => (
                                    <div key={r.mode_of_payment} className="pos-float-row">
                                        <div>
                                            <div className="pos-close-mode">{r.mode_of_payment}</div>
                                            <div className="pos-close-meta">
                                                Opening {Number(r.opening_amount ?? 0).toFixed(2)} · Expected{' '}
                                                {Number(r.expected_amount ?? 0).toFixed(2)}
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            className="pos-float-input"
                                            min={0}
                                            step="0.01"
                                            value={closeAmounts[r.mode_of_payment] ?? ''}
                                            onChange={(e) =>
                                                setCloseAmounts((prev) => ({
                                                    ...prev,
                                                    [r.mode_of_payment]: parseFloat(e.target.value) || 0,
                                                }))
                                            }
                                            aria-label={`Closing amount ${r.mode_of_payment}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        {!closePreviewLoading && closePreview && !closePreview.payment_reconciliation?.length ? (
                            <p className="pos-field-hint">No payment rows returned. Check opening entry balances in Desk.</p>
                        ) : null}
                        <div className="pos-modal-actions">
                            <button
                                type="button"
                                className="pos-modal-cancel"
                                disabled={isClosingSubmitting}
                                onClick={() => setShowCloseModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="pos-checkout-btn"
                                disabled={isClosingSubmitting || closePreviewLoading || !closePreview?.payment_reconciliation?.length}
                                onClick={handleSubmitClose}
                            >
                                {isClosingSubmitting ? 'Closing…' : 'Submit close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
