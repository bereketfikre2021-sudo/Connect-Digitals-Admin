import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, etbDisplay, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import {
  TableContainer, SearchBar, Pagination, Toolbar,
  EmptyRow, ErrorRow, TH, TD,
} from "@/components/ui/TableShared";

interface WalletRow {
  id: string;
  balanceETB: number;
  updatedAt: string;
  user: { id: string; firstName: string; lastName: string; username: string | null };
}

export function WalletsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-wallets", search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      return api.get<{ success: boolean; data: { wallets: WalletRow[]; total: number; totalPages: number } }>(
        `/admin/wallets?${params}`
      ).then(r => r.data.data);
    },
    placeholderData: prev => prev,
  });

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Wallets" subtitle="Customer wallet balances and transaction history" />

      <Toolbar>
        <SearchBar value={search} onChange={handleSearch} placeholder="Search by name or username…" />
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--cd-gray-500)", alignSelf: "center" }}>
          {data?.total ?? 0} wallets
        </span>
      </Toolbar>

      {isLoading ? (
        <Spinner />
      ) : (
        <TableContainer>
          <table style={{ minWidth: 600 }}>
            <thead>
              <tr style={{ background: "var(--cd-gray-50)", borderBottom: "1px solid var(--cd-gray-200)" }}>
                <TH>Customer</TH>
                <TH>Username</TH>
                <TH style={{ textAlign: "right" }}>Balance (ETB)</TH>
                <TH>Last Updated</TH>
                <TH />
              </tr>
            </thead>
            <tbody>
              {isError && <ErrorRow cols={5} onRetry={() => refetch()} />}
              {!isError && data?.wallets.length === 0 && <EmptyRow cols={5} message="No wallets found" />}
              {data?.wallets.map(w => (
                <tr
                  key={w.id}
                  onClick={() => navigate(`/wallets/${w.user.id}`)}
                  style={{ borderBottom: "1px solid var(--cd-gray-100)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--cd-gray-50)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <TD style={{ fontWeight: 600 }}>{w.user.firstName} {w.user.lastName}</TD>
                  <TD style={{ color: "var(--cd-gray-600)" }}>
                    {w.user.username ? `@${w.user.username}` : "—"}
                  </TD>
                  <TD style={{ textAlign: "right", fontFamily: "var(--font-heading)", fontWeight: 700, color: "var(--cd-red)", fontSize: 14 }}>
                    {etbDisplay(w.balanceETB)}
                  </TD>
                  <TD style={{ color: "var(--cd-gray-600)", fontSize: 12 }}>{formatDateTime(w.updatedAt)}</TD>
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
