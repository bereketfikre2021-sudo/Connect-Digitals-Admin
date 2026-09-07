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
  { value: "",             label: "All" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED",     label: "Approved" },
  { value: "REJECTED",     label: "Rejected" },
];

interface Payment {
  id: string; amountETB: number; reference: string; status: string; createdAt: string;
  user: { id: string; firstName: string; lastName: string; username: string | null };
  order: { orderNumber: string; service: { name: string } } | null;
  paymentMethod: { name: string };
}

const PAGE_SIZE = 20;

export function PaymentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("UNDER_REVIEW");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-payments", status, search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      return api.get<{ success: boolean; data: { payments: Payment[]; total: number; totalPages: number } }>(
        `/admin/payments?${params}`
      ).then(r => r.data.data);
    },
    placeholderData: prev => prev,
    refetchInterval: 20_000,
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatus(v); setPage(1); };

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Payment Review" subtitle="Review and approve or reject customer payments" />

      <Toolbar>
        <StatusTabs options={STATUS_OPTIONS} value={status} onChange={handleStatus} />
        <SearchBar value={search} onChange={handleSearch} placeholder="Order #, customer, reference…" />
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--cd-gray-500)", alignSelf: "center" }}>
          {data?.total ?? 0} total
        </span>
      </Toolbar>

      {isLoading ? <Spinner /> : (
        <TableContainer>
          <table style={{ minWidth: 780 }}>
            <thead>
              <tr style={{ background: "var(--cd-gray-50)", borderBottom: "1px solid var(--cd-gray-200)" }}>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH>Service</TH>
                <TH style={{ textAlign: "right" }}>Amount</TH>
                <TH>Method</TH>
                <TH>Reference</TH>
                <TH>Submitted</TH>
                <TH>Status</TH>
                <TH />
              </tr>
            </thead>
            <tbody>
              {isError && <ErrorRow cols={9} onRetry={() => refetch()} />}
              {!isError && data?.payments.length === 0 && <EmptyRow cols={9} message="No payments found" />}
              {data?.payments.map(p => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/payments/${p.id}`)}
                  style={{ borderBottom: "1px solid var(--cd-gray-100)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--cd-gray-50)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <TD style={{ fontWeight: 600 }}>{p.order?.orderNumber ?? "Deposit"}</TD>
                  <TD>
                    <div style={{ fontWeight: 500 }}>{p.user.firstName} {p.user.lastName}</div>
                    {p.user.username && <div style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>@{p.user.username}</div>}
                  </TD>
                  <TD style={{ color: "var(--cd-gray-600)", fontSize: 12 }}>{p.order?.service.name ?? "Wallet deposit"}</TD>
                  <TD style={{ textAlign: "right", fontWeight: 700, color: "var(--cd-red)", fontFamily: "var(--font-heading)", whiteSpace: "nowrap" }}>
                    {etbDisplay(p.amountETB)} ETB
                  </TD>
                  <TD style={{ fontSize: 12 }}>{p.paymentMethod.name}</TD>
                  <TD style={{ fontFamily: "monospace", fontSize: 12 }}>{p.reference}</TD>
                  <TD style={{ fontSize: 12, color: "var(--cd-gray-600)", whiteSpace: "nowrap" }}>{formatDateTime(p.createdAt)}</TD>
                  <TD><StatusBadge status={p.status} /></TD>
                  <TD style={{ color: "var(--cd-red)", fontSize: 12, whiteSpace: "nowrap" }}>Review →</TD>
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
