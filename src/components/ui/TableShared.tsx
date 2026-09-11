/**
 * Shared table primitives — redesigned.
 *
 * TableContainer · SearchBar · Pagination · Toolbar
 * StatusTabs · EmptyRow · ErrorRow · TH · TD
 */

import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "./Icon";

// ─── TableContainer ──────────────────────────────────────────────────────────

export function TableContainer({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      boxShadow: "var(--shadow-sm)",
      border: "1px solid var(--cd-gray-200)",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      {children}
    </div>
  );
}

// ─── SearchBar ───────────────────────────────────────────────────────────────

export function SearchBar({
  value, onChange, placeholder = "Search…",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 350);
  };

  return (
    <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
      <SearchIcon size={14} color="var(--cd-gray-400)"
        style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      <input
        type="search"
        value={local}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          width: "100%", padding: "8px 11px 8px 32px",
          border: "1.5px solid var(--cd-gray-200)",
          borderRadius: 8, fontSize: 13, outline: "none",
          fontFamily: "var(--font-body)", background: "#fff",
          transition: "border-color 0.15s, box-shadow 0.15s",
          color: "var(--cd-gray-800)",
        }}
        onFocus={e => {
          e.target.style.borderColor = "var(--cd-red)";
          e.target.style.boxShadow = "0 0 0 3px rgba(236,28,36,0.1)";
        }}
        onBlur={e => {
          e.target.style.borderColor = "var(--cd-gray-200)";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export function Pagination({
  page, totalPages, total, pageSize, onChange,
}: {
  page: number; totalPages: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 16px", borderTop: "1px solid var(--cd-gray-100)",
      fontSize: 12, color: "var(--cd-gray-500)",
    }}>
      <span style={{ fontWeight: 500 }}>
        {from.toLocaleString()}–{to.toLocaleString()} of <strong style={{ color: "var(--cd-navy)" }}>{total.toLocaleString()}</strong>
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <PageBtn label="← Prev" disabled={page <= 1}      onClick={() => onChange(page - 1)} />
        <span style={{
          padding: "4px 10px", fontSize: 12, fontWeight: 700,
          color: "var(--cd-navy)", background: "var(--cd-gray-50)",
          borderRadius: 6, border: "1px solid var(--cd-gray-200)",
        }}>
          {page} / {totalPages}
        </span>
        <PageBtn label="Next →" disabled={page >= totalPages} onClick={() => onChange(page + 1)} />
      </div>
    </div>
  );
}

function PageBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        padding: "4px 11px", fontSize: 12, fontWeight: 600,
        border: "1.5px solid var(--cd-gray-200)", borderRadius: 6,
        background: "#fff", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1, color: "var(--cd-navy)",
        transition: "border-color 0.12s",
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cd-red)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--cd-gray-200)"; }}
    >
      {label}
    </button>
  );
}

// ─── EmptyRow ────────────────────────────────────────────────────────────────

export function EmptyRow({ cols, message = "No records found" }: { cols: number; message?: string }) {
  return (
    <tr>
      <td colSpan={cols}>
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--cd-gray-400)" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--cd-gray-500)", marginBottom: 4 }}>{message}</div>
          <div style={{ fontSize: 12, color: "var(--cd-gray-400)" }}>Try adjusting your filters or search term.</div>
        </div>
      </td>
    </tr>
  );
}

// ─── ErrorRow ────────────────────────────────────────────────────────────────

export function ErrorRow({ cols, onRetry }: { cols: number; onRetry?: () => void }) {
  return (
    <tr>
      <td colSpan={cols}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
          <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, marginBottom: 8 }}>
            Failed to load data
          </div>
          {onRetry && (
            <button type="button" onClick={onRetry}
              style={{ fontSize: 13, color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>
              Try again
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", gap: 8, marginBottom: 14,
      flexWrap: "wrap", alignItems: "center",
    }}>
      {children}
    </div>
  );
}

