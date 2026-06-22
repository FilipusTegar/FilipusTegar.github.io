// Map setting
const map = L.map('map').setView([20, 0], 2); 
// Map title
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
// Marker group initiation
const markerGroup = L.layerGroup().addTo(map);
// Depot Color assignment by number
const depotColors = {
    '2401': '#1565c0',  // Surabaya (Depot FP Tg.Perak) — blue
    '2301': '#7b1fa2',  // Cilacap (Depot FP) — purple
    '2402': '#e53935',  // Maspion (Terminal LPG) — red
    '2302': '#5e35b1',  // Tanjung Mas — deep purple
    '2303': '#ec407a',  // Pel Semarang — pink
    '2304': '#8e24aa',  // Rembang — violet
    '2406': '#fbc02d',   // Banyuwangi — gold/yellow
    'Tuban': '#6d4c41'   // Tuban - Brown
};
// Depot Color assignment by name
const tlpgColors = {
    'Cilacap': '#7b1fa2',                          // purple (Depot FP Cilacap)
    'Semarang (PEL)': '#ec407a',                   // pink (Temp PEL Semarang)
    'Semarang (Opsico)': '#5e35b1',                // deep purple (Tanjung Mas)
    'Rembang (Heksa Energi Mitraniaga)': '#8e24aa',// violet (Temporary Rembang)
    'Perak': '#1565c0',                            // blue (Tg.Perak Surabaya)
    'Gresik (Maspion Energy)': '#e53935',          // red (Maspion)
    'Gresik (Kilang Energi Nusantara)': '#00897b', // teal (add to legend)
    'Banyuwangi (Bosowa)': '#fbc02d',              // gold (Banyuwangi)
    'Tuban': '#6d4c41'                             // brown (add to legend)
};

// Depot names dict
const depotNames = {
    '2401': 'Surabaya', 
    '2301': 'Cilacap', 
    '2402': 'Maspion',
    '2302': 'Tanjung Mas', 
    '2303': 'Pel Semarang',
    '2304': 'Rembang', 
    '2406': 'Banyuwangi',
    'Tuban': 'Tuban'
};
 // Depot Array
const depotCols = ['2301', '2302', '2303', '2304', '2401', '2402', '2406','Tuban'];

// Pin tlpg based
function tlpgDivIcon(color, isOn = true) {
  const fill = isOn ? color : '#000';
  const opacity = isOn ? 1 : 0.35;        // faded when off
  return L.divIcon({
    className: '',
    html: `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg"
                style="opacity:${opacity}">
             <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21 12.5 41 12.5 41S25 21 25 12.5C25 5.6 19.4 0 12.5 0Z"
                   fill="${fill}" stroke="#333" stroke-width="1"/>
             <circle cx="12.5" cy="12.5" r="4.5" fill="#fff" fill-opacity="0.6"/>
           </svg>`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  });
}

// Pie percentage circlemarker
function makePieIcon(row, size = 20) {
    // collect non-zero depot values
    const slices = depotCols
        .map(col => ({ col, val: row[col] }))
        .filter(s => s.val > 0);
    // console.log(row);
    const total = slices.reduce((sum, s) => sum + s.val, 0);
    if (total === 0) return null;

    const r = size / 2;
    const cx = r, cy = r;
    let angle = -Math.PI / 2;   // start at top (12 o'clock)
    let paths = '';

    if (slices.length === 1) {
        // single depot → full circle (arc path can't draw 360°)
        paths = `<circle cx="${cx}" cy="${cy}" r="${r - 1}"
                   fill="${depotColors[slices[0].col]}" stroke="#333" stroke-width="1"/>`;
    } else {
        slices.forEach(s => {
            const slice = (s.val / total) * 2 * Math.PI;
            const x1 = cx + (r - 1) * Math.cos(angle);
            const y1 = cy + (r - 1) * Math.sin(angle);
            angle += slice;
            const x2 = cx + (r - 1) * Math.cos(angle);
            const y2 = cy + (r - 1) * Math.sin(angle);
            const largeArc = slice > Math.PI ? 1 : 0;
            paths += `<path d="M${cx},${cy} L${x1},${y1}
                        A${r - 1},${r - 1} 0 ${largeArc} 1 ${x2},${y2} Z"
                        fill="${depotColors[s.col]}" stroke="#333" stroke-width="0.5"/>`;
        });
    }

    const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"
                   xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;

    return L.divIcon({
        html: svg,
        className: '',
        iconSize: [size, size],
        iconAnchor: [r, r],          // center the pie on the coordinate
        popupAnchor: [0, -r]
    });
}
function fitToMarkers() {
    const group = L.featureGroup([...spbeGroup.getLayers(), ...tlpgGroup.getLayers()]);
    if (group.getLayers().length) {
        map.fitBounds(group.getBounds().pad(0.1));
    }
}
let workbook;                 // keep the parsed workbook around
const spbeGroup = L.layerGroup().addTo(map);   // pies — cleared on each switch
const tlpgGroup = L.layerGroup().addTo(map);   // TLPG pins — drawn once

