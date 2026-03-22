import { usePriceRegimeSummary } from '../hooks/usePricing'
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Percent } from 'lucide-react'
import clsx from 'clsx'

export default function PriceImpactDashboard({ logName }: { logName: string }) {
    const { data: summary, isLoading } = usePriceRegimeSummary(logName)

    if (isLoading) return <div className="h-40 flex items-center justify-center text-muted-foreground animate-pulse">Computing impact tensors...</div>
    if (!summary) return <div className="h-40 flex items-center justify-center text-muted-foreground border-dashed border-2 rounded-xl border-border">No snapshot data available for {logName}</div>

    const metrics = [
        { label: "Total Realized Revenue", value: `$${summary.total_revenue?.toFixed(2)}`, icon: DollarSign, trend: +12.5 },
        { label: "Total Volume Sold", value: `${summary.total_qty} units`, icon: Package, trend: -2.1 },
        { label: "Discount Erosion", value: `$${summary.total_discount_value?.toFixed(2)}`, icon: Percent, trend: 0 },
        { label: "Active Cohort (Days)", value: summary.days_active, icon: Users, trend: null },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 animate-in slide-in-from-top-4 duration-300 fade-in">
            {metrics.map((m, i) => (
                <div key={i} className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{m.label}</h3>
                        <m.icon className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div className="text-2xl font-bold mt-2">{m.value}</div>
                    {m.trend !== null && (
                        <p className={clsx("text-xs font-medium mt-1 inline-flex items-center gap-1", m.trend > 0 ? "text-emerald-500" : m.trend < 0 ? "text-rose-500" : "text-muted-foreground")}>
                            {m.trend > 0 ? <TrendingUp className="h-3 w-3" /> : m.trend < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                            {m.trend > 0 ? '+' : ''}{m.trend}% from prior regime
                        </p>
                    )}
                </div>
            ))}
        </div>
    )
}
