import { CONFIG } from './config.js?v=1.1.4';
import { serializeCsv, normalizeStatus } from './csv.js?v=1.1.4';

function loadRaw() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKeys.localPlaces);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRaw(places) {
  localStorage.setItem(CONFIG.storageKeys.localPlaces, JSON.stringify(places));
}

export function getLocalPlaces() {
  return loadRaw().map((place) => ({
    ...place,
    status: normalizeStatus(place.status),
  }));
}

export function addLocalPlace(place) {
  const places = loadRaw();
  places.push(place);
  saveRaw(places);
  return place;
}

export function clearLocalPlaces() {
  localStorage.removeItem(CONFIG.storageKeys.localPlaces);
}

export async function exportCsvFile(places, filename) {
  const csv = serializeCsv(places, CONFIG.csvColumns);
  const name = filename || CONFIG.defaultCsvFilename;
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const file = new File([blob], name, { type: 'text/csv' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      // Bez title — iOS jinak ukládá extra .txt soubor s názvem souboru.
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Export zrušen.');
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
