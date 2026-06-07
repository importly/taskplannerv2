import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import QRCode from "qrcode";
import { Copy, Check, RefreshCw } from "lucide-react";

// Read-only mirror of the timer for phones on the same Wi-Fi. The Rust
// backend exposes an HTTP+WS server on the LAN (see src-tauri/src/phone_view.rs).
// Single-user, no auth — the server only accepts connections from the local
// network and the user controls that network.
const QR_SIZE = 128;

interface PhoneViewUrl {
  interfaceName: string;
  url: string;
  primary: boolean;
}

interface PhoneViewPayload {
  urls: PhoneViewUrl[];
  error: string | null;
}

export const PhoneViewPanel = () => {
  const [urls, setUrls] = useState<PhoneViewUrl[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadUrls = async (cancelled?: () => boolean) => {
    setRefreshing(true);
    try {
      const payload = await invoke<PhoneViewPayload>("get_phone_view_urls");
      if (cancelled?.()) return;

      const nextUrls = payload.urls ?? [];
      setUrls(nextUrls);
      setSelectedUrl((current) => {
        if (current && nextUrls.some((candidate) => candidate.url === current)) return current;
        return nextUrls.find((candidate) => candidate.primary)?.url ?? nextUrls[0]?.url ?? null;
      });
      setError(payload.error ?? null);
    } catch (e) {
      if (cancelled?.()) return;
      setUrls([]);
      setSelectedUrl(null);
      setError(String(e));
    } finally {
      if (!cancelled?.()) setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadUrls(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, selectedUrl, {
      width: QR_SIZE,
      margin: 1,
      color: { dark: "#FFFFFF", light: "#00000000" },
      errorCorrectionLevel: "M",
    }).catch(() => {
      /* QR errors are non-fatal — the user can still copy the URL. */
    });
  }, [selectedUrl]);

  const handleCopy = async () => {
    if (!selectedUrl) return;
    try {
      await navigator.clipboard.writeText(selectedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard may be unavailable — silently ignore */
    }
  };

  return (
    <section>
      {/* Section header — matches TagManager style */}
      <h3
        className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]"
        style={{ marginBottom: 16 }}
      >
        Phone View
      </h3>

      <div
        className="rounded-xl border border-white/5"
        style={{
          background: "rgba(255,255,255,0.02)",
          padding: 20,
          display: "flex",
          gap: 20,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* QR */}
        <div
          style={{
            width: QR_SIZE,
            height: QR_SIZE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#000",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            flexShrink: 0,
          }}
        >
          {selectedUrl ? (
            <canvas ref={canvasRef} width={QR_SIZE} height={QR_SIZE} />
          ) : (
            <div
              style={{
                fontSize: 9,
                color: "#48484A",
                letterSpacing: "0.15em",
                textAlign: "center",
                padding: 8,
              }}
            >
              {error ? "UNAVAILABLE" : "LOADING..."}
            </div>
          )}
        </div>

        {/* URL + copy + helper text, vertically centered */}
        <div
          style={{
            flex: 1,
            minWidth: 220,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {selectedUrl ? (
            <div
              style={{
                fontSize: 11,
                color: "#fff",
                background: "#000",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 999,
                padding: "6px 12px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={selectedUrl}
            >
              {selectedUrl}
            </div>
          ) : (
            <div
              style={{
                fontSize: 11,
                color: "#FF3B30",
                background: "rgba(255,59,48,0.08)",
                border: "1px solid rgba(255,59,48,0.20)",
                borderRadius: 999,
                padding: "6px 12px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {error || "Detecting network..."}
            </div>
          )}

          <div className="flex items-center" style={{ gap: 10 }}>
            <button
              onClick={handleCopy}
              disabled={!selectedUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                color: selectedUrl ? "#fff" : "rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 999,
                padding: "5px 12px",
                cursor: selectedUrl ? "pointer" : "not-allowed",
                transition: "all 150ms",
                flexShrink: 0,
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy URL"}
            </button>
            <button
              onClick={() => loadUrls()}
              disabled={refreshing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                color: "rgba(255,255,255,0.45)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 999,
                cursor: refreshing ? "wait" : "pointer",
                transition: "all 150ms",
              }}
              title="Refresh network URLs"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {urls.length > 1 && (
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {urls.map((candidate) => {
                const isSelected = candidate.url === selectedUrl;
                return (
                  <button
                    key={candidate.url}
                    onClick={() => setSelectedUrl(candidate.url)}
                    title={candidate.url}
                    style={{
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      padding: "4px 9px",
                      borderRadius: 999,
                      border: isSelected ? "1px solid rgba(225,255,0,0.28)" : "1px solid rgba(255,255,255,0.08)",
                      background: isSelected ? "rgba(225,255,0,0.10)" : "rgba(255,255,255,0.04)",
                      color: isSelected ? "#E1FF00" : "rgba(255,255,255,0.45)",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {candidate.interfaceName}
                  </button>
                );
              })}
            </div>
          )}

          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.5,
            }}
          >
            Scan with your phone on the same network. If you have Wi-Fi, Ethernet, or VPN active, pick the matching network URL.
          </div>
        </div>
      </div>
    </section>
  );
};
