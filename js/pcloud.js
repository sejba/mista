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
    const parsed = new URL(url.trim());
    if (parsed.pathname.includes('/publink/show') && parsed.searchParams.has('code')) {
      return parsed.searchParams.get('code');
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
}

function wrapCsvResult(text, meta) {
  return { text, meta: { ...meta, bytes: text.length } };
}

async function fetchCsvFromPublink(code) {
  const apiHosts = ['eapi.pcloud.com', 'api.pcloud.com'];
  const errors = [];

  for (const host of apiHosts) {
    const apiUrl = `https://${host}/getpubtextfile?code=${encodeURIComponent(code)}`;
    try {
      const response = await fetch(apiUrl, { cache: 'no-store' });
      const text = await response.text();

      if (text.trimStart().startsWith('{')) {
        try {
          const data = JSON.parse(text);
          if (data.result !== 0) {
            errors.push(`${host}: ${data.error || `kód ${data.result}`}`);
            continue;
          }
        } catch {
          // not JSON — treat as CSV
        }
      }

      if (!response.ok) {
        errors.push(`${host}: HTTP ${response.status}`);
        continue;
      }

      return wrapCsvResult(text, {
        source: 'pCloud Share link (API getpubtextfile)',
        host,
        code: `${code.slice(0, 8)}…`,
      });
    } catch (err) {
      errors.push(`${host}: ${err.message}`);
    }
  }

  const detail = errors.length ? ` (${errors.join('; ')})` : '';
  throw new Error(`Načtení CSV z pCloud Share linku selhalo${detail}`);
}

export async function fetchCsvFromDirectLink(url) {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) throw new Error('Nastavte CSV URL z pCloud.');

  const publinkCode = extractPublinkCode(trimmedUrl);
  if (publinkCode) {
    return fetchCsvFromPublink(publinkCode);
  }

  let response;
  try {
    response = await fetch(trimmedUrl, { cache: 'no-store' });
  } catch (err) {
    throw new Error(`Nepodařilo se stáhnout CSV (síť/CORS): ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(`Načtení CSV selhalo (HTTP ${response.status}).`);
  }

  const text = await response.text();
  const meta = {
    source: 'Přímé stažení URL',
    host: new URL(trimmedUrl).hostname,
  };

  if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().toLowerCase().startsWith('<html')) {
    return wrapCsvResult(text, {
      ...meta,
      source: 'HTML stránka (Share link bez API převodu?)',
    });
  }

  return wrapCsvResult(text, meta);
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
