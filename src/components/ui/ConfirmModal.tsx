/**
 * Reusable branded confirmation modal.
 *
 * Replaces window.confirm() throughout the admin dashboard.
 * Shows action context (title, body, optional metadata rows),
 * requires explicit confirmation, and surfaces loading state.
 */

import { useEffect, useRef } from "react";
import { Button } from "./Button";
import { AlertIcon, XIcon } from "./Icon";

export interface ConfirmModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Short heading, e.g. "Approve Payment" */
  title: string;
  /** Descriptive body text shown below the title */
  body: string;
  /** Optional key/value pairs shown in a detail block (amount, order #, etc.) */
  details?: Array<{ label: string; value: string | React.ReactNode }>;
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Variant for the confirm button. Defaults to "primary". */
  confirmVariant?: "primary" | "danger" | "success";
  /** Whether the confirm button should show a loading spinner */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  body,
  details,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button when modal opens (safe default)
  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    // Backdrop
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,15,51,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.15s ease-out both",
      }}
    >
      {/* Card */}
      <div style={{
        background: "#fff",
        borderRadius: "var(--radius-lg)",
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          padding: "20px 20px 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "var(--radius-sm)",
              background:
                confirmVariant === "danger" ? "#fee2e2" :
                confirmVariant === "success" ? "#dcfce7" : "#dbeafe",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <AlertIcon
                size={18}
                color={
                  confirmVariant === "danger" ? "#dc2626" :
                  confirmVariant === "success" ? "#16a34a" : "#2563eb"
                }
              />
            </div>
            <h2
              id="confirm-modal-title"
              style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--cd-navy)" }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !loading && onCancel()}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--cd-gray-500)", flexShrink: 0 }}
          >
            <XIcon size={16} color="var(--cd-gray-500)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "12px 20px 0" }}>
          <p style={{ fontSize: 13, color: "var(--cd-gray-700)", lineHeight: 1.55 }}>{body}</p>
        </div>

        {/* Detail rows */}
        {details && details.length > 0 && (
          <div style={{
            margin: "14px 20px 0",
            border: "1px solid var(--cd-gray-200)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
          }}>
            {details.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px",
                  background: i % 2 === 0 ? "var(--cd-gray-50)" : "#fff",
                  borderBottom: i < details.length - 1 ? "1px solid var(--cd-gray-100)" : undefined,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--cd-gray-600)" }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cd-navy)" }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: "flex", gap: 8, justifyContent: "flex-end",
          padding: "16px 20px 20px",
        }}>
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            size="md"
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            size="md"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
