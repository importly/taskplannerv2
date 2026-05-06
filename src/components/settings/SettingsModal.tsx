import { X, Settings, Calendar } from "lucide-react";
import { TagManager } from "./TagManager";
import { useGoogleCalendarAuth } from "../../db/calendarHooks";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { isConnected, disconnect } = useGoogleCalendarAuth();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", padding: 24 }}
    >
      <div
        className="flex flex-col w-full"
        style={{
          maxWidth: 680,
          maxHeight: "88vh",
          background: "#0a0a0a",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 20,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "20px 28px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center" style={{ gap: 12 }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: "rgba(225,255,0,0.08)",
                color: "#E1FF00",
              }}
            >
              <Settings size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                Settings
              </div>
              <div
                className="font-mono"
                style={{ fontSize: 10, color: "#48484A", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}
              >
                Configure your environment
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.05)", border: "none",
              cursor: "pointer", color: "#8E8E93",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          className="no-scrollbar"
          style={{ flex: 1, overflowY: "auto", padding: "28px 28px 36px" }}
        >
          {/* Google Calendar section */}
          <section style={{ marginBottom: 36 }}>
            <div
              className="font-mono flex items-center"
              style={{
                fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "#8E8E93",
                marginBottom: 14, gap: 6,
              }}
            >
              <Calendar size={12} />
              Google Calendar
            </div>

            <div
              className="flex items-center justify-between"
              style={{
                padding: "16px 18px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
              }}
            >
              <div className="flex items-center" style={{ gap: 12 }}>
                <div
                  style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: isConnected ? "#30D158" : "rgba(255,255,255,0.15)",
                    boxShadow: isConnected ? "0 0 8px rgba(48,209,88,0.5)" : "none",
                  }}
                />
                <span style={{ fontSize: 14, color: isConnected ? "rgba(255,255,255,0.85)" : "#8E8E93" }}>
                  {isConnected ? "Connected to Google Calendar" : "Not connected"}
                </span>
              </div>
              {isConnected && (
                <button
                  onClick={() => disconnect()}
                  className="font-mono"
                  style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                    textTransform: "uppercase", color: "#FF3B30",
                    background: "transparent", border: "none", cursor: "pointer",
                  }}
                >
                  Disconnect
                </button>
              )}
            </div>
          </section>

          {/* Tag Manager */}
          <TagManager />
        </div>

        {/* Footer */}
        <div
          className="flex justify-end"
          style={{
            padding: "16px 28px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 20, padding: "8px 22px",
              cursor: "pointer", transition: "all 150ms",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
