/**
 * Frappe standard print preview URL. Same pattern for Sales Invoice, POS Invoice, Customer, etc.
 * Minimal required query: doctype + name.
 * @see https://docs.frappe.io/framework/user/en/printing
 */
export function buildPrintviewUrl(doctype: string, name: string, origin?: string): string {
    const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
    const u = new URL('/printview', base || 'http://localhost')
    u.searchParams.set('doctype', doctype)
    u.searchParams.set('name', name)
    return u.toString()
}

/** Opens the server print HTML/PDF view in a new tab (user can print from there). */
export function openPrintviewInNewTab(doctype: string, name: string): void {
    const url = buildPrintviewUrl(doctype, name)
    window.open(url, '_blank', 'noopener,noreferrer')
}
