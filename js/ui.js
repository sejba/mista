import {
  startPickMode,
  stopPickMode,
  setPickMarker,
  getCurrentPosition,
  invalidateSize,
} from './map.js';
import { CONFIG } from './config.js';

let toastTimer = null;

export function showToast(message, isError = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3000);
}

export function showLoading(show) {
  const el = document.getElementById('loading');
  if (el) el.classList.toggle('hidden', !show);
}

function openSheet(id) {
  const sheet = document.getElementById(id);
  const backdrop = document.getElementById('sheet-backdrop');
  if (sheet) sheet.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
  invalidateSize();
}

function closeAllSheets() {
  document.querySelectorAll('.bottom-sheet').forEach((s) => s.classList.remove('open'));
  const backdrop = document.getElementById('sheet-backdrop');
  if (backdrop) backdrop.classList.remove('open');
  stopPickMode();
  invalidateSize();
}

export function initSheetHandlers() {
  document.getElementById('sheet-backdrop')?.addEventListener('click', closeAllSheets);
  document.querySelectorAll('[data-close-sheet]').forEach((btn) => {
    btn.addEventListener('click', closeAllSheets);
  });
}

export function showDetail(place) {
  const title = document.getElementById('detail-title');
  const note = document.getElementById('detail-note');
  const tagsEl = document.getElementById('detail-tags');
  const statusEl = document.getElementById('detail-status');
  const navBtn = document.getElementById('detail-navigate');

  if (title) title.textContent = place.name;
  if (note) note.textContent = place.note || '—';
  if (statusEl) statusEl.textContent = place.status || '—';

  if (tagsEl) {
    tagsEl.innerHTML = '';
    if (place.tags.length) {
      place.tags.forEach((t) => {
        const span = document.createElement('span');
        span.className = 'tag-chip';
        span.textContent = t;
        tagsEl.appendChild(span);
      });
    } else {
      tagsEl.textContent = '—';
    }
  }

  if (navBtn) {
    navBtn.onclick = () => {
      const apple = `https://maps.apple.com/?daddr=${place.lat},${place.lng}`;
      window.open(apple, '_blank');
    };
  }

  openSheet('detail-sheet');
}

export function showSettings(settings, handlers) {
  const { localCount, onSave, onRefresh, onExport, onClearLocal } = handlers;
  const form = document.getElementById('settings-form');
  if (!form) return;

  form.csvDirectUrl.value = settings.csvDirectUrl;
  form.csvFilename.value = settings.csvFilename;
  form.mapyApiKey.value = settings.mapyApiKey;

  const infoEl = document.getElementById('local-places-info');
  if (infoEl) {
    if (localCount > 0) {
      infoEl.textContent = `${localCount} lokální místa čekají na export do pCloud.`;
    } else {
      infoEl.textContent = 'Nová místa se ukládají lokálně. Exportujte CSV a nahrajte do pCloud ručně.';
    }
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    onSave(getSettingsFromForm(form));
    closeAllSheets();
    showToast('Nastavení uloženo');
  };

  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    onExport();
  }, { once: true });

  document.getElementById('btn-clear-local')?.addEventListener('click', () => {
    onClearLocal();
  }, { once: true });

  document.getElementById('btn-refresh-csv')?.addEventListener('click', () => {
    onRefresh();
  }, { once: true });

  openSheet('settings-sheet');
}

function getSettingsFromForm(form) {
  return {
    csvDirectUrl: form.csvDirectUrl.value.trim(),
    csvFilename: form.csvFilename.value.trim() || CONFIG.defaultCsvFilename,
    mapyApiKey: form.mapyApiKey.value.trim(),
  };
}

export function showAddForm(statuses, onSave) {
  const form = document.getElementById('add-form');
  if (!form) return;

  form.reset();
  const statusSelect = form.status;
  statusSelect.innerHTML = '';
  statuses.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    statusSelect.appendChild(opt);
  });

  const gpsDisplay = document.getElementById('add-gps-display');
  let pickedCoords = null;

  const updateGpsDisplay = (coords) => {
    pickedCoords = coords;
    if (gpsDisplay) {
      gpsDisplay.textContent = coords
        ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
        : 'Nevybráno';
    }
  };

  document.getElementById('btn-use-location')?.addEventListener('click', async () => {
    try {
      const coords = await getCurrentPosition();
      updateGpsDisplay(coords);
      setPickMarker(coords.lat, coords.lng);
      stopPickMode();
    } catch (err) {
      showToast(err.message, true);
    }
  }, { once: true });

  document.getElementById('btn-pick-map')?.addEventListener('click', () => {
    startPickMode((coords) => updateGpsDisplay(coords));
    showToast('Klepněte na mapu pro výběr bodu');
  }, { once: true });

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!form.name.value.trim()) {
      showToast('Zadejte název místa', true);
      return;
    }
    if (!pickedCoords) {
      showToast('Vyberte GPS polohu', true);
      return;
    }

    const tags = form.tags.value
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const place = {
      name: form.name.value.trim(),
      note: form.note.value.trim(),
      tags,
      status: form.status.value,
      lat: pickedCoords.lat,
      lng: pickedCoords.lng,
    };

    try {
      onSave(place);
      closeAllSheets();
      showToast('Místo uloženo lokálně');
    } catch (err) {
      showToast(err.message, true);
    }
  };

  openSheet('add-sheet');
}

export function initHeaderButtons(onSettings) {
  document.getElementById('btn-settings')?.addEventListener('click', onSettings);
  document.getElementById('btn-add')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('mista:add'));
  });
}

export { closeAllSheets };
