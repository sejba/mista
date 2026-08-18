import { CONFIG } from './config.js?v=1.1.4';

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

export function saveLoadDebug(text) {
  setStored(CONFIG.storageKeys.lastLoadDebug, text);
}

export function getLoadDebug() {
  return getStored(CONFIG.storageKeys.lastLoadDebug);
}

function sanitizeUrl(url) {
  return url
    .trim()
    .replace(/[\u2018\u2019\u201C\u201D]/g, '')
    .replace(/\s+/g, '');
}

function extractPublinkCode(url) {
  const cleaned = sanitizeUrl(url);
  if (!cleaned) return null;

  try {
    const parsed = new URL(cleaned);
    const code = parsed.searchParams.get('code');
    if (code) return code;
  } catch {
    // fall through to regex
  }

  const match = cleaned.match(/[?&]code=([^&#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

function wrapCsvResult(text, meta) {
  return { text, meta: { ...meta, bytes: text.length } };
}

async function fetchText(url, init = {}) {
  const response = await fetch(url, {
    cache: 'no-store',
    mode: 'cors',
    credentials: 'omit',
    ...init,
  });
  const text = await response.text();
  return { response, text };
}

async function fetchCsvFromPublink(code) {
  const apiHosts = ['eapi.pcloud.com', 'api.pcloud.com'];
  const errors = [];

  for (const host of apiHosts) {
    const apiUrl = `https://${host}/getpubtextfile?code=${encodeURIComponent(code)}`;
    try {
      const { response, text } = await fetchText(apiUrl);

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
  const trimmedUrl = sanitizeUrl(url);
  if (!trimmedUrl) throw new Error('Nastavte CSV URL z pCloud.');

  const publinkCode = extractPublinkCode(trimmedUrl);
  if (publinkCode) {
    return fetchCsvFromPublink(publinkCode);
  }

  let response;
  let text;
  try {
    ({ response, text } = await fetchText(trimmedUrl));
  } catch (err) {
    throw new Error(`Nepodařilo se stáhnout CSV (síť/CORS): ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(`Načtení CSV selhalo (HTTP ${response.status}).`);
  }

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
