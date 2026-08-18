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

export async function fetchCsvFromDirectLink(url) {
  if (!url) throw new Error('Nastavte CSV Direct Link URL.');
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Načtení CSV selhalo (${response.status}).`);
  }
  return await response.text();
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
