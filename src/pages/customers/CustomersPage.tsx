import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, etbDisplay, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import {
  TableContainer, SearchBar, Pagination, Toolbar,
  EmptyRow, ErrorRow, TH, TD,
} from "@/components/ui/TableShared";

interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  status: string;
  createdAt: string;
  telegramIdentity: { telegramUserId: string; isPremium: boolean; lastSeenAt: string } | null;
  wallet: { balanceETB: number } | null;
  _count: { orders: number };
  totalSpendETB: number;
}

const PAGE_SIZE = 20;

export function CustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-customers", search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      return api
        .get<{ success: boolean; data: { customers: CustomerRow[]; total: number; totalPages: number } }>(
          `/admin/customers?${params}`
        )
        .then(r => r.data.data);
    },
    placeholderData: prev => prev,
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Customers" subtitle="All registered customers" />

      <Toolbar>
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Name, username, Telegram ID…"
        />
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--cd-gray-500)", alignSelf: "center" }}>
          {data?.total ?? 0} customers
        </span>
      </Toolbar>

      {isLoading ? (
        <Spinner />
      ) : (
        <TableContainer>
          <table style={{ minWidth: 860 }}>
            <thead>
              <tr style={{ background: "var(--cd-gray-50)", borderBottom: "1px solid var(--cd-gray-200)" }}>
                <TH>Name</TH>
                <TH>Username</TH>
                <TH>Telegram ID</TH>
                <TH style={{ textAlign: "right" }}>Wallet</TH>
                <TH style={{ textAlign: "right" }}>Orders</TH>
                <TH style={{ textAlign: "right" }}>Total Spend</TH>
                <TH>Status</TH>
                <TH>Joined</TH>
                <TH />
              </tr>
            </thead>
            <tbody>
              {isError && <ErrorRow cols={9} onRetry={() => refetch()} />}
              {!isError && data?.customers.length === 0 && (
                <EmptyRow cols={9} message="No customers found" />
              )}
              {data?.customers.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  style={{ borderBottom: "1px solid var(--cd-gray-100)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--cd-gray-50)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <TD style={{ fontWeight: 600 }}>
                    {c.firstName} {c.lastName}
                    {c.telegramIdentity?.isPremium && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: "#92400e", background: "#fef3c7", padding: "1px 5px", borderRadius: 999, fontWeight: 700 }}>
                        Premium
                      </span>
                    )}
                  </TD>
                  <TD style={{ color: "var(--cd-gray-600)", fontSize: 12 }}>
                    {c.username ? `@${c.username}` : "—"}
                  </TD>
                  <TD style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {c.telegramIdentity?.telegramUserId ?? "—"}
                  </TD>
                  <TD style={{ textAlign: "right", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: "var(--cd-navy)" }}>
                    {c.wallet ? `${etbDisplay(c.wallet.balanceETB)} ETB` : "—"}
                  </TD>
                  <TD style={{ textAlign: "right", fontWeight: 600 }}>
                    {c._count.orders}
                  </TD>
                  <TD style={{ textAlign: "right", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 13, color: "var(--cd-red)" }}>
                    {etbDisplay(c.totalSpendETB)} ETB
                  </TD>
                  <TD><StatusBadge status={c.status} /></TD>
                  <TD style={{ fontSize: 12, color: "var(--cd-gray-600)", whiteSpace: "nowrap" }}>
                    {formatDateTime(c.createdAt)}
                  </TD>
                  <TD style={{ color: "var(--cd-red)", fontSize: 12 }}>View →</TD>
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
