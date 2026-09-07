/**
 * Shared table primitives used across Payments, Fulfillment, Wallets, Orders.
 *
 * - TableContainer  — horizontally-scrollable card wrapper
 * - SearchBar       — debounced text input
 * - Pagination      — prev/next + page indicator
 * - EmptyState      — generic empty table row
 * - ErrorState      — generic error table row
 */

import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "./Icon";

// ─── TableContainer ──────────────────────────────────────────────────────────

export function TableContainer({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      boxShadow: "var(--shadow-sm)",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      {children}
    </div>
  );
}

// ─── SearchBar ───────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search…" }: SearchBarProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // sync external reset (e.g. when parent clears)
  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 350);
  };

  return (
    <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
      <SearchIcon
        size={14}
        color="var(--cd-gray-500)"
        style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      />
      <input
        type="search"
        value={local}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          width: "100%",
          padding: "7px 10px 7px 30px",
          border: "1.5px solid var(--cd-gray-300)",
          borderRadius: "var(--radius-sm)",
          fontSize: 13,
          outline: "none",
          fontFamily: "var(--font-body)",
          background: "#fff",
        }}
      />
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px",
      borderTop: "1px solid var(--cd-gray-100)",
      fontSize: 12,
      color: "var(--cd-gray-600)",
    }}>
      <span>{from}–{to} of {total.toLocaleString()}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <PageBtn label="← Prev" disabled={page <= 1} onClick={() => onChange(page - 1)} />
        <span style={{ padding: "4px 8px", fontSize: 12, fontWeight: 600, color: "var(--cd-navy)" }}>
          {page} / {totalPages}
        </span>
        <PageBtn label="Next →" disabled={page >= totalPages} onClick={() => onChange(page + 1)} />
      </div>
    </div>
  );
}

function PageBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "4px 10px", fontSize: 12, fontWeight: 600,
        border: "1.5px solid var(--cd-gray-300)",
        borderRadius: "var(--radius-sm)",
        background: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        color: "var(--cd-navy)",
      }}
    >
      {label}
    </button>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

export function EmptyRow({ cols, message = "No records found" }: { cols: number; message?: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: "center", padding: 40, color: "var(--cd-gray-500)", fontSize: 13 }}>
        {message}
      </td>
    </tr>
  );
}

// ─── ErrorRow ────────────────────────────────────────────────────────────────

export function ErrorRow({ cols, onRetry }: { cols: number; onRetry?: () => void }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: "center", padding: 40, color: "#dc2626", fontSize: 13 }}>
        Failed to load data.{" "}
        {onRetry && (
          <button type="button" onClick={onRetry} style={{ color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            Retry
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Toolbar (search + filters row) ─────────────────────────────────────────

export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
      {children}
    </div>
  );
}

// ─── StatusTab pills ─────────────────────────────────────────────────────────

interface StatusTabsProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}

export function StatusTabs({ options, value, onChange }: StatusTabsProps) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          style={{
            padding: "5px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600,
            cursor: "pointer", border: "1.5px solid",
            borderColor: value === o.value ? "var(--cd-red)" : "var(--cd-gray-300)",
            background: value === o.value ? "var(--cd-red)" : "#fff",
            color: value === o.value ? "#fff" : "var(--cd-gray-600)",
            transition: "all 0.12s",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── TH helper ───────────────────────────────────────────────────────────────

export function TH({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th style={{
      padding: "10px 14px",
      fontSize: 11, fontWeight: 600,
      color: "var(--cd-gray-600)",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      whiteSpace: "nowrap",
      ...style,
    }}>
      {children}
    </th>
  );
}

// ─── TD helper ───────────────────────────────────────────────────────────────

export function TD({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: "11px 14px", fontSize: 13, ...style }}>
      {children}
    </td>
  );
}
