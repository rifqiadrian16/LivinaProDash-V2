// utils/tripTemplates.ts

export const getMapHtml = (tripData: any) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
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
        const map = L.map('map', { zoomControl: false, attributionControl: false }).setView(routeData[0], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
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

export const getShareCardHtml = (trip: any, theme: "solid" | "transparent") => {
  const distNum = parseFloat(trip.distance) || 0;
  const topSpeedNum = parseFloat(trip.details?.topSpeed) || 0;
  const avgSpeed = (topSpeedNum * 0.6).toFixed(0);
  const isSolid = theme === "solid";

  // ==========================================================
  // LOGIKA MENGUBAH KOORDINAT GPS (LAT/LON) MENJADI SVG (X/Y)
  // ==========================================================
  let realSvgPath = "";
  let startX = 12,
    startY = 196;
  let endX = 304,
    endY = 24;

  if (trip.routeData && trip.routeData.length > 0) {
    const W = 310;
    const H = 210;
    const P = 25;
    let minLat = Infinity,
      maxLat = -Infinity;
    let minLon = Infinity,
      maxLon = -Infinity;

    trip.routeData.forEach((pt: any) => {
      if (pt.latitude < minLat) minLat = pt.latitude;
      if (pt.latitude > maxLat) maxLat = pt.latitude;
      if (pt.longitude < minLon) minLon = pt.longitude;
      if (pt.longitude > maxLon) maxLon = pt.longitude;
    });

    const dLat = maxLat - minLat || 0.0001;
    const dLon = maxLon - minLon || 0.0001;

    const points = trip.routeData.map((pt: any, i: number) => {
      // Tentukan Padding Spesifik
      const paddingLeftRight = P; // Sisi kiri-kanan tetap 25
      const paddingTop = 40; // <--- ATUR DI SINI (Angka ini yang bikin rute turun)
      const paddingBottom = P; // Sisi bawah tetap 25

      // Longitude mapping ke X
      const x =
        paddingLeftRight +
        ((pt.longitude - minLon) / dLon) * (W - 2 * paddingLeftRight);

      // Latitude mapping ke Y (Menggunakan paddingTop)
      const y =
        paddingTop +
        ((maxLat - pt.latitude) / dLat) * (H - paddingTop - paddingBottom);

      if (i === 0) {
        startX = x;
        startY = y;
      }
      if (i === trip.routeData.length - 1) {
        endX = x;
        endY = y;
      }

      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    realSvgPath = points.join(" ");
  } else {
    realSvgPath =
      "M 12 196 C 30 182 55 168 78 152 C 104 134 130 118 158 102 C 186 86 212 70 240 55 C 262 43 282 34 304 24";
  }

  // ==========================================================
  // TRIK REGEX: Otomatis membungkus huruf waktu (h & m) dengan span unit
  // ==========================================================
  const rawTime = trip.time || "0h 0m";
  const timeHtml = rawTime.replace(
    /([a-zA-Z]+)/g,
    '<span class="unit">$1</span>',
  );

  const mapSvg = isSolid
    ? `
    <svg viewBox="0 0 310 210" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="mapBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0e1c2e"/><stop offset="100%" stop-color="#0a1520"/></linearGradient>
        <linearGradient id="fadeMid" x1="0" y1="0" x2="0" y2="1"><stop offset="60%" stop-color="#111111" stop-opacity="0"/><stop offset="100%" stop-color="#111111" stop-opacity="1"/></linearGradient>
        <linearGradient id="routeG" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#2266dd"/><stop offset="100%" stop-color="#55aaff"/></linearGradient>
      </defs>
      <rect width="310" height="210" fill="url(#mapBg)"/>
      <path d="${realSvgPath}" fill="none" stroke="rgba(74,158,255,0.2)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${realSvgPath}" fill="none" stroke="url(#routeG)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${startX}" cy="${startY}" r="4" fill="#4a9eff"/><circle cx="${startX}" cy="${startY}" r="2" fill="#fff"/>
      <circle cx="${endX}" cy="${endY}" r="4" fill="#55ccff"/><circle cx="${endX}" cy="${endY}" r="2" fill="#fff"/>
      <rect y="130" width="310" height="80" fill="url(#fadeMid)"/>
    </svg>
  `
    : `
    <svg viewBox="0 0 310 210" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="routeG" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#2266dd"/><stop offset="100%" stop-color="#66bbff"/></linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d="${realSvgPath}" fill="none" stroke="#3377ee" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.12" filter="url(#glow)"/>
      <path d="${realSvgPath}" fill="none" stroke="url(#routeG)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${startX}" cy="${startY}" r="4" fill="#4a9eff"/><circle cx="${startX}" cy="${startY}" r="2" fill="#fff"/>
      <circle cx="${endX}" cy="${endY}" r="4" fill="#66bbff"/><circle cx="${endX}" cy="${endY}" r="2" fill="#fff"/>
    </svg>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,700;0,900;1,900&display=swap');
        
        body { margin: 0; padding: 0; background: transparent; overflow: hidden; width: 310px; height: auto; }
        .wrap { display: block; width: 310px; margin: 0; padding: 0; }
        .card { width: 310px; background: transparent; border-radius: 16px; overflow: hidden; font-family: 'Inter', sans-serif; }
        .map-box { width: 100%; height: 210px; position: relative; overflow: hidden; background: transparent; }
        .map-box svg { width: 100%; height: 100%; display: block; }
        .map-brand { position: absolute; top: 12px; left: 14px; display: flex; align-items: center; gap: 5px; ${isSolid ? "background: rgba(0,0,0,0.55); border-radius: 4px; padding: 3px 8px;" : ""} }
        .map-brand-dot { width: 6px; height: 6px; border-radius: 50%; background: ${isSolid ? "#4a9eff" : "rgba(255,255,255,0.25)"}; }
        .map-brand-txt { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: rgba(255,255,255,0.6); }
        .body { padding: 18px 18px 20px; background: transparent; }
        .car-name { font-size: 28px; font-weight: 900; font-style: italic; color: #ffffff; line-height: 1; margin: 0 0 5px; letter-spacing: -0.5px; }
        .trip-date { font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.55); letter-spacing: 0.5px; margin: 0 0 12px; text-transform: uppercase; }
        .accent-line { width: 28px; height: 2.5px; background: #4a9eff; border-radius: 2px; margin-bottom: 18px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; row-gap: 18px; }
        .stat-label { font-size: 9px; font-weight: 600; letter-spacing: 1px; color: rgba(255,255,255,0.5); text-transform: uppercase; margin-bottom: 3px; }
        .stat-val { font-size: 26px; font-weight: 700; color: #ffffff; line-height: 1; letter-spacing: -0.5px; }
        
        /* --- KEKUATAN GLOW BIRU DI SINI --- */
        .stat-val .unit { 
          font-size: 13px; 
          font-weight: 700; 
          color: #4a9eff; /* Warna Biru */
          text-shadow: 0 0 8px rgba(74, 158, 255, 0.8), 0 0 15px rgba(74, 158, 255, 0.4); /* Efek Glow/Neon */
          margin-left: 2px; 
          letter-spacing: 0; 
        }
        /* ---------------------------------- */

        .footer { margin-top: 20px; padding-top: 14px; border-top: 0.5px solid rgba(255,255,255,0.15); display: flex; justify-content: space-between; align-items: center; }
        .footer-brand { font-size: 9px; font-weight: 700; letter-spacing: 2px; color: rgba(255,255,255,0.5); text-transform: uppercase; }
        .footer-tag { display: flex; align-items: center; gap: 4px; }
        .footer-dot { width: 5px; height: 5px; border-radius: 50%; background: #4a9eff; opacity: 0.7; }
        .footer-obd { font-size: 9px; font-weight: 600; letter-spacing: 1px; color: rgba(255,255,255,0.45); text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <div class="map-box">${mapSvg}<div class="map-brand"><div class="map-brand-dot"></div><span class="map-brand-txt">PRODASH</span></div></div>
          <div class="body">
            <div class="car-name">Grand Livina</div>
            <div class="trip-date">${trip.date || "Unknown Date"}</div>
            <div class="accent-line"></div>
            <div class="stats-grid">
              <div class="stat"><div class="stat-label">Distance</div><div class="stat-val">${distNum.toFixed(1)}<span class="unit">km</span></div></div>
              <div class="stat"><div class="stat-label">Duration</div><div class="stat-val">${timeHtml}</div></div>
              <div class="stat"><div class="stat-label">Top Speed</div><div class="stat-val">${topSpeedNum}<span class="unit">km/h</span></div></div>
              <div class="stat"><div class="stat-label">Avg Speed</div><div class="stat-val">${avgSpeed}<span class="unit">km/h</span></div></div>
            </div>
            <div class="footer">
              <span class="footer-brand">Livina ProDash</span>
              <div class="footer-tag"><div class="footer-dot"></div><span class="footer-obd">Via OBD2</span></div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
