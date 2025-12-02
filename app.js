// =======================================
// 1. Initialize the Map + Basemap
// =======================================

const map = L.map("map", {
  center: [22.32, 114.17],  // Hong Kong
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

// Risk color + label based on risk_class
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

// Line style for crash layer
function crashRiskStyle(feature) {
  const riskClass = feature.properties.risk_class;
  const riskInfo = getRiskInfo(riskClass);

  return {
    color: riskInfo.color,
    weight: 2,
    opacity: 0.9
  };
}

// Basic popup (we will upgrade this later)
function crashPopup(feature) {
  const p = feature.properties || {};
  const riskInfo = getRiskInfo(p.risk_class);

  return `
    <div style="font-family:'Segoe UI',sans-serif; font-size:12px;">
      <b>🚕 Road Segment ${p.OBJECTID ?? ""}</b><br>
      <b>Street:</b> ${p.STREET_ENAME || "N/A"}<br>
      <span style="color:#888;">${p.STREET_CNAME || ""}</span><br><br>

      <b>Risk level:</b>
      <span style="color:${riskInfo.color}; font-weight:bold;">
        ${riskInfo.label}
      </span><br>

      <b>Crash density:</b> ${
        p["Crash Density_crash_density"] !== undefined
          ? p["Crash Density_crash_density"].toFixed(2)
          : "N/A"
      } crashes/km<br>

      <b>Crash count:</b> ${p["Crash Density_crash_crash_count"] ?? "N/A"}
    </div>
  `;
}


// =======================================
// 3. Create Crash Layer and Add to Map
// =======================================

// hk_risk_crash comes from hk_risk_crash.js
const crashLayer = L.geoJSON(hk_risk_crash, {
  style: crashRiskStyle,
  onEachFeature: function (feature, layer) {
    layer.bindPopup(crashPopup(feature));
  }
});

crashLayer.addTo(map);

console.log("Crash risk layer loaded:", crashLayer);
