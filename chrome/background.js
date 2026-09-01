const IP_API = 'https://api.ipify.org?format=json';

let pollInterval = null;

async function checkIP() {
  let currentIP;

  try {
    const response = await fetch(IP_API);
    const data = await response.json();
    currentIP = data.ip;
  } catch (e) {
    await chrome.storage.local.set({ lastCheck: Date.now(), lastError: 'Network error' });
    return;
  }

  const { vpnIP, wasOnVPN, vpnDropped, lastNotifiedIP } = await chrome.storage.local.get({
    vpnIP: null,
    wasOnVPN: false,
    vpnDropped: false,
    lastNotifiedIP: null,
  });

  await chrome.storage.local.set({ currentIP, lastCheck: Date.now(), lastError: null });

  if (!vpnIP) {
    setIcon('gray', '');
    await chrome.storage.local.set({ status: 'unset' });
    return;
  }

  const onVPN = currentIP === vpnIP;

  if (onVPN) {
    setIcon('green', '');
    await chrome.storage.local.set({ status: 'on-vpn', wasOnVPN: true, vpnDropped: false });
  } else if (wasOnVPN) {
    setIcon('red', '!');
    await chrome.storage.local.set({ status: 'vpn-dropped', wasOnVPN: false, vpnDropped: true });
    if (lastNotifiedIP !== currentIP) {
      await chrome.storage.local.set({ lastNotifiedIP: currentIP });
      chrome.notifications.create('vpn-alert', {
        type: 'basic',
        iconUrl: 'icons/icon-red.svg',
        title: 'VPN IP Watcher — VPN Dropped!',
        message: `VPN disconnected! Your IP is now ${currentIP}.`,
      });
    }
  } else if (vpnDropped) {
    setIcon('red', '!');
    await chrome.storage.local.set({ status: 'vpn-dropped' });
  } else {
    setIcon('gray', '');
    await chrome.storage.local.set({ status: 'not-on-vpn' });
  }
}

function setIcon(color, badge) {
  chrome.action.setIcon({ path: { 48: `icons/icon-${color}.svg` } });
  chrome.action.setBadgeText({ text: badge });
  if (badge) {
    chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
  }
}

async function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  const { intervalSeconds } = await chrome.storage.local.get({ intervalSeconds: 5 });
  pollInterval = setInterval(checkIP, intervalSeconds * 1000);
}

// Keepalive alarm — Chrome service workers sleep when idle.
// This wakes the SW every 25 seconds and restarts the setInterval chain.
chrome.alarms.create('keepalive', { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') startPolling();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'checkNow') {
    checkIP().then(() => sendResponse({ done: true }));
    return true;
  }
  if (msg.type === 'intervalChanged') {
    startPolling();
    sendResponse({ done: true });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  await startPolling();
  await checkIP();
});

startPolling();
checkIP();
