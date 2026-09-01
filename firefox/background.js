const IP_API = 'https://api.ipify.org?format=json';

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
    // VPN was up, now dropped — trigger alert
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
    // Still disconnected after a drop — keep red until VPN comes back
    setIcon('red', '!');
    await browser.storage.local.set({ status: 'vpn-dropped' });
  } else {
    // Not on VPN, never was — just gray, no alarm
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

browser.alarms.create('poll', { periodInMinutes: 1 });

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'poll') return;
  const { intervalMinutes, lastCheck } = await browser.storage.local.get({
    intervalMinutes: 5,
    lastCheck: 0,
  });
  const elapsed = (Date.now() - lastCheck) / 1000 / 60;
  if (elapsed >= intervalMinutes) {
    await checkIP();
  }
});

browser.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'checkNow') await checkIP();
});

browser.runtime.onInstalled.addListener(() => checkIP());
browser.runtime.onStartup.addListener(() => checkIP());
