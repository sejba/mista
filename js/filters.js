/**
 * Filter state and UI for Tagy and Status chips.
 */

import { statusLabel } from './csv.js?v=1.1.3';

let activeTag = null;
let activeStatus = null;
let onFilterChange = null;

export function initFilters(onChange) {
  onFilterChange = onChange;
}

export function getActiveFilters() {
  return { tag: activeTag, status: activeStatus };
}

export function filterPlaces(places) {
  return places.filter((p) => {
    if (activeTag && !p.tags.includes(activeTag)) return false;
    if (activeStatus && p.status !== activeStatus) return false;
    return true;
  });
}

function renderChipRow(container, items, activeValue, onSelect) {
  container.innerHTML = '';
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-chip' + (activeValue === item.value ? ' active' : '');
    btn.textContent = item.label;
    btn.addEventListener('click', () => onSelect(item.value));
    container.appendChild(btn);
  });
}

export function renderFilters(tags, statuses) {
  const tagContainer = document.getElementById('filter-tags');
  const statusContainer = document.getElementById('filter-status');
  if (!tagContainer || !statusContainer) return;

  const tagItems = [{ label: 'Vše', value: null }, ...tags.map((t) => ({ label: t, value: t }))];
  const statusItems = [
    { label: 'Vše', value: null },
    ...statuses.map((s) => ({ label: statusLabel(s), value: s })),
  ];

  renderChipRow(tagContainer, tagItems, activeTag, (value) => {
    activeTag = value;
    renderFilters(tags, statuses);
    if (onFilterChange) onFilterChange();
  });

  renderChipRow(statusContainer, statusItems, activeStatus, (value) => {
    activeStatus = value;
    renderFilters(tags, statuses);
    if (onFilterChange) onFilterChange();
  });
}

export function resetFilters() {
  activeTag = null;
  activeStatus = null;
}
