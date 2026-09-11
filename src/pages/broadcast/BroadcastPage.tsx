/**
 * Broadcast Page — redesigned
 *
 * Split layout: compose form on the left, live Telegram-style preview on the right.
 * Image preview shows actual uploaded image. History is a rich card list.
 */

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatDateTime } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  SendIcon, UsersIcon, CheckIcon, XIcon, PlusIcon,
  FileTextIcon, ImageIcon, PlayIcon, ClipboardIcon,
} from "@/components/ui/Icon";

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

// ── Design tokens ─────────────────────────────────────────────────────────────

const R = "var(--cd-red)";
const NAVY = "var(--cd-navy)";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1.5px solid var(--cd-gray-300)", borderRadius: 8,
  fontSize: 13, outline: "none", fontFamily: "var(--font-body)",
  background: "#fff", transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const cardStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "20px 22px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: 1,
  textTransform: "uppercase", color: "var(--cd-gray-500)",
  marginBottom: 12,
};

// ── Feedback banner ───────────────────────────────────────────────────────────

function FeedbackBanner({ type, message, onDismiss }: {
  type: "success" | "error"; message: string; onDismiss: () => void;
}) {
  const isOk = type === "success";
  return (
    <div style={{
      padding: "12px 16px", borderRadius: 10, marginBottom: 16,
      display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10,
      background: isOk ? "#f0fdf4" : "#fff1f2",
      border: `1px solid ${isOk ? "#bbf7d0" : "#fecdd3"}`,
      color: isOk ? "#15803d" : "#be123c", fontSize: 13,
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={{ fontSize: 16, lineHeight: 1.2 }}>{isOk ? "✅" : "⚠️"}</span>
        <span style={{ lineHeight: 1.5 }}>{message}</span>
      </div>
      <button type="button" onClick={onDismiss}
        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>
        ×
      </button>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 0 }}>
      <p style={sectionLabel}>{label}</p>
      {children}
    </div>
  );
}

// ── Upload ────────────────────────────────────────────────────────────────────

async function uploadMediaFile(file: File, messageType: MessageType): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<{ success: boolean; data: { fileId: string } }>(
    `/admin/broadcast/upload-media?type=${messageType}`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data.data.fileId;
}

const ACCEPT: Record<MessageType, string> = {
  TEXT:     "",
  PHOTO:    "image/jpeg,image/png,image/webp,image/gif",
  VIDEO:    "video/mp4,video/quicktime,video/mpeg",
  DOCUMENT: "*/*",
};

