// =======================================
// 1. Initialize the Map + Basemap
// =======================================

const map = L.map("map", {
  center: [22.32, 114.17],  // Hong Kong approx
  zoom: 12,
  minZoom: 10,
  maxZoom: 18
});

// CartoDB Dark Matter basemap
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, &copy; CARTO'
  }
).addTo(map);


// =======================================
// 2. Crash Risk Helpers
// =======================================

// Map risk_class -> color + label
function getRiskInfo(riskClass) {
  switch (riskClass) {
    case 0:
      return { color: "#969696", label: "No Recorded Crashes" };
    case 1:
      return { color: "#66bb6a", label: "Very Low Risk" };
    case 2:
      return { color: "#b0e57c", label: "Low Risk" };
    case 3:
      return { color: "#d4b800", label: "Moderate Risk" };
    case 4:
      return { color: "#ff9800", label: "High Risk" };
    case 5:
      return { color: "#e53935", label: "Very High Risk" };
    default:
      return { color: "#000000", label: "Unknown" };
  }
}

// Style for crash risk lines
function crashRiskStyle(feature) {
  const riskClass = feature.properties.risk_class;
  const riskInfo = getRiskInfo(riskClass);

  return {
    color: riskInfo.color,
    weight: 2,
    opacity: 0.9
  };
}

// Simple popup for crash layer (we'll fancy this up later)
function crashPopup(feature) {
  const p = feature.properties || {};
  const riskInfo = getRiskInfo(p.risk_class);

  const streetEn = p.STREET_ENAME || "N/A";
  const streetZh = p.STREET_CNAME || "";
  const segmentId = p.OBJECTID ?? "";
  const density = p["Crash Density_crash_density"];
  const crashCount = p["Crash Density_crash_crash_count"];

  const densityText =
    density !== undefined && density !== null
      ? density.toFixed(2) + " crashes/km"
      : "N/A";

  return `
    <div style="font-family:'Segoe UI',sans-serif;font-size:12px;">
      <b>🚕 Road Segment ${segmentId}</b><br>
      <b>Street:</b> ${streetEn}<br>
      <span style="color:#888;">${streetZh}</span><br><br>

      <b>Risk level:</b>
      <span style="color:${riskInfo.color};font-weight:bold;">
        ${riskInfo.label}
      </span><br>

      <b>Crash density:</b> ${densityText}<br>
      <b>Crash count:</b> ${crashCount ?? "N/A"}
    </div>
  `;
}


// =======================================
// 3. Create Crash Layer and Add to Map
// =======================================

// Debug: check that the crash data variable exists
console.log("typeof hk_risk_crash =", typeof hk_risk_crash);

const crashLayer = L.geoJSON(hk_risk_crash, {
  style: crashRiskStyle,
  onEachFeature: function (feature, layer) {
    layer.bindPopup(crashPopup(feature));
  }
});

crashLayer.addTo(map);

console.log("Crash risk layer loaded:", crashLayer);