// Draw SPBE pies from a given scenario sheet name
function drawScenario(sheetName) {
    spbeGroup.clearLayers();

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        console.error(`Sheet "${sheetName}" not found. Available:`, workbook.SheetNames);
        return;
    }
    const rows = XLSX.utils.sheet_to_json(sheet);
    const spbeRows = XLSX.utils.sheet_to_json(workbook.Sheets['SPBE']);

    spbeRows.forEach(row => {
        const lat = parseFloat(row.lat ?? row.Lat ?? row.latitude ?? row.Latitude);
        const lng = parseFloat(row.lng ?? row.Lng ?? row.lon ?? row.Longitude ?? row.longitude);
        const label = row.SPBE ?? '';
        if (isNaN(lat) || isNaN(lng)) return;

        const match = rows.find(e => e.SPBE === row.SPBE);
        if (!match) return;
        const icon = makePieIcon(match);
        if (!icon) return;

        const total = depotCols.reduce((s, c) => s + (match[c] || 0), 0);
        const breakdown = depotCols
            .filter(c => (match[c] || 0) > 0)
            .map(c => `${depotNames[c]}: ${(match[c] / total * 100).toFixed(1)}%`)
            .join('<br>');

        L.marker([lat, lng], { icon })
            .addTo(spbeGroup)
            .bindPopup(`<b>${label}</b><br>${breakdown}`);
    });
}

// Draw TLPG pins once (independent of scenario)
function drawTLPG(sheetName) {
    tlpgGroup.clearLayers();

    const sheet = workbook.Sheets['TLPG'];
    if (!sheet) { console.error('Sheet "TLPG" not found.'); return; }
    const rows = XLSX.utils.sheet_to_json(sheet);

    rows.forEach(row => {
        const lat = parseFloat(row.lat ?? row.Lat ?? row.latitude ?? row.Latitude);
        const lng = parseFloat(row.lng ?? row.Lng ?? row.lon ?? row.Longitude ?? row.longitude);
        const label = row.TLPG ?? '';
        if (isNaN(lat) || isNaN(lng)) return;

        const depotName = (row.TLPG ?? '').trim();
        const color = tlpgColors[depotName] || '#9e9e9e';

        // read the On/Off status for the selected scenario
        const status = String(row[sheetName] ?? '').trim().toLowerCase();
        const isOn = status === 'on';

        L.marker([lat, lng], { icon: tlpgDivIcon(color, isOn) })
            .addTo(tlpgGroup)
            .bindPopup(`${label}<br><b>${isOn ? 'On' : 'Off'}</b>`);
    });
}

async function loadData() {
    const res = await fetch('data.xlsx');
    const arrayBuffer = await res.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const select = document.getElementById('scenario');

    function render(sheetName) {
        drawScenario(sheetName);
        drawTLPG(sheetName);
    }

    render(select.value);
    select.addEventListener('change', () => render(select.value));

    fitToMarkers();
}
const legend = L.control({ position: 'bottomright' });
// Legend addition to HTML
legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = `
      <style>
        .legend {
          background: white; padding: 8px 10px; line-height: 18px;
          font: 12px/1.4 sans-serif; color: #333;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3); border-radius: 4px;
          max-height: 300px; overflow-y: auto;
        }
        .legend i {
          width: 12px; height: 12px; float: left;
          margin-right: 6px; border-radius: 50%; border: 1px solid #333;
        }
        .legend b { display:block; margin: 4px 0 2px; }
      </style>
      <b>Depot</b>`;

    Object.entries(tlpgColors).forEach(([name, color]) => {
        div.innerHTML += `<div><i style="background:${color}"></i>${name}</div>`;
    });

    return div;
};

legend.addTo(map);
loadData().catch(err => console.error('Failed to load data:', err));