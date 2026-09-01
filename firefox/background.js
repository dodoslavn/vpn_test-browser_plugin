const IP_API = 'https://api.ipify.org?format=json';

let pollInterval = null;

async function checkIP() {
  let currentIP;

  try {
    const response = await fetch(IP_API);
    const data = await response.json();
    currentIP = data.ip;
  } catch (e) {
    await browser.storage.local.set({ lastCheck: Date.now(), lastError: 'Network error' });
    return;
  }

  const { vpnIP, wasOnVPN, vpnDropped, lastNotifiedIP } = await browser.storage.local.get({
    vpnIP: null,
    wasOnVPN: false,
    vpnDropped: false,
    lastNotifiedIP: null,
  });

  await browser.storage.local.set({ currentIP, lastCheck: Date.now(), lastError: null });

  if (!vpnIP) {
    setIcon('gray', '');
    await browser.storage.local.set({ status: 'unset' });
    return;
  }

  const onVPN = currentIP === vpnIP;

  if (onVPN) {
    setIcon('green', '');
    await browser.storage.local.set({ status: 'on-vpn', wasOnVPN: true, vpnDropped: false });
  } else if (wasOnVPN) {
    setIcon('red', '!');
    await browser.storage.local.set({ status: 'vpn-dropped', wasOnVPN: false, vpnDropped: true });
    if (lastNotifiedIP !== currentIP) {
      await browser.storage.local.set({ lastNotifiedIP: currentIP });
      browser.notifications.create('vpn-alert', {
        type: 'basic',
        iconUrl: 'icons/icon-red.svg',
        title: 'VPN IP Watcher — VPN Dropped!',
        message: `VPN disconnected! Your IP is now ${currentIP}.`,
      });
    }
  } else if (vpnDropped) {
    setIcon('red', '!');
    await browser.storage.local.set({ status: 'vpn-dropped' });
  } else {
    setIcon('gray', '');
    await browser.storage.local.set({ status: 'not-on-vpn' });
  }
}

function setIcon(color, badge) {
  browser.browserAction.setIcon({ path: { 48: `icons/icon-${color}.svg` } });
  browser.browserAction.setBadgeText({ text: badge });
  if (badge) {
    browser.browserAction.setBadgeBackgroundColor({ color: '#dc3545' });
  }
}

async function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  const { intervalSeconds } = await browser.storage.local.get({ intervalSeconds: 5 });
  pollInterval = setInterval(checkIP, intervalSeconds * 1000);
}

browser.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'checkNow') await checkIP();
  if (msg.type === 'intervalChanged') await startPolling();
});

browser.runtime.onInstalled.addListener(async () => {
  await startPolling();
  await checkIP();
});

startPolling();
checkIP();
