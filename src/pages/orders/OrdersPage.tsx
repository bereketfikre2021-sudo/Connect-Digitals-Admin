import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, etbDisplay, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import {
  TableContainer, SearchBar, Pagination, Toolbar, StatusTabs,
  EmptyRow, ErrorRow, TH, TD,
} from "@/components/ui/TableShared";

const STATUS_OPTIONS = [
  { value: "",                  label: "All" },
  { value: "PENDING_PAYMENT",   label: "Pending Payment" },
  { value: "PAYMENT_SUBMITTED", label: "Payment Submitted" },
  { value: "PAYMENT_APPROVED",  label: "Payment Approved" },
  { value: "PROCESSING",        label: "Processing" },
  { value: "COMPLETED",         label: "Completed" },
  { value: "CANCELLED",         label: "Cancelled" },
];

interface OrderRow {
  id: string; orderNumber: string; targetUrl: string;
  totalAmountETB: number; orderStatus: string; paymentStatus: string;
  fulfillmentStatus: string; createdAt: string;
  user: { id: string; firstName: string; lastName: string; username: string | null };
  service: { name: string; platform: { name: string } };
  package: { name: string; quantity: number };
}

const PAGE_SIZE = 20;

export function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-orders", status, search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      return api.get<{ success: boolean; data: { orders: OrderRow[]; total: number; totalPages: number } }>(
        `/admin/orders?${params}`
      ).then(r => r.data.data);
    },
    placeholderData: prev => prev,
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatus(v); setPage(1); };

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Orders" subtitle="All customer orders with full status overview" />

      <Toolbar>
        <StatusTabs options={STATUS_OPTIONS} value={status} onChange={handleStatus} />
        <SearchBar value={search} onChange={handleSearch} placeholder="Order #, customer, URL…" />
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--cd-gray-500)", alignSelf: "center" }}>
          {data?.total ?? 0} total
        </span>
      </Toolbar>

      {isLoading ? <Spinner /> : (
        <TableContainer>
          <table style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ background: "var(--cd-gray-50)", borderBottom: "1px solid var(--cd-gray-200)" }}>
                <TH>Order #</TH>
                <TH>Customer</TH>
                <TH>Platform</TH>
                <TH>Service</TH>
                <TH>Package</TH>
                <TH style={{ textAlign: "right" }}>Amount</TH>
                <TH>Order Status</TH>
                <TH>Payment</TH>
                <TH>Fulfillment</TH>
                <TH>Created</TH>
                <TH />
              </tr>
            </thead>
            <tbody>
              {isError && <ErrorRow cols={11} onRetry={() => refetch()} />}
              {!isError && data?.orders.length === 0 && <EmptyRow cols={11} message="No orders found" />}
              {data?.orders.map(o => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/orders/${o.id}`)}
                  style={{ borderBottom: "1px solid var(--cd-gray-100)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--cd-gray-50)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <TD style={{ fontWeight: 700 }}>{o.orderNumber}</TD>
                  <TD>
                    <div style={{ fontWeight: 500 }}>{o.user.firstName} {o.user.lastName}</div>
                    {o.user.username && <div style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>@{o.user.username}</div>}
                  </TD>
                  <TD style={{ fontSize: 12 }}>{o.service.platform.name}</TD>
                  <TD style={{ fontSize: 12 }}>{o.service.name}</TD>
                  <TD style={{ fontSize: 12 }}>{o.package.name} ({o.package.quantity.toLocaleString()})</TD>
                  <TD style={{ textAlign: "right", fontWeight: 700, color: "var(--cd-red)", fontFamily: "var(--font-heading)", whiteSpace: "nowrap" }}>
                    {etbDisplay(o.totalAmountETB)} ETB
                  </TD>
                  <TD><StatusBadge status={o.orderStatus} /></TD>
                  <TD><StatusBadge status={o.paymentStatus} /></TD>
                  <TD><StatusBadge status={o.fulfillmentStatus} /></TD>
                  <TD style={{ fontSize: 12, color: "var(--cd-gray-600)", whiteSpace: "nowrap" }}>{formatDateTime(o.createdAt)}</TD>
                  <TD style={{ color: "var(--cd-red)", fontSize: 12, whiteSpace: "nowrap" }}>View →</TD>
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