// ─── StatusTabs ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "":                 { bg: "#1e293b",  text: "#fff",    border: "#1e293b",  dot: "#94a3b8" },
  UNDER_REVIEW:       { bg: "#d97706",  text: "#fff",    border: "#d97706",  dot: "#fcd34d" },
  APPROVED:           { bg: "#16a34a",  text: "#fff",    border: "#16a34a",  dot: "#86efac" },
  REJECTED:           { bg: "#dc2626",  text: "#fff",    border: "#dc2626",  dot: "#fca5a5" },
  PENDING_PAYMENT:    { bg: "#d97706",  text: "#fff",    border: "#d97706",  dot: "#fcd34d" },
  PAYMENT_SUBMITTED:  { bg: "#2563eb",  text: "#fff",    border: "#2563eb",  dot: "#93c5fd" },
  PAYMENT_APPROVED:   { bg: "#16a34a",  text: "#fff",    border: "#16a34a",  dot: "#86efac" },
  PAYMENT_REJECTED:   { bg: "#dc2626",  text: "#fff",    border: "#dc2626",  dot: "#fca5a5" },
  PROCESSING:         { bg: "#7c3aed",  text: "#fff",    border: "#7c3aed",  dot: "#c4b5fd" },
  IN_PROGRESS:        { bg: "#0891b2",  text: "#fff",    border: "#0891b2",  dot: "#67e8f9" },
  COMPLETED:          { bg: "#15803d",  text: "#fff",    border: "#15803d",  dot: "#bbf7d0" },
  CANCELLED:          { bg: "#64748b",  text: "#fff",    border: "#64748b",  dot: "#cbd5e1" },
  REFUNDED:           { bg: "#92400e",  text: "#fff",    border: "#92400e",  dot: "#fde68a" },
  QUEUED:             { bg: "#2563eb",  text: "#fff",    border: "#2563eb",  dot: "#93c5fd" },
  AWAITING_APPROVAL:  { bg: "#d97706",  text: "#fff",    border: "#d97706",  dot: "#fcd34d" },
  FAILED:             { bg: "#dc2626",  text: "#fff",    border: "#dc2626",  dot: "#fca5a5" },
  DRAFT:              { bg: "#64748b",  text: "#fff",    border: "#64748b",  dot: "#cbd5e1" },
  ACTIVE:             { bg: "#15803d",  text: "#fff",    border: "#15803d",  dot: "#bbf7d0" },
  PAUSED:             { bg: "#d97706",  text: "#fff",    border: "#d97706",  dot: "#fcd34d" },
  PUBLISHED:          { bg: "#0891b2",  text: "#fff",    border: "#0891b2",  dot: "#67e8f9" },
  ARCHIVED:           { bg: "#64748b",  text: "#fff",    border: "#64748b",  dot: "#cbd5e1" },
};

const INACTIVE_TAB = { bg: "transparent", text: "#64748b", border: "transparent", dot: "#cbd5e1" };

export function StatusTabs({
  options, value, onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "flex", gap: 2, flexWrap: "wrap",
      background: "var(--cd-gray-100)",
      padding: "4px 5px",
      borderRadius: 10,
      border: "1px solid var(--cd-gray-200)",
    }}>
      {options.map(o => {
        const active = value === o.value;
        const colors = STATUS_COLORS[o.value] ?? { bg: "#EC1C24", text: "#fff", border: "#EC1C24", dot: "#fca5a5" };
        const c      = active ? colors : INACTIVE_TAB;

        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 11px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              fontFamily: "var(--font-heading)",
              cursor: "pointer",
              border: `1.5px solid ${active ? c.border : "transparent"}`,
              background: active ? c.bg : "transparent",
              color: active ? c.text : "var(--cd-gray-600)",
              transition: "all 0.14s ease",
              whiteSpace: "nowrap",
              boxShadow: active ? `0 2px 6px ${c.bg}50` : "none",
            }}
          >
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: active ? c.dot : "#94a3b8",
              flexShrink: 0,
              boxShadow: active ? `0 0 0 2px ${c.dot}40` : "none",
              transition: "all 0.14s",
            }} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── TH helper ───────────────────────────────────────────────────────────────

export function TH({
  children, style,
}: {
  children?: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <th style={{
      padding: "11px 14px",
      fontSize: 10.5, fontWeight: 700,
      color: "var(--cd-gray-500)",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      whiteSpace: "nowrap",
      background: "var(--cd-gray-50)",
      borderBottom: "1px solid var(--cd-gray-200)",
      ...style,
    }}>
      {children}
    </th>
  );
}

// ─── TD helper ───────────────────────────────────────────────────────────────

export function TD({
  children, style,
}: {
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <td style={{
      padding: "11px 14px",
      fontSize: 13,
      borderBottom: "1px solid var(--cd-gray-100)",
      verticalAlign: "middle",
      ...style,
    }}>
      {children}
    </td>
  );
}
