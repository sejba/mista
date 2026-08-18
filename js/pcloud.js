import { CONFIG } from './config.js';

function getStored(key) {
  return localStorage.getItem(key) || '';
}

function setStored(key, value) {
  if (value) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
}

export function getSettings() {
  const keys = CONFIG.storageKeys;
  return {
    csvDirectUrl: getStored(keys.csvDirectUrl),
    csvFilename: getStored(keys.csvFilename) || CONFIG.defaultCsvFilename,
    mapyApiKey: getStored(keys.mapyApiKey),
  };
}

export function saveSettings(settings) {
  const keys = CONFIG.storageKeys;
  setStored(keys.csvDirectUrl, settings.csvDirectUrl);
  setStored(keys.csvFilename, settings.csvFilename);
  setStored(keys.mapyApiKey, settings.mapyApiKey);
}

function extractPublinkCode(url) {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes('/publink/show') && parsed.searchParams.has('code')) {
      return parsed.searchParams.get('code');
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
}

async function fetchCsvFromPublink(code) {
  const apiHosts = ['eapi.pcloud.com', 'api.pcloud.com'];
  let lastError = null;

  for (const host of apiHosts) {
    const apiUrl = `https://${host}/getpubtextfile?code=${encodeURIComponent(code)}`;
    const response = await fetch(apiUrl, { cache: 'no-store' });
    const text = await response.text();

    if (text.trimStart().startsWith('{')) {
      try {
        const data = JSON.parse(text);
        if (data.result !== 0) {
          lastError = new Error(data.error || `pCloud chyba (${data.result}).`);
          continue;
        }
      } catch {
        // not JSON — treat as CSV
      }
    }

    if (!response.ok) {
      lastError = new Error(`Načtení CSV selhalo (${response.status}).`);
      continue;
    }

    return text;
  }

  throw lastError || new Error('Načtení CSV z pCloud share linku selhalo.');
}

export async function fetchCsvFromDirectLink(url) {
  if (!url) throw new Error('Nastavte CSV URL z pCloud.');

  const publinkCode = extractPublinkCode(url);
  if (publinkCode) {
    return fetchCsvFromPublink(publinkCode);
  }

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Načtení CSV selhalo (${response.status}).`);
  }
  const text = await response.text();
  if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
    throw new Error(
      'URL vede na náhledovou stránku, ne na CSV. Použijte Share link z pCloud nebo Direct link z Public Folder.'
    );
  }
  return text;
}

/** Remove legacy pCloud OAuth keys from older app versions. */
export function migrateLegacySettings() {
  const legacyKeys = [
    'mista_pcloud_token',
    'mista_pcloud_host',
    'mista_pcloud_client_id',
    'mista_folder_id',
  ];
  legacyKeys.forEach((key) => localStorage.removeItem(key));
}
