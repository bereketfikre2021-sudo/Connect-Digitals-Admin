import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { TableContainer, SearchBar, Pagination, Toolbar, TH, TD, EmptyRow, ErrorRow } from "@/components/ui/TableShared";

interface AuditLog {
  id: string; action: string; actorType: string; entityType: string; entityId: string;
  createdAt: string; ipAddress: string | null;
  adminActor:    { firstName: string; lastName: string; email: string } | null;
  customerActor: { firstName: string; lastName: string; username: string | null } | null;
}

const PAGE_SIZE = 30;

export function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit-logs", search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      return api.get<{ success: boolean; data: { logs: AuditLog[]; total: number; totalPages: number } }>(`/admin/audit-logs?${params}`).then(r => r.data.data);
    },
    placeholderData: prev => prev,
  });

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader title="Audit Log" subtitle="Immutable record of all admin and customer actions" />

      <Toolbar>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search actions, entities…" />
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--cd-gray-500)", alignSelf: "center" }}>{data?.total ?? 0} entries</span>
      </Toolbar>

      {isLoading ? <Spinner /> : (
        <TableContainer>
          <table style={{ minWidth: 700 }}>
            <thead>
              <tr style={{ background: "var(--cd-gray-50)", borderBottom: "1px solid var(--cd-gray-200)" }}>
                <TH>Timestamp</TH>
                <TH>Actor</TH>
                <TH>Action</TH>
                <TH>Entity</TH>
                <TH>IP</TH>
              </tr>
            </thead>
            <tbody>
              {isError && <ErrorRow cols={5} onRetry={() => refetch()} />}
              {!isError && data?.logs.length === 0 && <EmptyRow cols={5} message="No audit logs found" />}
              {data?.logs.map(log => {
                const actor = log.adminActor
                  ? `${log.adminActor.firstName} ${log.adminActor.lastName} (Admin)`
                  : log.customerActor
                    ? `${log.customerActor.firstName} ${log.customerActor.lastName}`
                    : log.actorType === "SYSTEM" ? "System" : "—";
                return (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--cd-gray-100)" }}>
                    <TD style={{ fontSize: 11, color: "var(--cd-gray-600)", whiteSpace: "nowrap" }}>{formatDateTime(log.createdAt)}</TD>
                    <TD style={{ fontSize: 12 }}>{actor}</TD>
                    <TD style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: "var(--cd-red)" }}>{log.action}</TD>
                    <TD style={{ fontSize: 11, color: "var(--cd-gray-600)" }}>{log.entityType} <span style={{ fontFamily: "monospace" }}>{log.entityId.slice(0, 12)}…</span></TD>
                    <TD style={{ fontSize: 11, color: "var(--cd-gray-500)", fontFamily: "monospace" }}>{log.ipAddress ?? "—"}</TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination page={page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} pageSize={PAGE_SIZE} onChange={setPage} />
        </TableContainer>
      )}
    </div>
  );
}
