const button = document.getElementById('enable') as HTMLButtonElement | null;
const status = document.getElementById('status');

const ORIGINS = ['<all_urls>'];

async function refresh() {
  const granted = await browser.permissions.contains({ origins: ORIGINS });
  if (!status || !button) return;

  if (granted) {
    status.textContent = 'Access granted. Open x.com and the save buttons will be there.';
    button.disabled = true;
    button.textContent = 'Access granted';
  }
}

button?.addEventListener('click', async () => {
  const granted = await browser.permissions.request({ origins: ORIGINS });
  if (granted) {
    await refresh();
  } else if (status) {
    status.textContent = 'Access was not granted. MediaGrab cannot run until it is.';
    status.style.color = '#f43f5e';
  }
});

refresh();