function MediaUploader({
  messageType, onUploaded, onError, previewUrl, onPreviewUrl,
}: {
  messageType:  MessageType;
  onUploaded:   (fileId: string, filename: string) => void;
  onError:      (msg: string) => void;
  previewUrl:   string | null;
  onPreviewUrl: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = "";

    if (file.size > 50 * 1024 * 1024) {
      onError("File is too large. Maximum size is 50 MB.");
      return;
    }

    // Show local preview immediately for images
    if (messageType === "PHOTO" && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => onPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      onPreviewUrl(null);
    }

    setUploading(true);
    setUploadedName(null);
    try {
      const fileId = await uploadMediaFile(file, messageType);
      setUploadedName(file.name);
      onUploaded(fileId, file.name);
    } catch (err: unknown) {
      onPreviewUrl(null);
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? "Upload failed. Please try again.";
      onError(msg);
    } finally {
      setUploading(false);
    }
  }

  const icon = messageType === "PHOTO" ? "🖼️" : messageType === "VIDEO" ? "🎬" : "📄";
  const label = messageType === "PHOTO" ? "image" : messageType === "VIDEO" ? "video" : "file";
  const done = !!uploadedName && !uploading;

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--cd-gray-700)" }}>
        {messageType === "PHOTO" ? "Photo" : messageType === "VIDEO" ? "Video" : "File"}
        <span style={{ color: R, marginLeft: 2 }}>*</span>
      </p>

      {/* If photo and we have a preview, show it as a square */}
      {messageType === "PHOTO" && previewUrl ? (
        <div style={{ position: "relative", marginBottom: 8 }}>
          <img
            src={previewUrl}
            alt="Preview"
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              borderRadius: 10,
              display: "block",
              border: done ? "2px solid #22c55e" : "2px solid var(--cd-gray-200)",
            }}
          />
          {uploading && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: 10,
              background: "rgba(0,0,0,0.45)", display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <div className="animate-spin" style={{ width: 28, height: 28, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Uploading…</span>
            </div>
          )}
          {done && (
            <div style={{
              position: "absolute", top: 8, right: 8,
              background: "#22c55e", borderRadius: "50%",
              width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <CheckIcon size={13} color="#fff" />
            </div>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)",
              color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}
          >
            Replace
          </button>
        </div>
      ) : (
        <label
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 8, borderRadius: 10, cursor: uploading ? "wait" : "pointer", textAlign: "center",
            padding: done ? "16px 20px" : "32px 20px",
            border: `2px dashed ${done ? "#22c55e" : "var(--cd-gray-300)"}`,
            background: done ? "#f0fdf4" : "var(--cd-gray-50)",
            transition: "all 0.15s",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT[messageType]}
            onChange={handleFile}
            disabled={uploading}
            style={{ display: "none" }}
          />
          {uploading ? (
            <>
              <div className="animate-spin" style={{ width: 26, height: 26, border: "3px solid var(--cd-gray-200)", borderTopColor: R, borderRadius: "50%" }} />
              <span style={{ fontSize: 13, color: "var(--cd-gray-500)" }}>Uploading to Telegram…</span>
            </>
          ) : done ? (
            <>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckIcon size={18} color="#16a34a" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>{uploadedName}</span>
              <span style={{ fontSize: 11, color: "#16a34a" }}>Uploaded — click to replace</span>
            </>
          ) : (
            <>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--cd-gray-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {icon}
              </div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cd-gray-700)" }}>
                  Choose {label}
                </span>
                <span style={{ fontSize: 12, color: "var(--cd-gray-400)", display: "block", marginTop: 2 }}>
                  or drag and drop · Max 50 MB
                </span>
              </div>
            </>
          )}
        </label>
      )}

      {/* Hidden input for replace when preview is shown */}
      {messageType === "PHOTO" && previewUrl && (
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT[messageType]}
          onChange={handleFile}
          disabled={uploading}
          style={{ display: "none" }}
        />
      )}
    </div>
  );
}

// ── Type selector pills ───────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: MessageType; emoji: string; label: string; hint: string }[] = [
  { value: "TEXT",     emoji: "✍️",  label: "Text",     hint: "HTML message" },
  { value: "PHOTO",    emoji: "🖼️",  label: "Photo",    hint: "Image + caption" },
  { value: "VIDEO",    emoji: "🎬",  label: "Video",    hint: "Video + caption" },
  { value: "DOCUMENT", emoji: "📄",  label: "Document", hint: "File + caption" },
];

// ── Telegram-style preview ────────────────────────────────────────────────────

