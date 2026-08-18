/** Default configuration (no secrets). */
export const CONFIG = {
  appVersion: '1.1.2',
  defaultCenter: [50.0875, 14.4214],
  defaultZoom: 13,
  storageKeys: {
    csvDirectUrl: 'mista_csv_direct_url',
    csvFilename: 'mista_csv_filename',
    mapyApiKey: 'mista_mapy_api_key',
    localPlaces: 'mista_local_places',
    lastLoadDebug: 'mista_last_load_debug',
  },
  defaultCsvFilename: 'mista.csv',
  csvColumns: ['Název', 'GPS', 'Poznámka', 'Tagy', 'Status'],
  statusDefaults: ['Chci navštívit', 'Navštíveno'],
};
