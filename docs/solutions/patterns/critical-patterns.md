# Critical Patterns - Required Reading

These patterns represent lessons learned from solved problems that must be followed in all future development. Every subagent should review this file before generating code.

---

## 1. Unified Side Panel (Panel/Drawer Pattern) (ALWAYS REQUIRED)

### WRONG (Multiple booleans and separate drawer classes)
```tsx
const [isCartOpen, setIsCartOpen] = useState(false)
const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
// ...
<div className="cart-drawer">...</div>
<div className="checkout-drawer">...</div>
```

### CORRECT (Single step state and unified panel class)
```tsx
const [panelStep, setPanelStep] = useState<null | 'cart' | 'payment'>(null)
// ...
<div className="customer-detail open">...</div>
```

**Why:** Using a single enum-style state (`panelStep`) prevents invalid states (like both cart and payment being open/closed simultaneously) and leverages our `.customer-detail` responsive CSS which already handles the Desktop-to-Mobile transforms (Side Panel vs. Full Screen).

**Placement/Context:** Any view requiring a detailed slide-out overlay (POS cart, Customer profiles, Invoice details).

**Documented in:** `.skills/ui/SKILL.md`
