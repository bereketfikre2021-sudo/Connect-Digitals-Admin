/**
 * Broadcast Page
 *
 * Allows ADMIN / SUPER_ADMIN to compose and send a message to all registered
 * Telegram users via the bot.
 *
 * Tabs:
 *  - New Broadcast — compose form
 *  - History       — list of past broadcasts with status and stats
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SendIcon, ClockIcon, UsersIcon, CheckIcon, XIcon, PlusIcon } from "@/components/ui/Icon";

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageType = "TEXT" | "PHOTO" | "VIDEO" | "DOCUMENT";

interface BroadcastButton { text: string; url: string }

interface BroadcastSummary {
  id:              string;
  messageType:     MessageType;
  status:          string;
  totalRecipients: number;
  sentCount:       number;
  failedCount:     number;
  blockedCount:    number;
  createdAt:       string;
  startedAt?:      string | null;
  completedAt?:    string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FeedbackBanner({ type, message, onDismiss }: { type: "success" | "error"; message: string; onDismiss: () => void }) {
  return (
    <div style={{
      marginBottom: 16, padding: "10px 14px", borderRadius: 8,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: type === "success" ? "#dcfce7" : "#fee2e2",
      border: `1px solid ${type === "success" ? "#86efac" : "#fca5a5"}`,
      fontSize: 13, color: type === "success" ? "#166534" : "#991b1b",
    }}>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 12px", color: "inherit", fontSize: 16 }}>×</button>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "var(--shadow-sm)", ...style }}>
      {children}
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--cd-gray-700)" }}>
      {children}{required && <span style={{ color: "var(--cd-red)", marginLeft: 2 }}>*</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px",
  border: "1.5px solid var(--cd-gray-300)", borderRadius: "var(--radius-sm)",
  fontSize: 13, outline: "none", fontFamily: "var(--font-body)",
  boxSizing: "border-box",
};

const TYPE_OPTIONS: { value: MessageType; label: string; hint: string }[] = [
  { value: "TEXT",     label: "Text",     hint: "Plain or HTML-formatted text message" },
  { value: "PHOTO",    label: "Photo",    hint: "Image with optional caption" },
  { value: "VIDEO",    label: "Video",    hint: "Video with optional caption" },
  { value: "DOCUMENT", label: "Document", hint: "File/document with optional caption" },
];

// ── New Broadcast Form ────────────────────────────────────────────────────────

function NewBroadcastForm() {
  const qc = useQueryClient();
  const [messageType, setMessageType] = useState<MessageType>("TEXT");
  const [text, setText]               = useState("");
  const [caption, setCaption]         = useState("");
  const [mediaFileId, setMediaFileId] = useState("");
  const [buttons, setButtons]         = useState<BroadcastButton[]>([]);
  const [showBtnForm, setShowBtnForm] = useState(false);
  const [btnText, setBtnText]         = useState("");
  const [btnUrl, setBtnUrl]           = useState("");
  const [feedback, setFeedback]       = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmed, setConfirmed]     = useState(false);

  const sendMutation = useMutation({
    mutationFn: () => api.post("/admin/broadcast", {
      messageType,
      text:        messageType === "TEXT" ? text : undefined,
      caption:     messageType !== "TEXT" ? caption : undefined,
      mediaFileId: messageType !== "TEXT" ? mediaFileId : undefined,
      buttons:     buttons.length > 0 ? buttons.map(b => [b]) : undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
      const d = (res.data as { data: { broadcastId: string; recipientCount: number } }).data;
      setFeedback({
        type: "success",
        message: `Broadcast is sending to ${d.recipientCount.toLocaleString()} users. ID: ${d.broadcastId}`,
      });
      // Reset form
      setText(""); setCaption(""); setMediaFileId(""); setButtons([]); setConfirmed(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? "Failed to send broadcast.";
      setFeedback({ type: "error", message: msg });
    },
  });

  function addButton() {
    if (!btnText.trim()) return;
    let url = btnUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    try { new URL(url); } catch {
      setFeedback({ type: "error", message: `Invalid URL: "${btnUrl}"` });
      return;
    }
    setButtons(prev => [...prev, { text: btnText.trim(), url }]);
    setBtnText(""); setBtnUrl(""); setShowBtnForm(false);
    setFeedback(null);
  }

  function removeButton(idx: number) {
    setButtons(prev => prev.filter((_, i) => i !== idx));
  }

  const isValid = messageType === "TEXT"
    ? text.trim().length > 0
    : mediaFileId.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 700 }}>
      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

      {/* Message type selector */}
      <Card>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
          Message Type
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMessageType(opt.value)}
              style={{
                padding: "12px 14px", borderRadius: 8, textAlign: "left", cursor: "pointer",
                border: `2px solid ${messageType === opt.value ? "var(--cd-red)" : "var(--cd-gray-200)"}`,
                background: messageType === opt.value ? "#fff5f5" : "#fff",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: messageType === opt.value ? "var(--cd-red)" : "var(--cd-navy)" }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 2 }}>{opt.hint}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Content */}
      <Card>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
          Content
        </p>

        {messageType === "TEXT" ? (
          <div>
            <Label required>Message</Label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={6}
              placeholder="Type your message here. HTML formatting supported: <b>bold</b>, <i>italic</i>, <a href='...'>link</a>"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            />
            <div style={{ fontSize: 11, color: text.length > 3800 ? "#dc2626" : "var(--cd-gray-400)", marginTop: 4, textAlign: "right" }}>
              {text.length} / 4096
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Label required>Telegram File ID</Label>
              <input
                type="text"
                value={mediaFileId}
                onChange={e => setMediaFileId(e.target.value)}
                placeholder="e.g. AgACAgIAAxkBAAI..."
                style={inputStyle}
              />
              <p style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 4 }}>
                Forward the {messageType.toLowerCase()} to @userinfobot or inspect the file_id from a sent message.
              </p>
            </div>
            <div>
              <Label>Caption (optional)</Label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={3}
                placeholder="Optional caption for the media"
                style={{ ...inputStyle, resize: "vertical" }}
              />
              <div style={{ fontSize: 11, color: caption.length > 900 ? "#dc2626" : "var(--cd-gray-400)", marginTop: 4, textAlign: "right" }}>
                {caption.length} / 1024
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* CTA Buttons */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            CTA Buttons (optional)
          </p>
          {!showBtnForm && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowBtnForm(true)}>
              <PlusIcon size={12} color="var(--cd-red)" /> Add Button
            </Button>
          )}
        </div>

        {/* Existing buttons */}
        {buttons.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {buttons.map((btn, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--cd-gray-50)", borderRadius: 8, border: "1px solid var(--cd-gray-200)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{btn.text}</div>
                  <div style={{ fontSize: 11, color: "var(--cd-gray-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{btn.url}</div>
                </div>
                <button type="button" onClick={() => removeButton(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 4, flexShrink: 0 }}>
                  <XIcon size={14} color="#dc2626" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add button form */}
        {showBtnForm && (
          <div style={{ padding: 14, background: "var(--cd-gray-50)", borderRadius: 8, border: "1px solid var(--cd-gray-200)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <Label required>Button Text</Label>
              <input type="text" value={btnText} onChange={e => setBtnText(e.target.value)} placeholder="e.g. Open App" style={inputStyle} />
            </div>
            <div>
              <Label required>Button URL</Label>
              <input type="url" value={btnUrl} onChange={e => setBtnUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="button" variant="primary" size="sm" disabled={!btnText.trim() || !btnUrl.trim()} onClick={addButton}>
                <CheckIcon size={12} color="#fff" /> Add
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowBtnForm(false); setBtnText(""); setBtnUrl(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {buttons.length === 0 && !showBtnForm && (
          <p style={{ fontSize: 12, color: "var(--cd-gray-400)", textAlign: "center", padding: "8px 0" }}>No buttons — message will be sent without interactive buttons.</p>
        )}
      </Card>

      {/* Preview + Confirm */}
      <Card style={{ border: "1.5px solid var(--cd-gray-200)" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
          Preview & Confirm
        </p>

        <div style={{ background: "var(--cd-gray-50)", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>Type:</span> {messageType}
          </div>
          {messageType === "TEXT" && text && (
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{text.slice(0, 300)}{text.length > 300 ? "…" : ""}</div>
          )}
          {messageType !== "TEXT" && (
            <>
              {mediaFileId && <div><span style={{ fontWeight: 600 }}>File ID:</span> <code style={{ fontSize: 11 }}>{mediaFileId.slice(0, 40)}{mediaFileId.length > 40 ? "…" : ""}</code></div>}
              {caption && <div style={{ marginTop: 4 }}><span style={{ fontWeight: 600 }}>Caption:</span> {caption.slice(0, 200)}</div>}
            </>
          )}
          {buttons.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {buttons.map((b, i) => (
                <span key={i} style={{ background: "#e0e7ff", color: "#1e40af", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                  {b.text}
                </span>
              ))}
            </div>
          )}
          {!isValid && (
            <p style={{ color: "#dc2626", marginTop: 8, fontSize: 12 }}>
              {messageType === "TEXT" ? "Message text is required." : "File ID is required."}
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <input
            type="checkbox"
            id="confirm-send"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            style={{ width: 16, height: 16, cursor: "pointer" }}
          />
          <label htmlFor="confirm-send" style={{ fontSize: 13, cursor: "pointer", userSelect: "none" }}>
            I have reviewed the message and confirm sending it to <strong>all registered users</strong>.
          </label>
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isValid || !confirmed || sendMutation.isPending}
          loading={sendMutation.isPending}
          onClick={() => sendMutation.mutate()}
        >
          <SendIcon size={15} color="#fff" />
          {sendMutation.isPending ? "Sending…" : "Send Broadcast"}
        </Button>
      </Card>
    </div>
  );
}

// ── Broadcast History ─────────────────────────────────────────────────────────

function BroadcastHistory() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-broadcasts"],
    queryFn: () => api.get<{ success: boolean; data: BroadcastSummary[] }>("/admin/broadcast")
      .then(r => r.data.data),
    refetchInterval: (query) => {
      // Auto-refresh while any broadcast is still SENDING
      const sending = query.state.data?.some(b => b.status === "SENDING");
      return sending ? 5000 : false;
    },
  });

  const statusColor: Record<string, string> = {
    COMPLETED: "#16a34a", SENDING: "#f59e0b", FAILED: "#dc2626",
    CANCELLED: "#64748b", DRAFT: "#94a3b8",
  };

  if (isLoading) return <Spinner />;
  if (isError) return (
    <div style={{ padding: 24, textAlign: "center", color: "#dc2626" }}>
      Failed to load history.{" "}
      <button type="button" onClick={() => refetch()} style={{ color: "var(--cd-red)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Retry</button>
    </div>
  );
  if (!data || data.length === 0) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--cd-gray-500)", fontSize: 13 }}>
      No broadcasts sent yet.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map(b => (
        <div key={b.id} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "var(--shadow-sm)", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          {/* Status dot + type */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor[b.status] ?? "#94a3b8", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--cd-navy)" }}>{b.messageType}</div>
              <div style={{ fontSize: 11, color: "var(--cd-gray-500)" }}>{formatDateTime(b.createdAt)}</div>
            </div>
          </div>

          {/* Status badge */}
          <StatusBadge status={b.status} />

          {/* Stats */}
          <div style={{ display: "flex", gap: 20, flex: 1, flexWrap: "wrap" }}>
            <Stat Icon={UsersIcon} label="Recipients" value={b.totalRecipients.toLocaleString()} />
            <Stat Icon={CheckIcon} label="Sent" value={b.sentCount.toLocaleString()} color="#16a34a" />
            <Stat Icon={XIcon} label="Failed" value={b.failedCount.toLocaleString()} color={b.failedCount > 0 ? "#dc2626" : undefined} />
            <Stat Icon={ClockIcon} label="Blocked" value={b.blockedCount.toLocaleString()} />
          </div>

          {/* ID */}
          <div style={{ fontSize: 11, color: "var(--cd-gray-400)", fontFamily: "monospace" }}>
            {b.id.slice(0, 12)}…
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ Icon, label, value, color }: { Icon: (p: { size: number; color?: string }) => JSX.Element; label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <Icon size={13} color={color ?? "var(--cd-gray-400)"} />
      <span style={{ fontSize: 12, color: "var(--cd-gray-500)" }}>{label}:</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color ?? "var(--cd-navy)" }}>{value}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function BroadcastPage() {
  const [tab, setTab] = useState<"compose" | "history">("compose");

  return (
    <div style={{ padding: 28, flex: 1 }} className="animate-fade-in">
      <PageHeader
        title="Broadcast"
        subtitle="Send a message to all registered Telegram users"
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid var(--cd-gray-200)", paddingBottom: 0 }}>
        {(["compose", "history"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: "8px 20px", fontSize: 13, fontWeight: 700,
              background: "none", border: "none", cursor: "pointer",
              color: tab === t ? "var(--cd-red)" : "var(--cd-gray-500)",
              borderBottom: tab === t ? "2px solid var(--cd-red)" : "2px solid transparent",
              marginBottom: -2, transition: "color 0.15s, border-color 0.15s",
              fontFamily: "var(--font-heading)",
              textTransform: "capitalize",
            }}
          >
            {t === "compose" ? "New Broadcast" : "History"}
          </button>
        ))}
      </div>

      {tab === "compose" ? <NewBroadcastForm /> : <BroadcastHistory />}
    </div>
  );
}
