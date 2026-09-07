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
  { value: "",           label: "All" },
  { value: "DRAFT",      label: "Draft" },
  { value: "PENDING",    label: "Pending" },
  { value: "ACTIVE",     label: "Active" },
  { value: "PAUSED",     label: "Paused" },
  { value: "COMPLETED",  label: "Completed" },
  { value: "CANCELLED",  label: "Cancelled" },
  { value: "FAILED",     label: "Failed" },
];

interface CampaignRow {
  id: string;
  internalStatus: string;
  provider: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count: { metrics: number };
  order: {
    id: string; orderNumber: string; totalAmountETB: number;
    service: { name: string; platform: { name: string } };
    package: { quantity: number };
    user: { id: string; firstName: string; lastName: string; username: string | null };
  };
}

const PAGE_SIZE = 20;

export function CampaignsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-campaigns", status, search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      return api
        .get<{ success: boolean; data: { campaigns: CampaignRow[]; total: number; totalPages: number } }>(
          `/admin/campaigns?${params}`
        )
        .then(r => r.data.data);
    },
    placeholderData: prev => prev,
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatus(v); setPage(1); };

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Campaigns" subtitle="Track and manage promotion campaigns" />

      <Toolbar>
        <StatusTabs options={STATUS_OPTIONS} value={status} onChange={handleStatus} />
        <SearchBar value={search} onChange={handleSearch} placeholder="Order #, customer…" />
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--cd-gray-500)", alignSelf: "center" }}>
          {data?.total ?? 0} total
        </span>
      </Toolbar>

      {isLoading ? <Spinner /> : (
        <TableContainer>
          <table style={{ minWidth: 820 }}>
            <thead>
              <tr style={{ background: "var(--cd-gray-50)", borderBottom: "1px solid var(--cd-gray-200)" }}>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH>Platform</TH>
                <TH>Service</TH>
                <TH>Status</TH>
                <TH>Start</TH>
                <TH>End</TH>
                <TH style={{ textAlign: "right" }}>Metrics</TH>
                <TH />
              </tr>
            </thead>
            <tbody>
              {isError && <ErrorRow cols={9} onRetry={() => refetch()} />}
              {!isError && data?.campaigns.length === 0 && (
                <EmptyRow cols={9} message="No campaigns found" />
              )}
              {data?.campaigns.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                  style={{ borderBottom: "1px solid var(--cd-gray-100)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--cd-gray-50)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <TD style={{ fontWeight: 600 }}>{c.order.orderNumber}</TD>
                  <TD>
                    <div style={{ fontWeight: 500 }}>{c.order.user.firstName} {c.order.user.lastName}</div>
                    {c.order.user.username && <div style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>@{c.order.user.username}</div>}
                  </TD>
                  <TD style={{ fontSize: 12 }}>{c.order.service.platform.name}</TD>
                  <TD style={{ fontSize: 12 }}>{c.order.service.name}</TD>
                  <TD><StatusBadge status={c.internalStatus} /></TD>
                  <TD style={{ fontSize: 12, color: "var(--cd-gray-600)", whiteSpace: "nowrap" }}>
                    {c.startDate ? formatDateTime(c.startDate) : "—"}
                  </TD>
                  <TD style={{ fontSize: 12, color: "var(--cd-gray-600)", whiteSpace: "nowrap" }}>
                    {c.endDate ? formatDateTime(c.endDate) : "—"}
                  </TD>
                  <TD style={{ textAlign: "right", fontWeight: 600 }}>{c._count.metrics}</TD>
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
