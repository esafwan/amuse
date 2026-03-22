import { Loader2 } from 'lucide-react'

/** Inline brand mark for loading / empty states */
export function AmuseLogoMark({ className = '' }: { className?: string }) {
    return (
        <svg
            className={`app-logo-mark ${className}`.trim()}
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-hidden
        >
            <rect x="2" y="2" width="36" height="36" rx="10" fill="var(--accent-bg)" stroke="var(--border)" />
            <path
                fill="var(--accent)"
                d="M14 28h-3.5l6.8-17h1.4l6.8 17H24l-1.3-3.3h-9.4L14 28zm5.5-7.5h5.2l-2.6-6.8-2.6 6.8z"
            />
        </svg>
    )
}

type ListStateProps = {
    title: string
    description?: string
}

/** Centered loading block for list / scroll areas */
export function ListLoadingState({ title, description }: ListStateProps) {
    return (
        <div className="list-state list-state-loading" role="status" aria-live="polite">
            <div className="list-state-inner">
                <div className="list-state-brand" aria-hidden>
                    <AmuseLogoMark />
                    <span className="list-state-spinner-wrap">
                        <Loader2 />
                    </span>
                </div>
                <p className="list-state-title">{title}</p>
                {description ? <p className="list-state-desc">{description}</p> : null}
            </div>
        </div>
    )
}

/** No results / empty list */
export function ListEmptyState({ title, description }: ListStateProps) {
    return (
        <div className="list-state list-state-empty">
            <div className="list-state-inner">
                <div className="list-state-brand list-state-brand-static" aria-hidden>
                    <AmuseLogoMark />
                </div>
                <p className="list-state-title">{title}</p>
                {description ? <p className="list-state-desc">{description}</p> : null}
            </div>
        </div>
    )
}

/** Compact loading line inside overlays (e.g. invoice line items) */
export function InlineLoadingState({ title }: { title: string }) {
    return (
        <div className="inline-state-loading" role="status" aria-live="polite">
            <span className="inline-state-spinner" aria-hidden>
                <Loader2 />
            </span>
            <span>{title}</span>
        </div>
    )
}

/** Short empty hint inside overlays (detail drawers) */
export function InlineEmptyState({ title, description }: ListStateProps) {
    return (
        <div className="inline-state-empty">
            <p className="inline-state-empty-title">{title}</p>
            {description ? <p className="inline-state-empty-desc">{description}</p> : null}
        </div>
    )
}

/** Full-screen session gate (RequireAuth) */
export function AuthLoadingState() {
    return (
        <div className="auth-loading" aria-busy="true" aria-live="polite" role="status">
            <div className="auth-loading-inner">
                <div className="auth-loading-brand" aria-hidden>
                    <AmuseLogoMark />
                    <span className="list-state-spinner-wrap">
                        <Loader2 />
                    </span>
                </div>
                <p className="auth-loading-text">Checking session…</p>
            </div>
        </div>
    )
}
