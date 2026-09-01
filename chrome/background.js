const IP_API = 'https://api.ipify.org?format=json';

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

  const result = await chrome.storage.local.get({
    vpnIP: null,
    wasOnVPN: false,
    vpnDropped: false,
    lastNotifiedIP: null,
  });
  const { vpnIP, wasOnVPN, vpnDropped, lastNotifiedIP } = result;

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

chrome.alarms.create('poll', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'poll') return;
  const { intervalMinutes, lastCheck } = await chrome.storage.local.get({
    intervalMinutes: 5,
    lastCheck: 0,
  });
  const elapsed = (Date.now() - lastCheck) / 1000 / 60;
  if (elapsed >= intervalMinutes) {
    await checkIP();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'checkNow') {
    checkIP().then(() => sendResponse({ done: true }));
    return true; // keep channel open for async response
  }
});

chrome.runtime.onInstalled.addListener(() => checkIP());
chrome.runtime.onStartup.addListener(() => checkIP());
