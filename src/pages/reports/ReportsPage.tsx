import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import {
  TableContainer, SearchBar, Pagination, Toolbar, StatusTabs,
  EmptyRow, ErrorRow, TH, TD,
} from "@/components/ui/TableShared";

const STATUS_OPTIONS = [
  { value: "",          label: "All" },
  { value: "DRAFT",     label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED",  label: "Archived" },
];

interface ReportRow {
  id: string; title: string; status: string;
  publishedAt: string | null; createdAt: string;
  periodStart: string | null; periodEnd: string | null;
  order: {
    id: string; orderNumber: string;
    service: { name: string; platform: { name: string } };
    user: { firstName: string; lastName: string; username: string | null };
  };
  campaign: { id: string; internalStatus: string } | null;
}

const PAGE_SIZE = 20;

export function ReportsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-reports", status, search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      return api
        .get<{ success: boolean; data: { reports: ReportRow[]; total: number; totalPages: number } }>(
          `/admin/reports?${params}`
        )
        .then(r => r.data.data);
    },
    placeholderData: prev => prev,
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatus(v); setPage(1); };

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Reports" subtitle="Per-order deliverables sent to customers — create, publish and archive campaign summaries" />

      <Toolbar>
        <StatusTabs options={STATUS_OPTIONS} value={status} onChange={handleStatus} />
        <SearchBar value={search} onChange={handleSearch} placeholder="Title, order #, customer…" />
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--cd-gray-500)", alignSelf: "center" }}>
          {data?.total ?? 0} total
        </span>
      </Toolbar>

      {/* Context note — Reports are customer-facing documents, distinct from Analytics */}
      <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, fontSize: 12, color: "#0369a1", lineHeight: 1.5 }}>
        <strong>Reports vs Analytics:</strong> Reports are per-order documents you publish directly to the customer (visible in their Telegram Mini App). Analytics is the platform-wide dashboard for internal stats. Reports are created manually — one per order.
      </div>

      {isLoading ? <Spinner /> : (
        <TableContainer>
          <table style={{ minWidth: 760 }}>
            <thead>
              <tr style={{ background: "var(--cd-gray-50)", borderBottom: "1px solid var(--cd-gray-200)" }}>
                <TH>Title</TH>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH>Platform / Service</TH>
                <TH>Period</TH>
                <TH>Status</TH>
                <TH>Published</TH>
                <TH />
              </tr>
            </thead>
            <tbody>
              {isError && <ErrorRow cols={8} onRetry={() => refetch()} />}
              {!isError && data?.reports.length === 0 && <EmptyRow cols={8} message="No reports found" />}
              {data?.reports.map(r => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/reports/${r.id}`)}
                  style={{ borderBottom: "1px solid var(--cd-gray-100)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--cd-gray-50)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <TD style={{ fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</TD>
                  <TD style={{ fontWeight: 500 }}>{r.order.orderNumber}</TD>
                  <TD>
                    <div>{r.order.user.firstName} {r.order.user.lastName}</div>
                    {r.order.user.username && <div style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>@{r.order.user.username}</div>}
                  </TD>
                  <TD style={{ fontSize: 12 }}>{r.order.service.platform.name} · {r.order.service.name}</TD>
                  <TD style={{ fontSize: 12, color: "var(--cd-gray-600)", whiteSpace: "nowrap" }}>
                    {r.periodStart ? new Date(r.periodStart).toLocaleDateString() : "—"}
                    {r.periodStart && r.periodEnd ? " → " : ""}
                    {r.periodEnd ? new Date(r.periodEnd).toLocaleDateString() : ""}
                  </TD>
                  <TD><StatusBadge status={r.status} /></TD>
                  <TD style={{ fontSize: 12, color: "var(--cd-gray-600)", whiteSpace: "nowrap" }}>
                    {r.publishedAt ? formatDateTime(r.publishedAt) : "—"}
                  </TD>
                  <TD style={{ color: "var(--cd-red)", fontSize: 12 }}>Open →</TD>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 1}
            total={data?.total ?? 0}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </TableContainer>
      )}
    </div>
  );
}
