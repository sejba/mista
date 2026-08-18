/**
 * Parse and serialize CSV with tab, semicolon, or comma delimiter.
 * Columns: Název, GPS, Poznámka, Tagy, Status
 */

const COLUMN_MAP = {
  název: 'name',
  nazev: 'name',
  name: 'name',
  gps: 'gps',
  poznámka: 'note',
  poznamka: 'note',
  note: 'note',
  tagy: 'tags',
  tags: 'tags',
  status: 'status',
};

function stripBom(text) {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

function detectDelimiter(line) {
  const tabs = (line.match(/\t/g) || []).length;
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;

  if (tabs >= semicolons && tabs >= commas && tabs > 0) return '\t';
  if (semicolons >= commas && semicolons > 0) return ';';
  if (commas > 0) return ',';
  return '\t';
}

function splitLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

export function parseGps(gpsStr) {
  if (!gpsStr || typeof gpsStr !== 'string') return null;
  const cleaned = gpsStr.trim().replace(/[()]/g, '').replace(/[NnSsEeWw]/g, '');
  const parts = cleaned.split(/[,;\s]+/).filter(Boolean);
  if (parts.length < 2) return null;

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function parseTags(raw) {
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function normalizeHeader(h) {
  return h.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

export function parseCsv(text) {
  const content = stripBom(text).trim();
  if (!content) return [];

  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter);
  const fieldKeys = headers.map((h) => COLUMN_MAP[normalizeHeader(h)] || null);

  const places = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], delimiter);
    const row = {};
    fieldKeys.forEach((key, idx) => {
      if (key && cells[idx]) row[key] = cells[idx];
    });

    const coords = parseGps(row.gps);
    if (!coords) {
      console.warn(`Skipping row ${i + 1}: invalid GPS "${row.gps}"`);
      continue;
    }

    places.push({
      id: `place-${i}`,
      name: row.name || 'Bez názvu',
      lat: coords.lat,
      lng: coords.lng,
      note: row.note || '',
      tags: parseTags(row.tags),
      status: row.status || '',
    });
  }
  return places;
}

export function serializeCsv(places, columns = ['Název', 'GPS', 'Poznámka', 'Tagy', 'Status']) {
  const escape = (val) => {
    const s = String(val ?? '');
    if (s.includes('"') || s.includes('\t') || s.includes('\n') || s.includes(',')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = columns.join('\t');
  const rows = places.map((p) => {
    const gps = `${p.lat}, ${p.lng}`;
    const tags = (p.tags || []).join(', ');
    return [
      escape(p.name),
      escape(gps),
      escape(p.note),
      escape(tags),
      escape(p.status),
    ].join('\t');
  });

  return [header, ...rows].join('\n');
}

export function extractUniqueTags(places) {
  const set = new Set();
  places.forEach((p) => p.tags.forEach((t) => set.add(t)));
  return [...set].sort((a, b) => a.localeCompare(b, 'cs'));
}

export function extractUniqueStatuses(places, defaults = []) {
  const set = new Set(defaults);
  places.forEach((p) => {
    if (p.status) set.add(p.status);
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'cs'));
}
