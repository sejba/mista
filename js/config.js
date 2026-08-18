/** Default configuration (no secrets). */
export const CONFIG = {
  defaultCenter: [50.0875, 14.4214],
  defaultZoom: 13,
  storageKeys: {
    csvDirectUrl: 'mista_csv_direct_url',
    pcloudToken: 'mista_pcloud_token',
    pcloudHost: 'mista_pcloud_host',
    folderId: 'mista_folder_id',
    csvFilename: 'mista_csv_filename',
    mapyApiKey: 'mista_mapy_api_key',
    pcloudClientId: 'mista_pcloud_client_id',
  },
  defaultCsvFilename: 'mista.csv',
  csvColumns: ['Název', 'GPS', 'Poznámka', 'Tagy', 'Status'],
  statusDefaults: ['Chci navštívit', 'Navštíveno'],
};
