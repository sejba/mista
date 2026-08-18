import { CONFIG } from './config.js?v=1.1.2';

let map = null;
let markersLayer = null;
let userMarker = null;
let pickMode = false;
let pickCallback = null;
let pickMarker = null;

const pinIcon = L.divIcon({
  className: 'pin-marker',
  html: '<div class="pin-marker-dot"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const userIcon = L.divIcon({
  className: 'user-marker',
  html: '<div class="user-marker-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const pickIcon = L.divIcon({
  className: 'pick-marker',
  html: '<div class="pick-marker-dot"></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function getTileLayer(mapyApiKey) {
  if (mapyApiKey) {
    return L.tileLayer(
      `https://api.mapy.com/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${mapyApiKey}`,
      {
        attribution: '© Seznam.cz a.s. a další',
        maxZoom: 19,
      }
    );
  }
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  });
}

export function initMap(containerId, mapyApiKey) {
  if (map) return map;

  map = L.map(containerId, {
    center: CONFIG.defaultCenter,
    zoom: CONFIG.defaultZoom,
    zoomControl: false,
  });

  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  getTileLayer(mapyApiKey).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  map.on('click', (e) => {
    if (!pickMode || !pickCallback) return;
    const { lat, lng } = e.latlng;
    if (pickMarker) pickMarker.remove();
    pickMarker = L.marker([lat, lng], { icon: pickIcon }).addTo(map);
    pickCallback({ lat, lng });
  });

  return map;
}

export function updateTileLayer(mapyApiKey) {
  if (!map) return;
  map.eachLayer((layer) => {
    if (layer instanceof L.TileLayer) map.removeLayer(layer);
  });
  getTileLayer(mapyApiKey).addTo(map);
}

export function setPlaces(places, onPinClick) {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  places.forEach((place) => {
    const marker = L.marker([place.lat, place.lng], { icon: pinIcon });
    marker.bindTooltip(place.name, {
      direction: 'top',
      offset: [0, -10],
      className: 'pin-tooltip',
    });
    marker.on('click', () => onPinClick(place));
    markersLayer.addLayer(marker);
  });
}

export function locateUser() {
  if (!map || !navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (userMarker) userMarker.remove();
      userMarker = L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
      userMarker.bindTooltip('Moje poloha', {
        direction: 'top',
        offset: [0, -8],
        className: 'pin-tooltip',
      });
      map.setView([latitude, longitude], Math.max(map.getZoom(), 14));
    },
    (err) => console.warn('Geolocation error:', err.message),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolokace není dostupná.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export function startPickMode(callback) {
  pickMode = true;
  pickCallback = callback;
  if (map) map.getContainer().classList.add('pick-mode');
}

export function stopPickMode() {
  pickMode = false;
  pickCallback = null;
  if (pickMarker) {
    pickMarker.remove();
    pickMarker = null;
  }
  if (map) map.getContainer().classList.remove('pick-mode');
}

export function setPickMarker(lat, lng) {
  if (!map) return;
  if (pickMarker) pickMarker.remove();
  pickMarker = L.marker([lat, lng], { icon: pickIcon }).addTo(map);
}

export function invalidateSize() {
  if (map) setTimeout(() => map.invalidateSize(), 100);
}
