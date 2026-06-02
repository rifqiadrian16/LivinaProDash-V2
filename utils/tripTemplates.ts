export const getMapHtml = (
  tripData: any,
  mapType: "dark" | "normal" | "satellite" = "dark",
) => {
  let tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  if (mapType === "normal") {
    tileUrl = "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";
  } else if (mapType === "satellite") {
    tileUrl = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet-gesture-handling/dist/leaflet-gesture-handling.min.css" type="text/css">
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/leaflet-gesture-handling/dist/leaflet-gesture-handling.min.js"></script>
    <style>
      body { padding: 0; margin: 0; background: #121212; }
      #map { width: 100vw; height: 100vh; }
      .car-marker { background-color: rgba(0, 255, 204, 0.3); border: 2px solid #00ffcc; border-radius: 50%; display: flex; justify-content: center; align-items: center; }
      .car-marker-inner { width: 10px; height: 10px; background-color: #fff; border-radius: 50%; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const routeData = ${JSON.stringify(tripData.routeData?.map((d: any) => [d.latitude, d.longitude]) || [])};
      if (routeData.length > 0) {
        
        // +++ NYALAKAN PLUGIN & UBAH TEKSNYA KE BAHASA INDONESIA +++
        const map = L.map('map', { 
          zoomControl: false, 
          attributionControl: false,
          gestureHandling: true,
          gestureHandlingOptions: {
            text: {
              touch: "Gunakan 2 jari untuk menggeser peta",
              scroll: "Gunakan 2 jari untuk menggeser peta",
              scrollMac: "Gunakan 2 jari untuk menggeser peta"
            }
          }
        }).setView(routeData[0], 13);
        // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
        
        L.tileLayer('${tileUrl}', { maxZoom: 19 }).addTo(map);
        L.polyline(routeData, { color: '#333', weight: 4 }).addTo(map);
        const progressLine = L.polyline([routeData[0]], { color: '#00ffcc', weight: 5 }).addTo(map);
        const icon = L.divIcon({ className: 'car-marker', html: '<div class="car-marker-inner"></div>', iconSize: [24, 24], iconAnchor: [12, 12] });
        const marker = L.marker(routeData[0], { icon: icon }).addTo(map);
        window.updatePlayback = function(index) {
          if(!routeData[index]) return;
          const currentCoords = routeData.slice(0, index + 1);
          progressLine.setLatLngs(currentCoords);
          marker.setLatLng(routeData[index]);
          map.panTo(routeData[index], { animate: true, duration: 0.5 });
        };
      }
    </script>
  </body>
  </html>
  `;
};

export const getShareCardHtml = (trip: any, theme: "solid" | "transparent") => {
  const distNum = parseFloat(trip.distance) || 0;
  const topSpeedNum = parseFloat(trip.details?.topSpeed) || 0;
  const avgSpeed = (topSpeedNum * 0.6).toFixed(0);
  const peakAlt = trip.details?.peakAlt || "0";
  const climb = trip.details?.climb || "0";
  const rawTime = trip.time || "0h 0m";
  const timeHtml = rawTime.replace(
    /([a-zA-Z]+)/g,
    '<span class="unit">$1</span>',
  );

  const routeCoords: [number, number][] = [];
  if (trip.routeData && trip.routeData.length > 0) {
    trip.routeData.forEach((pt: any) => {
      routeCoords.push([pt.latitude, pt.longitude]);
    });
  }

  const routeJson = JSON.stringify(routeCoords);
  const accentColor = "#FC4C02";

  // +++ LOGIKA TEMA DINAMIS SAKTI +++
  const isSolid = theme === "solid";
  const bgColor = isSolid ? "#111" : "transparent";
  const fadeBg = isSolid ? "linear-gradient(transparent,#111)" : "transparent";
  const brandBg = isSolid ? "rgba(0,0,0,0.6)" : "transparent";

  // Basemap Satelit (Hanya di-load kalau temanya solid)
  const tileUrl = isSolid
    ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;0,900;1,900&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }

/* Menggunakan variabel bgColor yang akan tembus pandang jika transparan */
body { background:transparent; overflow:hidden; width:270px; }
.card { width:270px; background:${bgColor}; border-radius:16px; overflow:hidden; font-family:'Inter',sans-serif; }
#map { width:270px; height:200px; }

.leaflet-control-attribution { display:none !important; }
.leaflet-container { background: ${bgColor} !important; }
.leaflet-tile { outline: 1px solid transparent; box-shadow: 0 0 1px #111; }

.map-wrap { position:relative; width:270px; height:200px; overflow:hidden; }
.map-brand { position:absolute; top:10px; left:12px; z-index:999; background:${brandBg}; border-radius:4px; padding:3px 8px; display:flex; align-items:center; gap:4px; }
.brand-dot { width:5px; height:5px; border-radius:50%; background:${accentColor}; }
.brand-txt { font-size:9px; font-weight:700; letter-spacing:1.5px; color:rgba(255,255,255,0.7); }

/* Efek gradien dimatikan jika transparan */
.fade-btm { position:absolute; bottom:0; left:0; width:270px; height:70px; z-index:998; background:${fadeBg}; pointer-events:none; }
.body { padding:16px 18px 18px; background:${bgColor}; }

.car-name { font-size:26px; font-weight:900; font-style:italic; color:#fff; margin-bottom:3px; letter-spacing:-0.5px; }
.trip-date { font-size:10px; color:rgba(255,255,255,0.45); margin-bottom:12px; letter-spacing:0.5px; text-transform:uppercase; }
.accent { width:24px; height:2.5px; background:${accentColor}; border-radius:2px; margin-bottom:16px; }
.stats { display:grid; grid-template-columns:1fr 1fr; gap:10px 14px; }
.stat-label { font-size:9px; color:rgba(255,255,255,0.4); letter-spacing:1px; margin-bottom:2px; text-transform:uppercase; }
.stat-val { font-size:24px; font-weight:700; color:#fff; line-height:1; letter-spacing:-0.5px; }
.unit { font-size:12px; font-weight:700; color:${accentColor}; margin-left:1px; }
.footer { margin-top:16px; padding-top:12px; border-top:0.5px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center; }
.footer-brand { font-size:9px; font-weight:700; letter-spacing:2px; color:rgba(255,255,255,0.4); text-transform:uppercase; }
.footer-via { font-size:9px; color:rgba(255,255,255,0.3); }
</style>
</head>
<body>
<div class="card">
  <div class="map-wrap">
    <div id="map"></div>
    <div class="map-brand"><div class="brand-dot"></div><span class="brand-txt">PRODASH</span></div>
    <div class="fade-btm"></div>
  </div>
  <div class="body">
    <div class="car-name">Grand Livina</div>
    <div class="trip-date">${trip.date || ""}</div>
    <div class="accent"></div>
    <div class="stats">
      <div><div class="stat-label">Distance</div><div class="stat-val">${distNum.toFixed(1)}<span class="unit">km</span></div></div>
      <div><div class="stat-label">Duration</div><div class="stat-val">${timeHtml}</div></div>
      <div><div class="stat-label">Top Speed</div><div class="stat-val">${topSpeedNum}<span class="unit">km/h</span></div></div>
      <div><div class="stat-label">Avg Speed</div><div class="stat-val">${avgSpeed}<span class="unit">km/h</span></div></div>
      
      <div><div class="stat-label">Peak Alt</div><div class="stat-val">${peakAlt}<span class="unit">m</span></div></div>
      <div><div class="stat-label">Climb</div><div class="stat-val">${climb}<span class="unit">m</span></div></div>
      </div>
    <div class="footer">
      <span class="footer-brand">Livina ProDash</span>
      <span class="footer-via">Via OBD2</span>
    </div>
  </div>
</div>
<script>
var coords = ${routeJson};
var map = L.map('map', {
  preferCanvas: true,
  zoomControl: false,
  attributionControl: false,
  dragging: false,
  scrollWheelZoom: false,
  touchZoom: false,
  tap: false,
  fadeAnimation: false,
  zoomAnimation: false,
  markerZoomAnimation: false,
  // zoomSnap: 0.1
});
if (${isSolid}) {
    L.tileLayer('${tileUrl}', { maxZoom: 19, detectRetina: true }).addTo(map);
  }

if (coords.length > 0) {
  var bounds = L.latLngBounds(coords);
  
  // 2. Gunakan padding 15 agar rute punya bingkai pelindung dan tak akan pernah kepotong
  map.fitBounds(bounds, { padding: [45, 45], animate: false, maxZoom: 16});

  // Layer Glow (Shadow)
  L.polyline(coords, { color: '${accentColor}', weight: 6, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }).addTo(map);
  
  // Layer Inti (Solid)
  L.polyline(coords, { color: '${accentColor}', weight: 2.5, lineCap: 'round', lineJoin: 'round' }).addTo(map);

  function dot(bg, border) {
    return L.divIcon({
      html: '<div style="width:10px;height:10px;border-radius:50%;background:' + bg + ';border:2.5px solid ' + border + ';box-sizing:border-box;"></div>',
      className: '', iconSize: [10, 10], iconAnchor: [5, 5]
    });
  }
  L.marker(coords[0], { icon: dot('#fff', '#ccc') }).addTo(map);
  L.marker(coords[coords.length - 1], { icon: dot('${accentColor}', '#fff') }).addTo(map);
}

// Tunggu map benar-benar selesai render lalu signal RN
var sent = false;
function signal() {
  if (sent) return;
  sent = true;
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage('MAP_READY');
}

// Event 'moveend' + 'zoomend' dipastikan sudah selesai sebelum signal
// Event 'moveend' + 'zoomend' dipastikan sudah selesai sebelum signal
map.whenReady(function() {
  if (${isSolid}) {
    // JIKA TEMA SOLID: Tunggu gambar satelit selesai didownload
    var loaded = 0, total = 0;
    map.on('tileloadstart', function() { total++; });
    map.on('tileload tileerror', function() {
      loaded++;
      if (loaded >= total && total > 0) setTimeout(signal, 500);
    });
    setTimeout(signal, 5000); // Failsafe maksimal 5 detik
  } else {
    // JIKA TEMA TRANSPARAN: Tidak ada satelit, beri waktu 0.8 detik untuk render garis, lalu signal!
    setTimeout(signal, 800);
  }
});
</script>
</body>
</html>`;
};
