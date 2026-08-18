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
    accessToken: getStored(keys.pcloudToken),
    apiHost: getStored(keys.pcloudHost) || 'eapi.pcloud.com',
    folderId: getStored(keys.folderId),
    csvFilename: getStored(keys.csvFilename) || CONFIG.defaultCsvFilename,
    mapyApiKey: getStored(keys.mapyApiKey),
    clientId: getStored(keys.pcloudClientId),
  };
}

export function saveSettings(settings) {
  const keys = CONFIG.storageKeys;
  setStored(keys.csvDirectUrl, settings.csvDirectUrl);
  setStored(keys.pcloudToken, settings.accessToken);
  setStored(keys.pcloudHost, settings.apiHost);
  setStored(keys.folderId, settings.folderId);
  setStored(keys.csvFilename, settings.csvFilename);
  setStored(keys.mapyApiKey, settings.mapyApiKey);
  setStored(keys.pcloudClientId, settings.clientId);
}

export function parseOAuthHash() {
  const hash = window.location.hash.slice(1);
  if (!hash || !hash.includes('access_token')) return null;

  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  const hostname = params.get('hostname');
  if (!token) return null;

  const keys = CONFIG.storageKeys;
  setStored(keys.pcloudToken, token);
  if (hostname) setStored(keys.pcloudHost, hostname);

  const cleanUrl = window.location.pathname + window.location.search;
  window.history.replaceState(null, '', cleanUrl);

  return { accessToken: token, apiHost: hostname || 'eapi.pcloud.com' };
}

export function startOAuth(clientId) {
  if (!clientId) throw new Error('Zadejte pCloud Client ID v nastavení.');
  const redirectUri = window.location.origin + window.location.pathname;
  const url = new URL('https://my.pcloud.com/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('redirect_uri', redirectUri);
  window.location.href = url.toString();
}

export function disconnectPcloud() {
  const keys = CONFIG.storageKeys;
  localStorage.removeItem(keys.pcloudToken);
  localStorage.removeItem(keys.pcloudHost);
}

export async function fetchCsvFromDirectLink(url) {
  if (!url) throw new Error('Nastavte CSV Direct Link URL.');
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Načtení CSV selhalo (${response.status}).`);
  }
  return await response.text();
}

export async function uploadCsv(csvText, settings) {
  const { accessToken, apiHost, folderId, csvFilename } = settings;
  if (!accessToken) throw new Error('Připojte pCloud účet v nastavení.');
  if (!folderId) throw new Error('Zadejte Folder ID v nastavení.');

  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const form = new FormData();
  form.append(csvFilename, blob, csvFilename);

  const url = new URL(`https://${apiHost}/uploadfile`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('folderid', folderId);

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: form,
  });

  const data = await response.json();
  if (data.result !== 0) {
    throw new Error(data.error || `Upload selhal (kód ${data.result}).`);
  }
  return data;
}

export function isPcloudConnected() {
  return Boolean(getStored(CONFIG.storageKeys.pcloudToken));
}
