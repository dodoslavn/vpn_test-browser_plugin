const $ = (id) => document.getElementById(id);

function timeAgo(ts) {
  if (!ts) return 'Never checked';
  const sec = Math.round((Date.now() - ts) / 1000);
  if (sec < 5)  return 'Just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.round(min / 60)}h ago`;
}

async function render() {
  const data = await chrome.storage.local.get({
    currentIP: null,
    vpnIP: null,
    status: 'unset',
    intervalMinutes: 5,
    lastCheck: 0,
    lastError: null,
  });

  $('currentIP').textContent = data.currentIP || '—';
  $('vpnIP').value = data.vpnIP || '';

  const sel = $('interval');
  for (const opt of sel.options) {
    if (parseInt(opt.value) === data.intervalMinutes) opt.selected = true;
  }

  const dot = $('statusDot');
  const bar = $('statusBar');
  const txt = $('statusText');

  dot.className = 'dot';
  bar.className = 'status-bar';
  bar.classList.remove('hidden');

  if (data.lastError) {
    dot.classList.add('dot-gray');
    bar.classList.add('status-neutral');
    txt.textContent = `Error: ${data.lastError}`;
  } else {
    switch (data.status) {
      case 'on-vpn':
        dot.classList.add('dot-green');
        bar.classList.add('status-ok');
        txt.textContent = 'VPN connected — IP matches.';
        break;
      case 'vpn-dropped':
        dot.classList.add('dot-red');
        bar.classList.add('status-alert');
        txt.textContent = `VPN dropped! Current IP: ${data.currentIP || '?'}`;
        break;
      case 'not-on-vpn':
        dot.classList.add('dot-gray');
        bar.classList.add('status-neutral');
        txt.textContent = `Not on VPN — IP: ${data.currentIP || '?'}`;
        break;
      default:
        dot.classList.add('dot-gray');
        bar.classList.add('status-neutral');
        txt.textContent = 'Set your VPN IP to start watching.';
    }
  }

  $('lastCheck').textContent = timeAgo(data.lastCheck);
}

async function saveVpnIP(ip) {
  const trimmed = ip.trim();
  await chrome.storage.local.set({
    vpnIP: trimmed || null,
    wasOnVPN: false,
    vpnDropped: false,
    lastNotifiedIP: null,
    status: trimmed ? 'not-on-vpn' : 'unset',
  });
}

$('btnSave').addEventListener('click', async () => {
  await saveVpnIP($('vpnIP').value);
  await chrome.storage.local.set({ lastCheck: 0 });
  chrome.runtime.sendMessage({ type: 'checkNow' });
  setTimeout(render, 1000);
});

$('btnUseAsCurrent').addEventListener('click', async () => {
  const { currentIP } = await chrome.storage.local.get({ currentIP: null });
  if (!currentIP) return;
  $('vpnIP').value = currentIP;
  await saveVpnIP(currentIP);
  await chrome.storage.local.set({ lastCheck: 0 });
  chrome.runtime.sendMessage({ type: 'checkNow' });
  setTimeout(render, 1000);
});

$('btnClear').addEventListener('click', async () => {
  $('vpnIP').value = '';
  await saveVpnIP('');
  await render();
});

$('btnCheck').addEventListener('click', async () => {
  $('btnCheck').textContent = '...';
  $('btnCheck').disabled = true;
  await chrome.storage.local.set({ lastCheck: 0 });
  chrome.runtime.sendMessage({ type: 'checkNow' });
  setTimeout(async () => {
    await render();
    $('btnCheck').textContent = 'Check now';
    $('btnCheck').disabled = false;
  }, 1500);
});

$('interval').addEventListener('change', async (e) => {
  await chrome.storage.local.set({ intervalMinutes: parseInt(e.target.value) });
});

render();
setInterval(async () => {
  const { lastCheck } = await chrome.storage.local.get({ lastCheck: 0 });
  $('lastCheck').textContent = timeAgo(lastCheck);
}, 10000);
