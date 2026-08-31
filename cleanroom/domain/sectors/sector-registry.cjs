'use strict';

function createSectorRegistry(seed) {
  if (!Array.isArray(seed)) throw new Error('SECTOR_SEED_INVALID');
  const map = new Map();
  for (const sector of seed) {
    if (!sector || typeof sector.id !== 'string' || typeof sector.labelAr !== 'string') throw new Error('SECTOR_SEED_INVALID');
    if (map.has(sector.id)) throw new Error('SECTOR_ID_DUPLICATE');
    map.set(sector.id, { id: sector.id, labelAr: sector.labelAr, active: true });
  }
  const copy = (value) => value ? Object.freeze({ ...value }) : null;
  return Object.freeze({
    get(id) { return copy(map.get(id)); },
    requireActive(id) {
      const sector = map.get(id);
      if (!sector || sector.active !== true) throw new Error('SECTOR_NOT_ACTIVE');
      return copy(sector);
    },
    rename(id, labelAr) {
      const sector = map.get(id);
      if (!sector || typeof labelAr !== 'string' || !labelAr.trim()) throw new Error('SECTOR_RENAME_INVALID');
      sector.labelAr = labelAr.trim();
      return copy(sector);
    },
    setActive(id, active) {
      const sector = map.get(id);
      if (!sector) throw new Error('SECTOR_UNKNOWN');
      sector.active = active === true;
      return copy(sector);
    },
    listActive() { return Object.freeze([...map.values()].filter((s) => s.active).map(copy)); },
  });
}

module.exports = Object.freeze({ createSectorRegistry });
