# VPN IP Watcher — Browser Plugin

A browser extension that monitors your external IP and alerts you when your VPN connection drops.

> **This project is completely vibe-coded** — written by an AI coding agent
> from natural-language instructions, with human review and testing but no
> hand-written code. Read it before you trust it with a production host.

## How it works

- **Gray shield** — not connected to VPN, or VPN IP not configured yet
- **Green shield** — VPN is connected, your IP matches the configured VPN IP
- **Red shield + notification** — VPN was connected but IP changed (VPN dropped)

The alert only fires on the transition from VPN → no VPN. If you open your browser without VPN, it stays gray silently. Red only appears if you were green first.

---

## Installation

### Firefox

1. Open Firefox and go to `about:debugging`
2. Click **This Firefox** in the left sidebar
3. Click **Load Temporary Add-on...**
4. Navigate to the `firefox/` folder and select `manifest.json`
5. The shield icon appears in your toolbar

> **Note:** Temporary add-ons are removed when Firefox closes. For permanent installation, the extension must be signed via [addons.mozilla.org](https://addons.mozilla.org), or you can disable signature enforcement in Firefox Developer Edition via `about:config` → set `xpinstall.signatures.required` to `false`.

### Chrome / Chromium / Edge

1. Open your browser and go to `chrome://extensions` (or `edge://extensions` for Edge)
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Navigate to and select the `chrome/` folder
5. The shield icon appears in your toolbar (pin it via the puzzle icon if needed)

---

## Setup & Usage

1. **Connect to your VPN**
2. Click the shield icon in the toolbar to open the popup
3. Your current external IP is shown at the top
4. Click **"Use as VPN IP"** to save your VPN's IP as the expected address
5. The shield turns **green** — monitoring is now active

From this point on, the extension checks your IP at the configured interval. If your VPN drops and your real IP leaks through, the shield turns **red** and a desktop notification fires.

### Popup controls

| Control | Description |
|---|---|
| **Use as VPN IP** | Saves the currently detected IP as your VPN IP |
| **VPN IP field** | Manually enter or edit the expected VPN IP |
| **Save** | Apply a manually entered IP |
| **Clear** | Remove the configured IP and disable watching |
| **Check interval** | How often to poll (1 / 5 / 10 / 30 minutes) |
| **Check now** | Force an immediate IP check |

### Resetting after a VPN drop

Once the shield goes red, it stays red until your VPN reconnects and the IP matches again. Simply reconnect your VPN — the next check will turn it green automatically.

---

## Privacy

Your IP is checked against [api.ipify.org](https://www.ipify.org/) — a minimal, open-source public IP lookup service. No other data is collected or sent anywhere. Everything else is stored locally in the browser.
