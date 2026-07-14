import { useCallback, useEffect, useState } from "react";
import { Download, TrendingUp, DollarSign, Wallet, BarChart3 } from "lucide-react";
import { apiRequest } from "../api/client";
import { Seo } from "../components/Seo";
import { EarningsChart, MiniBars } from "../components/EarningsChart";
import { DateRangePicker, downloadCSV, toCSV, type Granularity } from "../components/DateRangePicker";

type BreakdownRow = {
  date: string;
  label: string;
  orders: number;
  saleCommissionCents: number;
  withdrawCommissionCents: number;
  totalAdminCents: number;
  withdrawCount: number;
  withdrawVolumeCents: number;
  netIncomeCents: number;
};

type TopProduct = {
  productId: string;
  title: string;
  category: string;
  coverImageUrl: string | null;
  orders: number;
  avgPriceCents: number;
  grossCents: number;
  commissionCents: number;
  netCents: number;
  contributionPct: number;
};

type AdminSummary = {
  totalOrders: number;
  totalGrossCents: number;
  totalSaleCommissionCents: number;
  totalWithdrawCommissionCents: number;
  totalAdminCents: number;
  totalWithdrawVolumeCents: number;
  totalWithdrawCount: number;
  netIncomeCents: number;
};

type Report = {
  breakdown: BreakdownRow[];
  topProducts: TopProduct[];
  summary: AdminSummary;
  settings: { saleCommissionPercent: number; withdrawalCommissionPercent: number; frozenHoldHours: number };
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AdminEarningsPage() {
  const [{ today, thirtyDaysAgo }] = useState(() => {
    const now = new Date();
    return { today: now.toISOString().slice(0, 10), thirtyDaysAgo: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) };
  });
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Report>(`/api/assistant/admin/earnings/daily?from=${from}&to=${to}&granularity=${granularity}`);
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [from, granularity, to]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  function handleApply(newFrom: string, newTo: string, newGranularity: Granularity) {
    setFrom(newFrom);
    setTo(newTo);
    setGranularity(newGranularity);
  }

  function exportDaily() {
    if (!report) return;
    const rows = report.breakdown.map((r) => ({
      date: r.date,
      label: r.label,
      orders: r.orders,
      sale_commission: r.saleCommissionCents,
      withdrawal_commission: r.withdrawCommissionCents,
      total_admin: r.totalAdminCents,
      withdraw_count: r.withdrawCount,
      withdraw_volume: r.withdrawVolumeCents,
      net_income: r.netIncomeCents,
    }));
    const csv = toCSV(rows, ["date", "label", "orders", "sale_commission", "withdrawal_commission", "total_admin", "withdraw_count", "withdraw_volume", "net_income"]);
    downloadCSV(`admin-earnings-${from}-to-${to}.csv`, csv);
  }

  function exportTopProducts() {
    if (!report) return;
    const rows = report.topProducts.map((p) => ({
      product_id: p.productId,
      title: p.title,
      category: p.category,
      orders: p.orders,
      gross: p.grossCents,
      sale_commission: p.commissionCents,
      net: p.netCents,
      avg_price: p.avgPriceCents,
      contribution_pct: p.contributionPct,
    }));
    const csv = toCSV(rows, ["product_id", "title", "category", "orders", "gross", "sale_commission", "net", "avg_price", "contribution_pct"]);
    downloadCSV(`top-products-${from}-to-${to}.csv`, csv);
  }

  const todayData = report?.breakdown[report.breakdown.length - 1];
  const saleRate = report?.settings.saleCommissionPercent ?? 0;
  const withdrawalRate = report?.settings.withdrawalCommissionPercent ?? 0;
  const holdHours = report?.settings.frozenHoldHours ?? 0;
  const exampleGrossCents = 10_000;
  const exampleSaleFeeCents = Math.round(exampleGrossCents * saleRate / 100);
  const exampleSellerCents = exampleGrossCents - exampleSaleFeeCents;
  const exampleWithdrawalFeeCents = Math.round(exampleSellerCents * withdrawalRate / 100);

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px", background: "#0A0A0B", minHeight: "100vh", color: "#fafafa" }}>
      <Seo title="Admin earnings" description="HSello marketplace earnings analytics" />
      <header style={{ marginBottom: "24px" }}>
        <span style={{ fontSize: "12px", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" }}>ADMIN</span>
        <h1 style={{ fontSize: "28px", margin: "4px 0" }}>Earnings Analytics</h1>
        <p style={{ color: "#a1a1aa" }}>Track configured commission revenue from sales and withdrawals.</p>
      </header>

      <div style={{ marginBottom: "24px" }}>
        <DateRangePicker from={from} to={to} granularity={granularity} onApply={handleApply} />
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button onClick={exportDaily} style={{ background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          <Download size={16} /> Export Daily CSV
        </button>
        <button onClick={exportTopProducts} style={{ background: "#27272a", color: "#fafafa", border: "1px solid #3f3f46", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          <Download size={16} /> Export Top Products CSV
        </button>
      </div>

      {loading ? (
        <div style={{ color: "#71717a", padding: "40px", textAlign: "center" }}>Loading earnings data...</div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "#18181b", borderRadius: "12px", padding: "20px", border: "1px solid #27272a" }}>
              <DollarSign size={20} color="#7c3aed" />
              <div style={{ marginTop: "8px" }}>
                <small style={{ color: "#71717a", fontSize: "12px" }}>Sale {saleRate}% (Today)</small>
                <strong style={{ display: "block", fontSize: "24px" }}>{money(todayData?.saleCommissionCents ?? 0)}</strong>
              </div>
            </div>
            <div style={{ background: "#18181b", borderRadius: "12px", padding: "20px", border: "1px solid #27272a" }}>
              <Wallet size={20} color="#10b981" />
              <div style={{ marginTop: "8px" }}>
                <small style={{ color: "#71717a", fontSize: "12px" }}>Withdrawal {withdrawalRate}% (Today)</small>
                <strong style={{ display: "block", fontSize: "24px" }}>{money(todayData?.withdrawCommissionCents ?? 0)}</strong>
              </div>
            </div>
            <div style={{ background: "#18181b", borderRadius: "12px", padding: "20px", border: "1px solid #27272a" }}>
              <TrendingUp size={20} color="#f59e0b" />
              <div style={{ marginTop: "8px" }}>
                <small style={{ color: "#71717a", fontSize: "12px" }}>Total Admin (Today)</small>
                <strong style={{ display: "block", fontSize: "24px" }}>{money(todayData?.totalAdminCents ?? 0)}</strong>
              </div>
            </div>
            <div style={{ background: "#18181b", borderRadius: "12px", padding: "20px", border: "1px solid #27272a" }}>
              <BarChart3 size={20} color="#3b82f6" />
              <div style={{ marginTop: "8px" }}>
                <small style={{ color: "#71717a", fontSize: "12px" }}>Net Income (Today)</small>
                <strong style={{ display: "block", fontSize: "24px" }}>{money(todayData?.netIncomeCents ?? 0)}</strong>
              </div>
            </div>
          </div>

          {/* MiniBars for orders */}
          <div style={{ background: "#18181b", borderRadius: "12px", padding: "20px", border: "1px solid #27272a", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", marginBottom: "12px" }}>Orders per {granularity.replace("ly", "")}</h3>
            <MiniBars data={report.breakdown.map((r) => ({ label: r.label, value: r.orders }))} color="#7c3aed" />
          </div>

          {/* Earnings Chart */}
          <div style={{ background: "#18181b", borderRadius: "12px", padding: "20px", border: "1px solid #27272a", marginBottom: "24px", overflowX: "auto" }}>
            <h3 style={{ fontSize: "14px", marginBottom: "16px" }}>Commission Revenue Over Time</h3>
            <EarningsChart
              points={report.breakdown.map((r) => ({ label: r.label, value: r.totalAdminCents }))}
              color="#7c3aed"
              label="Total Admin"
            />
          </div>

          {/* Breakdown Table */}
          <div style={{ background: "#18181b", borderRadius: "12px", border: "1px solid #27272a", marginBottom: "24px", overflow: "auto" }}>
            <h3 style={{ fontSize: "14px", padding: "20px 20px 0" }}>Breakdown</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px" }}>
              <thead style={{ position: "sticky", top: 0, background: "#18181b" }}>
                <tr style={{ borderBottom: "1px solid #27272a" }}>
                  {["Date", "Orders", `Sale ${saleRate}%`, `Withdrawal ${withdrawalRate}%`, "Total", "Net Income"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#71717a", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.breakdown.map((row) => (
                  <tr key={row.date} style={{ borderBottom: "1px solid #27272a" }}>
                    <td style={{ padding: "10px 16px", fontSize: "13px" }}>{row.label}</td>
                    <td style={{ padding: "10px 16px", fontSize: "13px" }}>{row.orders}</td>
                    <td style={{ padding: "10px 16px", fontSize: "13px" }}>{money(row.saleCommissionCents)}</td>
                    <td style={{ padding: "10px 16px", fontSize: "13px" }}>{money(row.withdrawCommissionCents)}</td>
                    <td style={{ padding: "10px 16px", fontSize: "13px", color: "#7c3aed", fontWeight: 600 }}>{money(row.totalAdminCents)}</td>
                    <td style={{ padding: "10px 16px", fontSize: "13px", color: "#10b981" }}>{money(row.netIncomeCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Products */}
          <div style={{ background: "#18181b", borderRadius: "12px", border: "1px solid #27272a", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", padding: "20px 20px 0" }}>Top Products</h3>
            <div style={{ padding: "16px 20px" }}>
              {report.topProducts.map((product, i) => {
                const rankColors = ["#f59e0b", "#a1a1aa", "#f97316"];
                const rankColor = rankColors[i] ?? "#71717a";
                return (
                  <div key={product.productId} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #27272a" }}>
                    <span style={{ color: rankColor, fontWeight: 700, fontSize: "16px", minWidth: "24px" }}>#{i + 1}</span>
                    {product.coverImageUrl ? <img src={product.coverImageUrl} alt="" style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }} /> : <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#27272a" }} />}
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: "14px" }}>{product.title}</strong>
                      <div style={{ fontSize: "12px", color: "#71717a" }}>{product.category} · {product.orders} orders · Avg {money(product.avgPriceCents)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px" }}>Gross: {money(product.grossCents)}</div>
                      <div style={{ fontSize: "12px", color: "#7c3aed" }}>Commission: {money(product.commissionCents)}</div>
                    </div>
                    <div style={{ minWidth: "80px" }}>
                      <div style={{ fontSize: "11px", color: "#71717a", marginBottom: "4px" }}>{product.contributionPct}%</div>
                      <div style={{ height: "6px", background: "#27272a", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, product.contributionPct * 3)}%`, height: "100%", background: "#7c3aed" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* How Commissions Work */}
          <div style={{ background: "#18181b", borderRadius: "12px", padding: "24px", border: "1px solid #27272a" }}>
            <h3 style={{ fontSize: "14px", marginBottom: "16px" }}>How Commissions Work</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              <div>
                <strong style={{ color: "#7c3aed", fontSize: "13px" }}>Sale commission ({saleRate}%)</strong>
                <p style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "4px" }}>{money(exampleGrossCents)} sale → {money(exampleSaleFeeCents)} platform fee + {money(exampleSellerCents)} seller earnings held for {holdHours}h</p>
              </div>
              <div>
                <strong style={{ color: "#10b981", fontSize: "13px" }}>Withdrawal fee ({withdrawalRate}%)</strong>
                <p style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "4px" }}>Seller requests {money(exampleSellerCents)} → {money(exampleWithdrawalFeeCents)} fee → {money(exampleSellerCents - exampleWithdrawalFeeCents)} net payout</p>
              </div>
              <div>
                <strong style={{ color: "#f59e0b", fontSize: "13px" }}>Protected settlement</strong>
                <p style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "4px" }}>Earnings remain frozen for {holdHours}h. Download and dispute windows follow each listing and order record.</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ color: "#71717a", padding: "40px", textAlign: "center" }}>No earnings data available.</div>
      )}
    </main>
  );
}
import "../admin-enterprise.css";
