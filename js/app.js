import { CONFIG } from './config.js?v=1.1.2';
import {
  parseCsvDetailed,
  describeParseResult,
  formatLoadDebug,
  formatLoadDebugError,
  extractUniqueTags,
  extractUniqueStatuses,
} from './csv.js?v=1.1.2';
import {
  getSettings,
  saveSettings,
  fetchCsvFromDirectLink,
  migrateLegacySettings,
  saveLoadDebug,
  getLoadDebug,
} from './pcloud.js?v=1.1.2';
import {
  getLocalPlaces,
  addLocalPlace,
  clearLocalPlaces,
  exportCsvFile,
} from './storage.js?v=1.1.2';
import { initMap, setPlaces, locateUser, updateTileLayer } from './map.js?v=1.1.2';
import {
  initFilters,
  filterPlaces,
  renderFilters,
} from './filters.js?v=1.1.2';
import {
  initSheetHandlers,
  initHeaderButtons,
  showDetail,
  showSettings,
  showAddForm,
  showToast,
  showLoading,
  updateLoadDebugPanel,
} from './ui.js?v=1.1.2';

let remotePlaces = [];
let allPlaces = [];
let lastLoadResult = null;

function rebuildAllPlaces() {
  allPlaces = [...remotePlaces, ...getLocalPlaces()];
}

function persistLoadDebug(text) {
  saveLoadDebug(text);
  updateLoadDebugPanel(text);
}

async function loadData() {
  const settings = getSettings();
  showLoading(true);
  try {
    const { text, meta } = await fetchCsvFromDirectLink(settings.csvDirectUrl);
    const { places, report } = parseCsvDetailed(text);
    remotePlaces = places;

    const result = describeParseResult(places, report, meta);
    lastLoadResult = result;
    console.info('[Mista] CSV load', result);

    const debugText = formatLoadDebug(result);
    console.info('[Mista] Debug\n' + debugText);
    persistLoadDebug(debugText);

    rebuildAllPlaces();
    refreshUi();

    const localCount = getLocalPlaces().length;
    let message = result.message;
    if (localCount > 0) message += ` (+${localCount} lokálních)`;

    showToast(message, { isError: !result.ok, duration: result.ok ? 3500 : 8000 });
  } catch (err) {
    lastLoadResult = { ok: false, message: err.message, report: null, fetchMeta: null };
    console.error('[Mista] CSV load failed', err);
    const debugText = formatLoadDebugError(err.message);
    persistLoadDebug(debugText);
    showToast(err.message, { isError: true, duration: 8000 });
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
    loadDebug: getLoadDebug() || (lastLoadResult ? formatLoadDebug(lastLoadResult) : null),
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
