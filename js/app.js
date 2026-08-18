import { CONFIG } from './config.js';
import {
  parseCsv,
  extractUniqueTags,
  extractUniqueStatuses,
} from './csv.js';
import {
  getSettings,
  saveSettings,
  fetchCsvFromDirectLink,
  migrateLegacySettings,
} from './pcloud.js';
import {
  getLocalPlaces,
  addLocalPlace,
  clearLocalPlaces,
  exportCsvFile,
} from './storage.js';
import { initMap, setPlaces, locateUser, updateTileLayer } from './map.js';
import {
  initFilters,
  filterPlaces,
  renderFilters,
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

let remotePlaces = [];
let allPlaces = [];

function rebuildAllPlaces() {
  allPlaces = [...remotePlaces, ...getLocalPlaces()];
}

async function loadData() {
  const settings = getSettings();
  showLoading(true);
  try {
    const text = await fetchCsvFromDirectLink(settings.csvDirectUrl);
    remotePlaces = parseCsv(text);
    rebuildAllPlaces();
    refreshUi();

    const localCount = getLocalPlaces().length;
    const remoteMsg = `Načteno ${remotePlaces.length} míst z pCloud`;
    showToast(localCount ? `${remoteMsg} (+${localCount} lokálních)` : remoteMsg);
  } catch (err) {
    showToast(err.message, true);
    remotePlaces = [];
    rebuildAllPlaces();
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

function saveNewPlace(place) {
  const newPlace = addLocalPlace({
    ...place,
    id: `local-${Date.now()}`,
    local: true,
  });
  rebuildAllPlaces();
  refreshUi();
  return newPlace;
}

async function exportAllPlaces() {
  if (allPlaces.length === 0) {
    showToast('Žádná místa k exportu', true);
    return;
  }

  const settings = getSettings();
  try {
    await exportCsvFile(allPlaces, settings.csvFilename);
    showToast('CSV exportováno — nahrajte do pCloud a načtěte znovu');
  } catch (err) {
    showToast(err.message, true);
  }
}

function clearLocalAndRefresh() {
  const count = getLocalPlaces().length;
  if (count === 0) {
    showToast('Žádná lokální místa k vymazání');
    return;
  }
  clearLocalPlaces();
  rebuildAllPlaces();
  refreshUi();
  showToast(`Vymazáno ${count} lokálních míst`);
}

function openSettings() {
  const settings = getSettings();
  showSettings(settings, {
    localCount: getLocalPlaces().length,
    onSave: (updated) => {
      const merged = { ...settings, ...updated };
      saveSettings(merged);
      updateTileLayer(merged.mapyApiKey);
      loadData();
    },
    onRefresh: () => loadData(),
    onExport: () => exportAllPlaces(),
    onClearLocal: () => clearLocalAndRefresh(),
  });
}

function bootstrap() {
  migrateLegacySettings();

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
    rebuildAllPlaces();
    refreshUi();
    showToast('Nastavte CSV URL z pCloud v nastavení');
    setTimeout(openSettings, 500);
  }
}

bootstrap();
