import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { initDb } from "./db";
import { exchangeMsCodeForToken } from "./services/msalAuth";

async function handleDeepLinkUrls(urls: string[], closeAfter = false) {
  for (const url of urls) {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get("code");
    if (!code) continue;

    if (url.startsWith("accountability://ms-callback")) {
      try {
        await initDb();
        await exchangeMsCodeForToken(code);
        await emit("ms-auth-complete");
        if (closeAfter) invoke("close_window").catch(() => {});
      } catch (e) {
        console.error("MS OAuth callback failed:", e);
      }
    }
  }
}

getCurrent().then((urls) => {
  if (urls) handleDeepLinkUrls(urls, true);
}).catch(console.error);

onOpenUrl((urls) => handleDeepLinkUrls(urls, false)).catch(console.error);

listen<string>("deep-link-received", (event) => {
  handleDeepLinkUrls([event.payload], false);
}).catch(console.error);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
