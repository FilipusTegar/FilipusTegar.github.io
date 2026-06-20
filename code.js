
const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
const markerGroup = L.layerGroup().addTo(map);
const whiteIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
const depotColors = {
    '2401': '#1565c0',  // Surabaya (Depot FP Tg.Perak) — blue
    '2301': '#7b1fa2',  // Cilacap (Depot FP) — purple
    '2402': '#e53935',  // Maspion (Terminal LPG) — red
    '2302': '#5e35b1',  // Tanjung Mas — deep purple
    '2303': '#ec407a',  // Pel Semarang — pink
    '2304': '#8e24aa',  // Rembang — violet
    '2406': '#fbc02d'   // Banyuwangi — gold/yellow
};
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

function tlpgDivIcon(color) {
  return L.divIcon({
    className: '',
    html: `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
             <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21 12.5 41 12.5 41S25 21 25 12.5C25 5.6 19.4 0 12.5 0Z"
                   fill="${color}" stroke="#333" stroke-width="1"/>
             <circle cx="12.5" cy="12.5" r="4.5" fill="#fff" fill-opacity="0.6"/>
           </svg>`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],     // tip of the pin sits on the coordinate
    popupAnchor: [1, -34]
  });
}
const depotNames = {
    '2401': 'Surabaya', '2301': 'Cilacap', '2402': 'Maspion',
    '2302': 'Tanjung Mas', '2303': 'Pel Semarang',
    '2304': 'Rembang', '2406': 'Banyuwangi'
};
const depotCols = ['2301', '2302', '2303', '2304', '2401', '2402', '2406'];

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
async function loadData() {
    // fetch the local Excel file

    const res = await fetch('data.xlsx');
    const arrayBuffer = await res.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetSPBE = workbook.Sheets['SPBE'];
    const sheetExisting = workbook.Sheets['Eksisting'];
    // if (!sheetExisting) {
    //     console.error('Sheet "Existing" not found. Available:', workbook.SheetNames);
    // }
    const rowsSPBE = XLSX.utils.sheet_to_json(sheetSPBE);
    const rowsExisting = XLSX.utils.sheet_to_json(sheetExisting);
    console.log(rowsSPBE);
    console.log(rowsExisting);

    const bounds = [];
    rowsSPBE.forEach(row => {
        const lat = parseFloat(row.lat ?? row.Lat ?? row.latitude ?? row.Latitude);
        const lng = parseFloat(row.lng ?? row.Lng ?? row.lon ?? row.Longitude ?? row.longitude);
        const label = row.SPBE ?? '';
        if (isNaN(lat) || isNaN(lng)) return;
        const match = rowsExisting.find(e => e.SPBE === row.SPBE);
        const icon = makePieIcon(match);
        if (!icon) return;   // skip rows with no volume

        // build a breakdown for the popup
        const total = depotCols.reduce((s, c) => s + row[c], 0);
        const breakdown = depotCols
            .filter(c => row[c] > 0)
            .map(c => `${depotNames[c]}: ${(row[c] / total * 100).toFixed(1)}%`)
            .join('<br>');

        L.marker([lat, lng], { icon })
            .addTo(markerGroup)
            .bindPopup(`<b>${label}</b><br>${breakdown}`);

        bounds.push([lat, lng]);
    });

    const sheetTLPG = workbook.Sheets['TLPG'];
    if (!sheetTLPG) {
        console.error('Sheet "TLPG" not found. Available:', workbook.SheetNames);
    }
    const rowsTLPG = XLSX.utils.sheet_to_json(sheetTLPG);
    console.log(rowsTLPG); // check your column names here

    rowsTLPG.forEach(row => {
        const lat = parseFloat(row.lat ?? row.Lat ?? row.latitude ?? row.Latitude);
        const lng = parseFloat(row.lng ?? row.Lng ?? row.lon ?? row.Longitude ?? row.longitude);
        const label = row.TLPG ?? '';
        if (isNaN(lat) || isNaN(lng)) return;
        const depotName = (row.TLPG ?? '').trim();   // change to row.Depot if name is elsewhere
        const color = tlpgColors[depotName] || '#9e9e9e';   // grey if unmatched
        
        console.log(tlpgDivIcon(color))
        L.marker([lat, lng], { icon: tlpgDivIcon(color) })
            .addTo(markerGroup)
            .bindPopup(String(label));
        bounds.push([lat, lng]);
    });

    if (bounds.length) map.fitBounds(bounds);
}
const legend = L.control({ position: 'bottomright' });

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