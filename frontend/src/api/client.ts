declare global {
    interface Window {
        frappe: { 
            csrf_token: string; 
            boot: Record<string, unknown> 
        }
    }
}

const BASE = '/api/method'

export async function callMethod<T>(
    method: string,
    params?: Record<string, unknown>,
): Promise<T> {
    const res = await fetch(`${BASE}/${method}`, {
        method: params ? 'POST' : 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.frappe?.csrf_token || '',
        },
        body: params ? JSON.stringify(params) : undefined,
    })
    const json = await res.json()
    if (!res.ok || json.exc) throw new Error(json.exc || 'API error')
    return json.message as T
}
