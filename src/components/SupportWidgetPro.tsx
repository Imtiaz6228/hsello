import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles, UserRoundCheck, ShieldCheck } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Message = {
  id: string;
  role: "user" | "assistant" | "admin";
  body: string;
  quickActions?: string[];
};

export function SupportWidgetPro() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [humanMode, setHumanMode] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open || !user || sessionId) return;
    void apiRequest<{ sessions: Array<{ id: string; status: string; messages: Message[] }> }>("/api/nexus/chat/sessions")
      .then((data) => {
        const latest = data.sessions[0];
        if (!latest) return;
        setSessionId(latest.id);
        setHumanMode(latest.status === "HUMAN");
        setMessages(latest.messages);
      })
      .catch(() => undefined);
  }, [open, sessionId, user]);

  useEffect(() => {
    if (!open || !humanMode || !sessionId) return;
    const refresh = async () => {
      const data = await apiRequest<{ sessions: Array<{ id: string; messages: Array<{ id: string; role: "user" | "assistant" | "admin"; body: string }> }> }>("/api/nexus/chat/sessions").catch(() => null);
      const session = data?.sessions.find((item) => item.id === sessionId);
      if (session) setMessages(session.messages.map((item) => ({ id: item.id, role: item.role, body: item.body })));
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [humanMode, open, sessionId]);

  const debouncedTyping = useCallback((isTyping: boolean) => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (sessionId) {
        void apiRequest("/api/nexus/live/typing", { method: "POST", body: { sessionId, isTyping } }).catch(() => undefined);
      }
    }, 300);
  }, [sessionId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", body: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(!humanMode && Boolean(user));
    debouncedTyping(true);

    if (!user) {
      const normalized = text.toLowerCase();
      const reply = normalized.includes("sell")
        ? "Create an account, verify your email, then submit a seller application. Approved sellers can publish products from Seller Studio."
        : normalized.includes("protect") || normalized.includes("refund")
          ? "Payments, delivery records, order chat, dispute windows, and admin review protect marketplace purchases. Sign in for help with a specific order."
          : "Browse the catalog, review the seller and delivery terms, add a product to cart, then sign in to complete protected checkout.";
      window.setTimeout(() => {
        setMessages((prev) => [...prev, { id: `${Date.now()}-guest`, role: "assistant", body: reply, quickActions: ["How buying works", "How to sell", "Buyer protection"] }]);
        setTyping(false);
      }, 350);
      return;
    }

    try {
      if (humanMode && sessionId) {
        await apiRequest(`/api/nexus/chat/${sessionId}/messages`, { method: "POST", body: { body: text } });
      } else {
        const result = await apiRequest<{ sessionId: string; reply: string; quickActions: string[] }>("/api/nexus/ai/support", {
          method: "POST",
          body: { message: text, sessionId: sessionId ?? undefined },
        });
        setSessionId(result.sessionId);
        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", body: result.reply, quickActions: result.quickActions };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        body: !user ? "I can help with buying, selling, payments, downloads and buyer protection. Sign in for secure order lookups, tickets, or a live admin." : "Support is reconnecting. Please try once more, or open My Tickets from your dashboard.",
        quickActions: !user ? ["How buying works", "How to sell", "Buyer protection"] : ["Open my tickets"],
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setTyping(false);
      debouncedTyping(false);
    }
  }, [sessionId, debouncedTyping, user, humanMode]);

  const requestHuman = useCallback(async () => {
    if (!user) { setHandoffMessage("Sign in to start a secure chat with an administrator."); return; }
    try {
      const result = await apiRequest<{ sessionId: string; message: string }>("/api/nexus/chat/human", { method: "POST", body: { sessionId: sessionId ?? undefined } });
      setSessionId(result.sessionId);
      setHumanMode(true);
      setHandoffMessage("An administrator has been notified. Messages will appear here in real time.");
    } catch { setHandoffMessage("Admin handoff could not start. Please try again."); }
  }, [sessionId, user]);

  const handleQuickAction = useCallback((action: string) => {
    void sendMessage(action);
  }, [sendMessage]);

  if (!open) {
    return (
      <button
        className="support-widget-fab support-fab-polished"
        onClick={() => setOpen(true)}
        aria-label="Open support chat"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#7c3aed",
          color: "white",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <MessageCircle size={24} />
        <span style={{ position: "absolute", top: "-2px", right: "-2px", background: "#ef4444", borderRadius: "50%", width: "12px", height: "12px" }} />
      </button>
    );
  }

  return (
    <div
      className="support-widget-pro"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "380px",
        maxHeight: "600px",
        background: "#0A0A0B",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        zIndex: 9999,
        border: "1px solid #27272a",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px", background: "#18181b", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={18} color="#7c3aed" />
          <div>
            <strong style={{ color: "#fafafa", fontSize: "14px" }}>{humanMode ? "Admin conversation" : "HSello Support"}</strong>
            <div style={{ fontSize: "11px", color: "#34d399" }}>● {humanMode ? "Secure human support" : "Online · AI + human admins"}</div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer" }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px" }}>
        <button className="admin-handoff-button" onClick={() => void requestHuman()} disabled={humanMode}><UserRoundCheck size={16} /> {humanMode ? "Admin chat active" : "Chat with admin"}</button>
        {handoffMessage ? <div className="admin-handoff-note">{handoffMessage}</div> : null}
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#71717a", fontSize: "13px", padding: "20px" }}>
            <Sparkles size={32} style={{ margin: "0 auto 8px", display: "block" }} color="#7c3aed" />
            <strong style={{ display: "block", color: "#fafafa", fontSize: "18px", marginBottom: "8px" }}>How can we help?</strong> Ask about buying, selling, delivery, payments or buyer protection. Sign in for secure order help.
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: "12px",
                fontSize: "13px",
                lineHeight: "1.5",
                background: msg.role === "user" ? "#7c3aed" : msg.role === "admin" ? "#0f766e" : "#27272a",
                color: "#fafafa",
              }}
            >
              {msg.body}
            </div>
            {msg.quickActions && msg.quickActions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "85%" }}>
                {msg.quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "8px",
                      border: "1px solid #3f3f46",
                      background: "#18181b",
                      color: "#a1a1aa",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", gap: "4px", padding: "8px" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#71717a",
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: "12px", background: "#18181b", borderTop: "1px solid #27272a", display: "flex", gap: "8px", alignItems: "center" }}>
        <ShieldCheck size={17} color="#34d399" aria-hidden="true" />
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            debouncedTyping(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void sendMessage(input);
          }}
          placeholder={user ? "Write a message…" : "Ask about HSello…"}
          style={{
            flex: 1,
            background: "#0A0A0B",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            padding: "8px 12px",
            color: "#fafafa",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <button
          onClick={() => void sendMessage(input)}
          style={{ background: "#7c3aed", border: "none", color: "white", borderRadius: "8px", padding: "8px", cursor: "pointer" }}
        >
          <Send size={16} />
        </button>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
