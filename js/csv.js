/**
 * Parse and serialize CSV with tab, semicolon, or comma delimiter.
 * Columns: Název, GPS, Poznámka, Tagy, Status
 */

import { CONFIG } from './config.js';

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

function delimiterLabel(delimiter) {
  if (delimiter === '\t') return 'tab';
  if (delimiter === ';') return 'středník';
  return 'čárka';
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

function detectContentKind(text) {
  const trimmed = text.trim();
  if (!trimmed) return 'empty';
  const lower = trimmed.slice(0, 200).toLowerCase();
  if (lower.startsWith('<!doctype') || lower.startsWith('<html') || lower.includes('<html')) {
    return 'html';
  }
  if (trimmed.startsWith('{') && trimmed.includes('"result"')) return 'json';
  return 'csv';
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
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeLineEndings(text) {
  return text.replace(/\r\n?/g, '\n');
}

export function parseCsvDetailed(text) {
  const content = stripBom(normalizeLineEndings(text)).trim();
  const report = {
    contentKind: detectContentKind(content),
    delimiter: null,
    delimiterLabel: '',
    headers: [],
    hasGpsColumn: false,
    dataRows: 0,
    skipped: [],
    preview: content.slice(0, 160).replace(/\s+/g, ' '),
  };

  if (report.contentKind !== 'csv') {
    return { places: [], report };
  }

  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length === 0) {
    report.contentKind = 'empty';
    return { places: [], report };
  }

  const delimiter = detectDelimiter(lines[0]);
  report.delimiter = delimiter;
  report.delimiterLabel = delimiterLabel(delimiter);

  const headers = splitLine(lines[0], delimiter);
  report.headers = headers;
  const fieldKeys = headers.map((h) => COLUMN_MAP[normalizeHeader(h)] || null);
  report.hasGpsColumn = fieldKeys.includes('gps');

  const places = [];
  report.dataRows = Math.max(0, lines.length - 1);

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], delimiter);
    const row = {};
    fieldKeys.forEach((key, idx) => {
      if (key && cells[idx] !== undefined) row[key] = cells[idx];
    });

    const coords = parseGps(row.gps);
    if (!coords) {
      report.skipped.push({
        line: i + 1,
        gps: row.gps || '',
        name: row.name || '',
        reason: !report.hasGpsColumn
          ? 'missing-gps-column'
          : row.gps
            ? 'invalid-gps'
            : 'empty-gps',
      });
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

  return { places, report };
}

export function parseCsv(text) {
  return parseCsvDetailed(text).places;
}

export function describeParseResult(places, report, fetchMeta = null) {
  if (places.length > 0) {
    const skipped = report.skipped.length;
    let message = `Načteno ${places.length} míst`;
    if (skipped > 0) message += ` (${skipped} řádků přeskočeno)`;
    return { ok: true, message, report, fetchMeta };
  }

  if (report.contentKind === 'html') {
    return {
      ok: false,
      message:
        'Odpověď je HTML stránka pCloud, ne CSV. Vložte Share link (e.pcloud.link/.../show?code=...) — appka ho převede automaticky.',
      report,
      fetchMeta,
    };
  }

  if (report.contentKind === 'json') {
    return {
      ok: false,
      message: 'pCloud vrátil JSON chybu místo CSV. Zkontrolujte, že link funguje v prohlížeči.',
      report,
      fetchMeta,
    };
  }

  if (report.contentKind === 'empty') {
    return {
      ok: false,
      message: 'CSV soubor je prázdný.',
      report,
      fetchMeta,
    };
  }

  let message = `0 míst z ${report.dataRows} řádků dat`;
  if (!report.hasGpsColumn) {
    message += `. Sloupec GPS nenalezen — hlavička: [${report.headers.join(' | ')}], detekovaný oddělovač: ${report.delimiterLabel}.`;
  } else if (report.skipped.length > 0) {
    const first = report.skipped[0];
    message += `. Řádek ${first.line}: neplatné GPS „${first.gps || '(prázdné)'}“`;
    if (report.skipped.length > 1) {
      message += ` (+${report.skipped.length - 1} dalších)`;
    }
  } else {
    message += '. CSV neobsahuje datové řádky.';
  }

  return { ok: false, message, report, fetchMeta };
}

export function formatLoadDebug(result) {
  const { report, fetchMeta, message, ok } = result;
  const lines = [`Mista v${CONFIG.appVersion}`];

  if (typeof navigator !== 'undefined') {
    lines.push(`Prohlížeč: ${navigator.userAgent.slice(0, 80)}…`);
  }
  if (message) lines.push(`Výsledek: ${ok ? 'OK' : 'CHYBA'} — ${message}`);

  if (!report) return lines.join('\n');

  if (fetchMeta) {
    lines.push(`Načtení: ${fetchMeta.source}`);
    if (fetchMeta.host) lines.push(`API: ${fetchMeta.host}`);
    if (fetchMeta.bytes != null) lines.push(`Velikost: ${fetchMeta.bytes} B`);
  }

  lines.push(`Typ odpovědi: ${report.contentKind}`);
  if (report.delimiterLabel) lines.push(`Oddělovač: ${report.delimiterLabel}`);
  if (report.headers.length) lines.push(`Hlavička: ${report.headers.join(' | ')}`);
  lines.push(`GPS sloupec: ${report.hasGpsColumn ? 'ano' : 'ne'}`);
  lines.push(`Datové řádky: ${report.dataRows}, přeskočeno: ${report.skipped.length}`);

  if (report.skipped.length > 0) {
    report.skipped.slice(0, 5).forEach((row) => {
      lines.push(`  ř.${row.line}: ${row.reason} — GPS „${row.gps || '(prázdné)'}“`);
    });
  }

  if (report.preview) lines.push(`Náhled: ${report.preview}`);

  return lines.join('\n');
}

export function formatLoadDebugError(message) {
  return [`Mista v${CONFIG.appVersion}`, `Výsledek: CHYBA — ${message}`].join('\n');
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
