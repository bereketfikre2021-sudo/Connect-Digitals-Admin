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
  { value: "",                label: "All" },
  { value: "QUEUED",          label: "Queued" },
  { value: "PROCESSING",      label: "Processing" },
  { value: "AWAITING_APPROVAL", label: "Awaiting Approval" },
  { value: "COMPLETED",       label: "Completed" },
  { value: "FAILED",          label: "Failed" },
  { value: "CANCELLED",       label: "Cancelled" },
];

interface Task {
  id: string; status: string; fulfillmentType: string; createdAt: string;
  startedAt: string | null; completedAt: string | null;
  assignee: { firstName: string; lastName: string } | null;
  order: {
    orderNumber: string; targetUrl: string;
    service: { name: string; platform: { name: string } };
    package: { name: string; quantity: number };
    user: { firstName: string; lastName: string; username: string | null };
  };
}

const PAGE_SIZE = 20;

export function FulfillmentPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("QUEUED");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-fulfillment", status, search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      return api.get<{ success: boolean; data: { tasks: Task[]; total: number; totalPages: number } }>(
        `/admin/fulfillment?${params}`
      ).then(r => r.data.data);
    },
    placeholderData: prev => prev,
    refetchInterval: 20_000,
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatus(v); setPage(1); };

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Fulfillment Queue" subtitle="Manage and track order fulfillment tasks" />

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
                <TH>Package</TH>
                <TH>Target</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH>Assigned</TH>
                <TH />
              </tr>
            </thead>
            <tbody>
              {isError && <ErrorRow cols={10} onRetry={() => refetch()} />}
              {!isError && data?.tasks.length === 0 && <EmptyRow cols={10} message="No tasks found" />}
              {data?.tasks.map(t => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/fulfillment/${t.id}`)}
                  style={{ borderBottom: "1px solid var(--cd-gray-100)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--cd-gray-50)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <TD style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{t.order.orderNumber}</TD>
                  <TD>
                    <div style={{ fontWeight: 500 }}>{t.order.user.firstName} {t.order.user.lastName}</div>
                    {t.order.user.username && <div style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>@{t.order.user.username}</div>}
                  </TD>
                  <TD style={{ fontSize: 12 }}>{t.order.service.platform.name}</TD>
                  <TD style={{ fontSize: 12 }}>{t.order.service.name}</TD>
                  <TD style={{ fontSize: 12 }}>{t.order.package.name}</TD>
                  <TD style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11 }}>
                    <a
                      href={t.order.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ color: "var(--cd-red)" }}
                    >
                      {t.order.targetUrl}
                    </a>
                  </TD>
                  <TD><StatusBadge status={t.status} /></TD>
                  <TD style={{ fontSize: 12, color: "var(--cd-gray-600)", whiteSpace: "nowrap" }}>{formatDateTime(t.createdAt)}</TD>
                  <TD style={{ fontSize: 12 }}>
                    {t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "—"}
                  </TD>
                  <TD style={{ color: "var(--cd-red)", fontSize: 12, whiteSpace: "nowrap" }}>Open →</TD>
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
