const fs = require('fs');

const buildings = JSON.parse(fs.readFileSync('buildings-valencia.json')).buildings;
const { VENUES } = require('./venues.js');

function toRad(d) { return d * Math.PI / 180; }

function distance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function bearing(lat1, lng1, lat2, lng2) {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

const RADIUS = 60; // metres

const enriched = VENUES.map((v, i) => {
  if (i % 100 === 0) console.log(`Processing ${i}/${VENUES.length}`);
  
  const nearby = buildings.filter(b => distance(v.lat, v.lng, b.lat, b.lng) < RADIUS);
  
  // Find nearest building in each quadrant (N/E/S/W)
  const quads = { N: null, E: null, S: null, W: null };
  
  nearby.forEach(b => {
    const d = distance(v.lat, v.lng, b.lat, b.lng);
    if (d < 5) return; // skip if same building
    const brng = bearing(v.lat, v.lng, b.lat, b.lng);
    const h = (b.f || 1) * 3;
    
    let quad;
    if (brng >= 315 || brng < 45) quad = 'N';
    else if (brng >= 45 && brng < 135) quad = 'E';
    else if (brng >= 135 && brng < 225) quad = 'S';
    else quad = 'W';
    
    if (!quads[quad] || d < quads[quad].d) {
      quads[quad] = { h, d: Math.round(d) };
    }
  });
  
  return { ...v, blds: quads };
});

const out = 'const VENUES = ' + JSON.stringify(enriched, null, 0) + ';\nif (typeof module !== "undefined") module.exports = { VENUES };';
fs.writeFileSync('venues-enriched.js', out);
console.log('Done! venues-enriched.js written.');
