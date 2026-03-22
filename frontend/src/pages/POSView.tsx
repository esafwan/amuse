import { useState } from 'react'
import { Search } from 'lucide-react'

export default function POSView() {

    const posItems = [
        { id: 1, name: 'All ride access', price: 749, tier: 'combo', cat: 'combo' },
        { id: 2, name: 'Water + ride combo', price: 499, tier: 'combo', cat: 'combo' },
        { id:3, name:'Thrill seeker combo', price:299, tier:'combo', cat:'combo' },
        { id:7, name:'Water park access', price:350, tier:'premium', cat:'premium' },
        { id:8, name:'Aquarium tunnel', price:100, tier:'standard', cat:'standard' },
        { id:11, name:'Bumper cars', price:100, tier:'standard', cat:'standard' },
        { id:16, name:'Gyroscope ride', price:40, tier:'value', cat:'value' },
        { id:19, name:'Crazy bike', price:30, tier:'value', cat:'value' },
    ]

    const tierColors: Record<string, string> = { combo: 'var(--accent)', premium: 'var(--amber)', standard: 'var(--blue)', value: 'var(--text-3)' }
    const tierBg: Record<string, string> = { combo: 'var(--accent-bg)', premium: 'var(--amber-bg)', standard: 'var(--blue-bg)', value: 'var(--surface-2)' }

    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [cart, setCart] = useState<Record<number, number>>({})
    const [isCartOpen, setIsCartOpen] = useState(false)

    const filteredItems = posItems.filter(i => {
        if (filter !== 'all' && i.cat !== filter) return false
        if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    const handleAddToCart = (id: number) => {
        setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    }

    const changeQty = (id: number, delta: number) => {
        setCart(prev => {
            const next = { ...prev }
            next[id] = (next[id] || 0) + delta
            if (next[id] <= 0) delete next[id]
            return next
        })
    }

    let cartCount = 0
    let cartTotal = 0
    Object.entries(cart).forEach(([k, qty]) => {
        const item = posItems.find(i => i.id === Number(k))
        if (item) {
            cartCount += qty
            cartTotal += qty * item.price
        }
    })

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
                    placeholder="Search rides, combos..." 
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
                {filteredItems.map(item => {
                    const qty = cart[item.id] || 0
                    return (
                        <div 
                            key={item.id} 
                            className={`pos-item ${qty > 0 ? 'in-cart' : ''}`}
                            onClick={() => handleAddToCart(item.id)}
                        >
                            <span 
                                className="pos-tier" 
                                style={{ background: tierBg[item.tier], color: tierColors[item.tier] }}
                            >
                                {item.tier}
                            </span>
                            <div className="pos-name">{item.name}</div>
                            <div className="pos-price">&#8377;{item.price}</div>
                            {qty > 0 && <div className="pos-qty">{qty}</div>}
                        </div>
                    )
                })}
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
                            {Object.entries(cart).map(([k, qty]) => {
                                const item = posItems.find(i => i.id === Number(k))
                                if (!item) return null
                                return (
                                    <div key={item.id} className="cart-line">
                                        <div className="cart-line-body">
                                            <div className="cart-line-name">{item.name}</div>
                                            <div className="cart-line-price">&#8377;{item.price} each</div>
                                        </div>
                                        <div className="cart-qty-ctrl">
                                            <div className="cart-qty-btn" onClick={() => changeQty(item.id, -1)}>-</div>
                                            <div className="cart-qty-val">{qty}</div>
                                            <div className="cart-qty-btn" onClick={() => changeQty(item.id, 1)}>+</div>
                                        </div>
                                        <div className="cart-line-total">&#8377;{(item.price * qty).toLocaleString('en-IN')}</div>
                                    </div>
                                )
                            })}
                            {cartCount === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 14 }}>
                                    Cart is empty
                                </div>
                            )}
                        </div>
                        <div className="cart-footer">
                            <div className="cart-summary">
                                <span className="cart-summary-label">Total</span>
                                <span className="cart-summary-val">&#8377;{cartTotal.toLocaleString('en-IN')}</span>
                            </div>
                            <button className="checkout-btn" onClick={() => setIsCartOpen(false)}>
                                Checkout &middot; &#8377;{cartTotal.toLocaleString('en-IN')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
