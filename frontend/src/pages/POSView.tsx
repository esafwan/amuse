import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, Store } from 'lucide-react'
import { ListEmptyState, ListLoadingState } from '../components/AppState'
import { useOpeningEntry, usePOSProfile, usePOSItems } from '../hooks/usePOS'
import { useCreateInvoice } from '../hooks/useInvoice'

type PanelStep = null | 'cart' | 'payment'

export default function POSView() {
    const { data: opening, isLoading: isOpeningLoading } = useOpeningEntry()
    const activeSession = opening?.[0]
    const posProfileName = activeSession?.pos_profile

    const { data: profile } = usePOSProfile(posProfileName)
    const priceList = profile?.selling_price_list

    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [cart, setCart] = useState<Record<string, { qty: number; item: any }>>({})
    const [panelStep, setPanelStep] = useState<PanelStep>(null)

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
                alert('Payment successful! Invoice created.')
            },
            onError: (err: any) => {
                alert('Checkout failed: ' + err.message)
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
            <div className="screen active empty-state">
                <div className="empty-state-inner">
                    <div className="empty-state-icon-wrap" aria-hidden>
                        <Store />
                    </div>
                    <h2 className="empty-state-title">No active POS session</h2>
                    <p className="empty-state-desc">
                        Open a POS shift from Desk (or run the demo seed) so you can ring up sales here.
                    </p>
                    <p className="empty-state-hint">
                        Accounts → Point of Sale → POS Opening Entry, or ask an admin to start a shift for your user.
                    </p>
                </div>
            </div>
        )
    }

    const panelOpen = panelStep !== null

    return (
        <div className="screen active">
            <div className="topbar">
                <div className="topbar-title">New sale</div>
                <div className="topbar-btn">
                    <Search size={20} />
                </div>
            </div>

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

            {/* Cart + payment: same side panel as invoice / customer detail */}
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
                                <p className="pos-payment-hint">Modes are visual for now; tender posts as Cash.</p>
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
        </div>
    )
}
