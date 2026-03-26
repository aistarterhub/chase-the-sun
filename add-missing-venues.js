const fs = require('fs');

// Load current venues
const { VENUES } = require('./venues.js');

// Load Google pull 1
const p1 = fs.readFileSync('./Google pull 1.js', 'utf8')
  .replace('const VENUES_GOOGLE = ', 'module.exports = ')
  .replace(/};?\s*$/, '}');
// safer: just eval-style parse
const g1text = fs.readFileSync('./Google pull 1.js', 'utf8');
const g1 = eval(g1text.replace('const VENUES_GOOGLE', 'var _g') + '; _g');

const g2text = fs.readFileSync('./Google pull 2.yaml', 'utf8');
const g2 = eval(g2text.replace('const VENUES_GOOGLE_2', 'var _g') + '; _g');

// Merge both Google pulls, dedup by name+coords
const googleMap = new Map();
[...g1, ...g2].forEach(v => {
  const key = v.name.toLowerCase() + '|' + v.lat.toFixed(3) + '|' + v.lng.toFixed(3);
  if (!googleMap.has(key)) googleMap.set(key, v);
});
console.log(`Google total after merge: ${googleMap.size}`);
console.log(`Google outdoor:true: ${[...googleMap.values()].filter(v => v.outdoorSeating === true).length}`);

// Find Google venues NOT in current venues.js (by name proximity)
const existingNames = new Set(VENUES.map(v => v.name.toLowerCase().trim()));

const missing = [...googleMap.values()].filter(v => {
  if (v.outdoorSeating !== true) return false; // only confirmed outdoor
  const name = v.name.toLowerCase().trim();
  // Check if any existing venue is close enough
  const nameMatch = existingNames.has(name);
  if (nameMatch) return false;
  // Check proximity (within 30m)
  const nearby = VENUES.some(e => {
    const dlat = (e.lat - v.lat) * 111000;
    const dlng = (e.lng - v.lng) * 85000;
    return Math.sqrt(dlat*dlat + dlng*dlng) < 30;
  });
  return !nearby;
});

console.log(`Missing confirmed venues to add: ${missing.length}`);
missing.slice(0,10).forEach(v => console.log(' -', v.name, v.hood));

// Add them to venues with new IDs and outdoor:true
const maxId = Math.max(...VENUES.map(v => v.id));
const toAdd = missing.map((v, i) => ({
  id: maxId + i + 1,
  name: v.name,
  lat: v.lat,
  lng: v.lng,
  facing: 180, // will be updated by orientation script
  open: v.open || 0.7,
  type: v.type || 'terrace',
  hood: v.hood || 'Valencia',
  icon: v.icon || '🌿',
  vibes: v.vibes || ['Outdoor seating'],
  book: v.book || false,
  outdoor: true,
  googleType: v.googleType || null,
  rating: v.rating || null,
  ratingCount: v.ratingCount || null,
  blds: { N: null, E: null, S: null, W: null }
}));

const merged = [...VENUES, ...toAdd];
console.log(`\nFinal venue count: ${merged.length} (added ${toAdd.length})`);

const out = 'const VENUES = ' + JSON.stringify(merged) + ';\nif (typeof module !== "undefined") module.exports = { VENUES };';
fs.writeFileSync('venues.js', out);
console.log('venues.js updated.');
