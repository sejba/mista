import { CONFIG } from './config.js';
import {
  parseCsv,
  serializeCsv,
  extractUniqueTags,
  extractUniqueStatuses,
} from './csv.js';
import {
  getSettings,
  saveSettings,
  parseOAuthHash,
  startOAuth,
  disconnectPcloud,
  fetchCsvFromDirectLink,
  uploadCsv,
} from './pcloud.js';
import { initMap, setPlaces, locateUser, updateTileLayer } from './map.js';
import {
  initFilters,
  filterPlaces,
  renderFilters,
  resetFilters,
} from './filters.js';
import {
  initSheetHandlers,
  initHeaderButtons,
  showDetail,
  showSettings,
  showAddForm,
  showToast,
  showLoading,
} from './ui.js';

let allPlaces = [];

async function loadData() {
  const settings = getSettings();
  showLoading(true);
  try {
    const text = await fetchCsvFromDirectLink(settings.csvDirectUrl);
    allPlaces = parseCsv(text);
    refreshUi();
    showToast(`Načteno ${allPlaces.length} míst`);
  } catch (err) {
    showToast(err.message, true);
    if (allPlaces.length === 0) allPlaces = [];
    refreshUi();
  } finally {
    showLoading(false);
  }
}

function refreshUi() {
  const tags = extractUniqueTags(allPlaces);
  const statuses = extractUniqueStatuses(allPlaces, CONFIG.statusDefaults);
  renderFilters(tags, statuses);

  const filtered = filterPlaces(allPlaces);
  setPlaces(filtered, showDetail);
}

async function saveNewPlace(place) {
  const settings = getSettings();
  const newPlace = {
    ...place,
    id: `place-${Date.now()}`,
  };
  allPlaces.push(newPlace);

  const csv = serializeCsv(allPlaces, CONFIG.csvColumns);
  await uploadCsv(csv, { ...settings, accessToken: getSettings().accessToken });
  refreshUi();
}

function openSettings() {
  const settings = getSettings();
  showSettings(
    settings,
    (updated) => {
      const merged = { ...settings, ...updated };
      saveSettings(merged);
      updateTileLayer(merged.mapyApiKey);
      loadData();
    },
    (clientId) => {
      saveSettings({ ...settings, clientId });
      startOAuth(clientId);
    },
    () => {
      disconnectPcloud();
      showToast('pCloud odpojeno');
    },
    () => loadData()
  );
}

function bootstrap() {
  parseOAuthHash();

  const settings = getSettings();
  initMap('map', settings.mapyApiKey);
  locateUser();

  initFilters(() => refreshUi());
  initSheetHandlers();
  initHeaderButtons(openSettings);

  document.addEventListener('mista:add', () => {
    const statuses = extractUniqueStatuses(allPlaces, CONFIG.statusDefaults);
    showAddForm(statuses, saveNewPlace);
  });

  if (settings.csvDirectUrl) {
    loadData();
  } else {
    showToast('Nastavte CSV Direct Link v nastavení');
    setTimeout(openSettings, 500);
  }
}

bootstrap();
