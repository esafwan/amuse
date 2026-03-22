import { useState, useMemo } from 'react'
import { Loader2, Search, Store } from 'lucide-react'
import { ListEmptyState, ListLoadingState } from '../components/AppState'
import { useOpeningEntry, usePOSProfile, usePOSItems } from '../hooks/usePOS'
import { useCreateInvoice } from '../hooks/useInvoice'

export default function POSView() {
    const { data: opening, isLoading: isOpeningLoading } = useOpeningEntry()
    const activeSession = opening?.[0]
    const posProfileName = activeSession?.pos_profile
    
    const { data: profile } = usePOSProfile(posProfileName)
    const priceList = profile?.selling_price_list

    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [cart, setCart] = useState<Record<string, { qty: number, item: any }>>({})
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

    // Only fetch items if we have a valid session and price list.
    const { data: itemsRes, isLoading: itemsLoading } = usePOSItems({ 
        price_list: priceList || '', 
        pos_profile: posProfileName || '' 
    })
    
    const { mutate: createInvoice, isPending: isCheckingOut } = useCreateInvoice()

    const fetchedItems = useMemo(() => {
        if (!itemsRes) return []
        const itemsList = Array.isArray(itemsRes) ? itemsRes : (itemsRes.items || [])
        return itemsList.filter((i: any) => {
            if (filter !== 'all') {
                const group = i.item_group?.toLowerCase() || ''
                if (!group.includes(filter.toLowerCase())) return false
            }
            if (search) {
                if (!i.item_name?.toLowerCase().includes(search.toLowerCase()) && 
                    !i.item_code?.toLowerCase().includes(search.toLowerCase())) return false
            }
            return true
        })
    }, [itemsRes, filter, search])

    const handleAddToCart = (item: any) => {
        setCart(prev => ({
            ...prev,
            [item.item_code]: { qty: (prev[item.item_code]?.qty || 0) + 1, item }
        }))
    }

    const changeQty = (itemCode: string, delta: number) => {
        setCart(prev => {
            const next = { ...prev }
            if (!next[itemCode]) return next
            next[itemCode].qty += delta
            if (next[itemCode].qty <= 0) delete next[itemCode]
            return next
        })
    }

    const getTierColor = (idx: number) => {
        const colors = [
            { bg: 'var(--accent-bg)', text: 'var(--accent)' },
            { bg: 'var(--amber-bg)', text: 'var(--amber)' },
            { bg: 'var(--blue-bg)', text: 'var(--blue)' },
            { bg: 'var(--surface-2)', text: 'var(--text-3)' }
        ]
        return colors[idx % colors.length]
    }

    let cartCount = 0
    let cartTotal = 0
    Object.values(cart).forEach(({ qty, item }) => {
        cartCount += qty
        cartTotal += qty * (item.price_list_rate || 0)
    })

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
            }))
        }
        createInvoice(doc, {
            onSuccess: () => {
                setCart({})
                setIsCheckoutOpen(false)
                setIsCartOpen(false)
                alert('Payment successful! Invoice created.')
            },
            onError: (err: any) => {
                alert('Checkout failed: ' + err.message)
            }
        })
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
                <input 
                    placeholder="Search catalog..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="chip-row">
                {['all', 'combo', 'premium', 'standard', 'value'].map(cat => (
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
                                <span 
                                    className="pos-tier" 
                                    style={{ background: tier.bg, color: tier.text }}
                                >
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
                <div className="cart-bar" onClick={() => setIsCartOpen(true)}>
                    <div className="cart-bar-count">{cartCount}</div>
                    <div className="cart-bar-label">View cart</div>
                    <div className="cart-bar-total">&#8377;{cartTotal.toLocaleString('en-IN')}</div>
                </div>
            )}

            {/* Cart Drawer Overlay */}
            {isCartOpen && (
                <>
                    <div className="cart-backdrop open" onClick={() => setIsCartOpen(false)}></div>
                    <div className="cart-drawer open">
                        <div className="cart-handle"></div>
                        <div className="cart-header">
                            <div className="cart-title">Cart</div>
                            <div className="cart-clear" onClick={() => { setCart({}); setIsCartOpen(false) }}>Clear all</div>
                        </div>
                        <div className="cart-items">
                            {Object.entries(cart).map(([itemCode, { qty, item }]) => {
                                return (
                                    <div key={itemCode} className="cart-line">
                                        <div className="cart-line-body">
                                            <div className="cart-line-name">{item.item_name}</div>
                                            <div className="cart-line-price">&#8377;{item.price_list_rate || 0} each</div>
                                        </div>
                                        <div className="cart-qty-ctrl">
                                            <div className="cart-qty-btn" onClick={() => changeQty(itemCode, -1)}>-</div>
                                            <div className="cart-qty-val">{qty}</div>
                                            <div className="cart-qty-btn" onClick={() => changeQty(itemCode, 1)}>+</div>
                                        </div>
                                        <div className="cart-line-total">&#8377;{((item.price_list_rate || 0) * qty).toLocaleString('en-IN')}</div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="cart-footer">
                            <div className="cart-summary">
                                <span className="cart-summary-label">Total</span>
                                <span className="cart-summary-val">&#8377;{cartTotal.toLocaleString('en-IN')}</span>
                            </div>
                            <button className="checkout-btn" onClick={() => setIsCheckoutOpen(true)}>
                                Checkout &middot; &#8377;{cartTotal.toLocaleString('en-IN')}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Payment Checkout Overlay */}
            {isCheckoutOpen && (
                <>
                    <div className="cart-backdrop open" onClick={() => !isCheckingOut && setIsCheckoutOpen(false)} style={{ zIndex: 120 }}></div>
                    <div className="cart-drawer open" style={{ zIndex: 121, height: 'auto', maxHeight: '80vh', bottom: 0, top: 'auto' }}>
                        <div className="cart-header">
                            <div className="cart-title">Payment</div>
                            <div className="cart-clear" onClick={() => !isCheckingOut && setIsCheckoutOpen(false)}>Cancel</div>
                        </div>
                        <div className="cart-items" style={{ padding: '24px 16px' }}>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 4 }}>Amount Due</div>
                                <div style={{ fontSize: 32, fontWeight: 600 }}>&#8377;{cartTotal.toLocaleString('en-IN')}</div>
                            </div>
                            
                            <div className="chip-row" style={{ justifyContent: 'center', marginBottom: 24 }}>
                                <div className="chip active">Cash</div>
                                <div className="chip">Card</div>
                                <div className="chip">UPI</div>
                            </div>

                            <button 
                                className="checkout-btn" 
                                style={{ width: '100%', opacity: isCheckingOut ? 0.7 : 1 }}
                                onClick={handleConfirmPayment}
                                disabled={isCheckingOut}
                            >
                                {isCheckingOut ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
