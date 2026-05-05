import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { exchangeCodeForToken } from "./services/googleAuth";

// Listen for deep links
onOpenUrl((urls) => {
  console.log("Deep link received:", urls);
  for (const url of urls) {
    if (url.startsWith("accountability://oauth/callback")) {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get("code");
      if (code) {
        exchangeCodeForToken(code)
          .then(() => {
            console.log("Successfully exchanged Google OAuth code for token");
            // You might want to emit an event or update state here if needed
          })
          .catch((err) => {
            console.error("Failed to exchange Google OAuth code:", err);
          });
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