function TelegramPreview({
  messageType, text, caption, previewUrl, buttons,
}: {
  messageType: MessageType;
  text:        string;
  caption:     string;
  previewUrl:  string | null;
  buttons:     BroadcastButton[];
}) {
  const hasContent = (messageType === "TEXT" && text.trim()) ||
                     (messageType !== "TEXT" && previewUrl);
  const displayText = messageType === "TEXT" ? text : caption;

  return (
    <div style={{
      ...cardStyle, padding: 0, overflow: "hidden",
      background: "linear-gradient(135deg, #0d1117 0%, #000F33 100%)",
    }}>
      {/* Phone chrome header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#EC1C24,#c81019)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>
            CD
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Connect Digitals</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Preview — not sent yet</div>
          </div>
        </div>
      </div>

      {/* Message bubble area */}
      <div style={{ padding: "16px 14px", minHeight: 200, display: "flex", flexDirection: "column", gap: 8, background: "#0d1117", backgroundImage: "radial-gradient(ellipse at 30% 20%, rgba(236,28,36,0.04) 0%, transparent 60%)" }}>
        {hasContent ? (
          <>
            {/* ── Message bubble ── */}
            <div style={{
              maxWidth: "85%", borderRadius: "16px 16px 16px 4px",
              overflow: "hidden",
              background: "#1e293b",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}>
              {/* Photo preview */}
              {messageType === "PHOTO" && previewUrl && (
                <img
                  src={previewUrl}
                  alt="Broadcast media"
                  style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
                />
              )}
              {/* Video placeholder */}
              {messageType === "VIDEO" && (
                <div style={{ width: "100%", aspectRatio: "1 / 1", background: "rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <PlayIcon size={20} color="#fff" />
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Video</span>
                </div>
              )}
              {/* Document placeholder */}
              {messageType === "DOCUMENT" && (
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(236,28,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileTextIcon size={18} color={R} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>Document</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>File attached</div>
                  </div>
                </div>
              )}
              {/* Text / caption */}
              {displayText.trim() && (
                <div style={{ padding: "10px 14px", fontSize: 13, color: "#e2e8f0", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {displayText.slice(0, 400)}{displayText.length > 400 ? "…" : ""}
                </div>
              )}
              {/* Timestamp */}
              <div style={{ padding: "2px 14px 8px", fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "right" }}>
                {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* ── Inline keyboard buttons — sit BELOW the bubble, same width ── */}
            {buttons.length > 0 && (
              <div style={{
                maxWidth: "85%",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                {buttons.map((b, i) => (
                  <div
                    key={i}
                    title={b.url}
                    style={{
                      width: "100%",
                      padding: "9px 14px",
                      textAlign: "center",
                      fontSize: 13, fontWeight: 600,
                      color: "#60a5fa",
                      background: "rgba(96,165,250,0.12)",
                      border: "1px solid rgba(96,165,250,0.22)",
                      borderRadius: 10,
                      cursor: "default",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      boxSizing: "border-box",
                      transition: "background 0.12s",
                      letterSpacing: 0.1,
                    }}
                  >
                    {/* Link icon */}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    {b.text}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 160 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SendIcon size={20} color="rgba(255,255,255,0.2)" />
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
              Your message will appear here
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      padding: "8px 14px", borderRadius: 10, background: "var(--cd-gray-50)",
      border: "1px solid var(--cd-gray-200)", minWidth: 72,
    }}>
      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: color ?? NAVY }}>
        {value.toLocaleString()}
      </span>
      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--cd-gray-500)", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </span>
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  COMPLETED: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e", label: "Completed" },
  SENDING:   { bg: "#fffbeb", color: "#92400e", dot: "#f59e0b", label: "Sending…" },
  FAILED:    { bg: "#fff1f2", color: "#be123c", dot: "#f43f5e", label: "Failed" },
  CANCELLED: { bg: "#f8fafc", color: "#475569", dot: "#94a3b8", label: "Cancelled" },
  DRAFT:     { bg: "#f8fafc", color: "#64748b", dot: "#94a3b8", label: "Draft" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES["DRAFT"]!;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

const TYPE_ICON: Record<MessageType, (p: { size: number; color?: string }) => JSX.Element> = {
  TEXT:     ClipboardIcon,
  PHOTO:    ImageIcon,
  VIDEO:    PlayIcon,
  DOCUMENT: FileTextIcon,
};

const TYPE_COLOR: Record<MessageType, string> = {
  TEXT:     "#6366f1",
  PHOTO:    "#0ea5e9",
  VIDEO:    "#8b5cf6",
  DOCUMENT: "#f59e0b",
};

const TYPE_BG: Record<MessageType, string> = {
  TEXT:     "#eef2ff",
  PHOTO:    "#e0f2fe",
  VIDEO:    "#ede9fe",
  DOCUMENT: "#fef3c7",
};

// ── New Broadcast Form ────────────────────────────────────────────────────────

function NewBroadcastForm() {
  const qc = useQueryClient();
  const [messageType, setMessageType] = useState<MessageType>("TEXT");
  const [text, setText]               = useState("");
  const [caption, setCaption]         = useState("");
  const [mediaFileId, setMediaFileId] = useState("");
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [buttons, setButtons]         = useState<BroadcastButton[]>([]);
  const [showBtnForm, setShowBtnForm] = useState(false);
  const [btnText, setBtnText]         = useState("");
  const [btnUrl, setBtnUrl]           = useState("");
  const [feedback, setFeedback]       = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmed, setConfirmed]     = useState(false);

  function selectType(t: MessageType) {
    setMessageType(t);
    setMediaFileId(""); setPreviewUrl(null);
    setCaption(""); setConfirmed(false);
  }

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
      setFeedback({ type: "success", message: `Broadcast sent to ${d.recipientCount.toLocaleString()} users.` });
      setText(""); setCaption(""); setMediaFileId(""); setPreviewUrl(null);
      setButtons([]); setConfirmed(false);
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
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    try { new URL(url); } catch {
      setFeedback({ type: "error", message: `Invalid URL: "${btnUrl}"` });
      return;
    }
    setButtons(prev => [...prev, { text: btnText.trim(), url }]);
    setBtnText(""); setBtnUrl(""); setShowBtnForm(false); setFeedback(null);
  }

  const isValid = messageType === "TEXT" ? text.trim().length > 0 : mediaFileId.trim().length > 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>

      {/* ── Left: form ────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} onDismiss={() => setFeedback(null)} />}

        {/* Type selector */}
        <Section label="Message Type">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {TYPE_OPTIONS.map(opt => {
              const active = messageType === opt.value;
              const Icon = TYPE_ICON[opt.value];
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectType(opt.value)}
                  style={{
                    padding: "12px 8px", borderRadius: 10, cursor: "pointer",
                    textAlign: "center", transition: "all 0.15s",
                    border: `2px solid ${active ? R : "var(--cd-gray-200)"}`,
                    background: active ? "#fff5f5" : "#fafafa",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: active ? "#fee2e2" : TYPE_BG[opt.value],
                  }}>
                    <Icon size={15} color={active ? R : TYPE_COLOR[opt.value]} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? R : NAVY }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Content */}
        <Section label="Content">
          {messageType === "TEXT" ? (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--cd-gray-700)" }}>
                Message <span style={{ color: R }}>*</span>
              </p>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={7}
                placeholder={"Write your message…\n\nHTML supported: <b>bold</b>, <i>italic</i>, <a href='https://…'>link</a>"}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                onFocus={e => (e.target.style.borderColor = R)}
                onBlur={e => (e.target.style.borderColor = "var(--cd-gray-300)")}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "var(--cd-gray-400)" }}>HTML formatting supported</span>
                <span style={{ fontSize: 11, color: text.length > 3800 ? "#dc2626" : "var(--cd-gray-400)" }}>
                  {text.length} / 4096
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <MediaUploader
                messageType={messageType}
                previewUrl={previewUrl}
                onPreviewUrl={setPreviewUrl}
                onUploaded={(fid) => { setMediaFileId(fid); setFeedback(null); }}
                onError={msg => setFeedback({ type: "error", message: msg })}
              />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--cd-gray-700)" }}>
                  Caption <span style={{ color: "var(--cd-gray-400)", fontWeight: 400 }}>(optional)</span>
                </p>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={3}
                  placeholder="Add a caption to display with the media…"
                  style={{ ...inputStyle, resize: "vertical" }}
                  onFocus={e => (e.target.style.borderColor = R)}
                  onBlur={e => (e.target.style.borderColor = "var(--cd-gray-300)")}
                />
                <div style={{ textAlign: "right", marginTop: 4, fontSize: 11, color: caption.length > 900 ? "#dc2626" : "var(--cd-gray-400)" }}>
                  {caption.length} / 1024
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* CTA Buttons */}
        <Section label="CTA Buttons">
          {buttons.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {buttons.map((btn, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", background: "#f8fafc", borderRadius: 8,
                  border: "1px solid var(--cd-gray-200)",
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#60a5fa", flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{btn.text}</div>
                    <div style={{ fontSize: 11, color: "var(--cd-gray-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {btn.url}
                    </div>
                  </div>
                  <button type="button" onClick={() => setButtons(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4, borderRadius: 6, flexShrink: 0 }}>
                    <XIcon size={14} color="#ef4444" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showBtnForm ? (
            <div style={{ padding: 14, background: "#f8fafc", borderRadius: 10, border: "1px solid var(--cd-gray-200)", display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--cd-gray-700)" }}>Button Label <span style={{ color: R }}>*</span></p>
                <input type="text" value={btnText} onChange={e => setBtnText(e.target.value)} placeholder="e.g. Open App" style={inputStyle} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--cd-gray-700)" }}>Button URL <span style={{ color: R }}>*</span></p>
                <input type="url" value={btnUrl} onChange={e => setBtnUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button type="button" variant="primary" size="sm" disabled={!btnText.trim() || !btnUrl.trim()} onClick={addButton}>
                  <CheckIcon size={12} color="#fff" /> Add Button
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowBtnForm(false); setBtnText(""); setBtnUrl(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowBtnForm(true)}
              style={{
                width: "100%", padding: "10px", borderRadius: 8, cursor: "pointer",
                border: "1.5px dashed var(--cd-gray-300)", background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontSize: 13, color: "var(--cd-gray-500)", transition: "all 0.15s",
              }}
            >
              <PlusIcon size={14} color="var(--cd-gray-400)" />
              Add CTA Button
            </button>
          )}
        </Section>

        {/* Confirm & Send */}
        <Section label="Send">
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 1, cursor: "pointer", accentColor: R, flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: "var(--cd-gray-700)", lineHeight: 1.5 }}>
              I have reviewed the message preview and confirm sending it to <strong>all registered Telegram users</strong>.
            </span>
          </label>

          <button
            type="button"
            disabled={!isValid || !confirmed || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
            style={{
              width: "100%", padding: "14px 20px", borderRadius: 10,
              border: "none", cursor: !isValid || !confirmed || sendMutation.isPending ? "not-allowed" : "pointer",
              background: !isValid || !confirmed || sendMutation.isPending
                ? "var(--cd-gray-200)"
                : "linear-gradient(135deg, #EC1C24 0%, #c81019 100%)",
              color: !isValid || !confirmed || sendMutation.isPending ? "var(--cd-gray-500)" : "#fff",
              fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.2s",
              boxShadow: !isValid || !confirmed || sendMutation.isPending ? "none" : "0 4px 14px rgba(236,28,36,0.35)",
            }}
          >
            {sendMutation.isPending ? (
              <>
                <div className="animate-spin" style={{ width: 16, height: 16, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
                Sending to all users…
              </>
            ) : (
              <>
                <SendIcon size={16} color={!isValid || !confirmed ? "var(--cd-gray-500)" : "#fff"} />
                Send Broadcast
              </>
            )}
          </button>
        </Section>
      </div>

      {/* ── Right: live preview ───────────────────────────────── */}
      <div style={{ position: "sticky", top: 20 }}>
        <p style={{ ...sectionLabel, marginBottom: 10 }}>Live Preview</p>
        <TelegramPreview
          messageType={messageType}
          text={text}
          caption={caption}
          previewUrl={previewUrl}
          buttons={buttons}
        />
        <p style={{ fontSize: 11, color: "var(--cd-gray-400)", textAlign: "center", marginTop: 8 }}>
          Telegram renders this in your users' chats
        </p>
      </div>

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
      const sending = query.state.data?.some(b => b.status === "SENDING");
      return sending ? 5000 : false;
    },
  });

  if (isLoading) return <div style={{ padding: 40, textAlign: "center" }}><Spinner /></div>;
  if (isError) return (
    <div style={{ ...cardStyle, textAlign: "center", color: "#dc2626", padding: 32 }}>
      Failed to load history.{" "}
      <button type="button" onClick={() => refetch()} style={{ color: R, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Retry</button>
    </div>
  );
  if (!data || data.length === 0) return (
    <div style={{ ...cardStyle, textAlign: "center", padding: "60px 20px" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--cd-gray-100)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
        <SendIcon size={24} color="var(--cd-gray-400)" />
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 6 }}>No broadcasts yet</p>
      <p style={{ fontSize: 13, color: "var(--cd-gray-500)" }}>Send your first broadcast to reach all users at once.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map(b => {
        const Icon = TYPE_ICON[b.messageType as MessageType] ?? ClipboardIcon;
        const iconColor = TYPE_COLOR[b.messageType as MessageType] ?? NAVY;
        const iconBg    = TYPE_BG[b.messageType as MessageType]    ?? "#f1f5f9";
        const deliveryRate = b.totalRecipients > 0
          ? Math.round((b.sentCount / b.totalRecipients) * 100)
          : null;

        return (
          <div key={b.id} style={{
            ...cardStyle, padding: "18px 20px",
            borderLeft: `4px solid ${STATUS_STYLES[b.status]?.dot ?? "#94a3b8"}`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>

              {/* Icon */}
              <div style={{ width: 40, height: 40, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color={iconColor} />
              </div>

              {/* Main content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14, color: NAVY }}>
                    {b.messageType}
                  </span>
                  <StatusPill status={b.status} />
                  {deliveryRate !== null && b.status === "COMPLETED" && (
                    <span style={{ fontSize: 11, color: "var(--cd-gray-500)", marginLeft: "auto" }}>
                      {deliveryRate}% delivery rate
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginBottom: 14 }}>
                  {formatDateTime(b.createdAt)}
                  {b.completedAt && ` · Completed ${formatDateTime(b.completedAt)}`}
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <StatChip label="Recipients" value={b.totalRecipients} />
                  <StatChip label="Sent"       value={b.sentCount}       color="#15803d" />
                  <StatChip label="Failed"     value={b.failedCount}     color={b.failedCount > 0 ? "#be123c" : undefined} />
                  <StatChip label="Blocked"    value={b.blockedCount}    />
                </div>

                {/* Progress bar for SENDING */}
                {b.status === "SENDING" && b.totalRecipients > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ height: 4, borderRadius: 4, background: "var(--cd-gray-200)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4, background: R,
                        width: `${Math.round(((b.sentCount + b.failedCount) / b.totalRecipients) * 100)}%`,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--cd-gray-500)", marginTop: 4 }}>
                      {b.sentCount + b.failedCount} / {b.totalRecipients} processed
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function BroadcastPage() {
  const [tab, setTab] = useState<"compose" | "history">("compose");

  return (
    <div style={{ padding: 28, flex: 1, minWidth: 0 }} className="animate-fade-in">
      <PageHeader
        title="Broadcast"
        subtitle="Compose and send a Telegram message to all registered users"
      />

      {/* Hero strip */}
      <div style={{
        borderRadius: 14, marginBottom: 24, padding: "16px 22px",
        background: "linear-gradient(135deg, #000F33 0%, #1e1b4b 100%)",
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: "linear-gradient(135deg,#EC1C24,#c81019)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <SendIcon size={22} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 2 }}>
            Send to All Users
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            Messages are delivered via the Telegram bot · Photos render square in Telegram chats
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <UsersIcon size={14} color="rgba(255,255,255,0.5)" />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>All registered users</span>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "var(--cd-gray-100)", padding: 4, borderRadius: 10, width: "fit-content" }}>
        {(["compose", "history"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: "7px 20px", fontSize: 13, fontWeight: 700,
              border: "none", cursor: "pointer", borderRadius: 7,
              fontFamily: "var(--font-heading)",
              transition: "all 0.15s",
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? NAVY : "var(--cd-gray-500)",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {t === "compose" ? "✍️ New Broadcast" : "📋 History"}
          </button>
        ))}
      </div>

      {tab === "compose" ? <NewBroadcastForm /> : <BroadcastHistory />}
    </div>
  );
}
