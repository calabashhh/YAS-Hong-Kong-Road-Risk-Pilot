// === Map init ===
const map = L.map("map", {
  center: [22.32, 114.17], // HK approx
  zoom: 12,
  minZoom: 10,
  maxZoom: 18
});

// Dark basemap (Carto Dark Matter)
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, &copy; CARTO'
  }
).addTo(map);

// === Helpers ===

// Popup HTML builder (based on your QGIS HTML map tip)
function buildPopupContent(props) {
  // NOTE: adjust property names if needed to match your GeoJSON
  const streetE = props["STREET_ENAME"] || "";
  const streetC = props["STREET_CNAME"] || "";
  const lengthM = props["length_m"];
  const riskClass = props["risk_class"];

  const crashDensity = props["Crash Density_crash_density"];
  const crashCount = props["Crash Density_crash_crash_count"];
  const sevNorm = props["Severity Weighted_sev_norm"];
  const pctRain = props["vis_wea_refined_pct_rain"];
  const pctDarkTwilight = props["vis_wea_refined_pct_dark_or_twilight"];

  const litRatio = props["Lighting Level_roads_lit_summary_lit_ratio"];
  const crossingDensity = props["crossing_density"];
  const slopeMean = props["Road Slope_slp_mean_clean"];

  // risk class label + color
  const riskMap = {
    0: { label: "No Recorded Crashes", color: "#969696" },
    1: { label: "Very Low Risk", color: "#66bb6a" },
    2: { label: "Low Risk", color: "#b0e57c" },
    3: { label: "Moderate Risk", color: "#d4b800" },
    4: { label: "High Risk", color: "#ff9800" },
    5: { label: "Very High Risk", color: "#e53935" }
  };
  const riskInfo = riskMap[riskClass] || {
    label: "Unknown",
    color: "#000000"
  };

  const borderColor = riskInfo.color;

  const html = `
  <div style="
    background: rgba(240,240,240,0.90);
    padding: 12px 16px;
    border-radius: 8px;
    width: 260px;
    font-family: 'Segoe UI', sans-serif;
    font-size: 11.5px;
    line-height: 1.35;
    border-left: 6px solid ${borderColor};
    box-shadow: 0px 2px 8px rgba(0,0,0,0.25);
  ">
    <h3 style="margin:0; padding:0; font-size:15px;">🚕 Road Segment ${
      props["OBJECTID"] ?? ""
    }</h3>

    <b>Street:</b> ${streetE}<br>
    <span style="color:#555; font-size:10.5px;">${streetC}</span><br>
    <b>Segment Length:</b> ${lengthM?.toFixed(1) ?? ""} m

    <hr style="margin:6px 0; border:0; border-top:1px solid #ccc;">

    <h4 style="margin:0 0 2px 0; font-size:12.5px;">Crash-Based Risk Indicators</h4>
    <small style="color:#666;">(Historical crash data, 2014–2019)</small><br>

    <b>Risk Level:</b>
    <span style="font-weight:bold; color:${riskInfo.color};">
      ${riskInfo.label}
    </span><br>

    <b>Crash Density:</b> ${
      crashDensity != null ? crashDensity.toFixed(2) : ""
    } crashes/km<br>
    <b>Crash Count:</b> ${crashCount ?? ""}<br>
    <b>Severity Index:</b> ${sevNorm != null ? sevNorm.toFixed(2) : ""}<br>
    <b>Rain-Related Crashes:</b> ${
      pctRain != null ? (pctRain * 100).toFixed(1) : ""
    }%<br>
    <b>Dark/Twilight Crashes:</b> ${
      pctDarkTwilight != null ? (pctDarkTwilight * 100).toFixed(1) : ""
    }%

    <hr style="margin:6px 0; border:0; border-top:1px solid #ccc;">

    <h4 style="margin:0 0 2px 0; font-size:12.5px;">Road Environment Context</h4>
    <small style="color:#666;">(Road characteristics, not crash-derived)</small><br>

    <b>Lighting Ratio:</b> ${
      litRatio != null ? (litRatio * 100).toFixed(1) : ""
    }% lit<br>
    <b>Crossing Density:</b> ${
      crossingDensity != null ? crossingDensity.toFixed(2) : ""
    } crossings/100m<br>
    <b>Elevation Change:</b> ${
      slopeMean != null ? slopeMean.toFixed(2) : ""
    }% (mean)
  </div>
  `;

  return html;
}

// === CRASH DENSITY LAYER EXAMPLE ===

// color scale helper based on crash_density breaks (you can tweak thresholds to match QGIS)
function crashDensityColor(d) {
  // TODO: set these thresholds to match your QGIS breaks
  return d >= 2.0
    ? "#d73027" // Very High
    : d >= 0.8
    ? "#fc8d59" // High
    : d >= 0.3
    ? "#fee08b" // Moderate
    : d >= 0.1
    ? "#d9ef8b" // Low
    : "#91cf60"; // Very Low
}

function styleCrashDensity(feature) {
  const d = feature.properties["Crash Density_crash_density"];
  return {
    color: crashDensityColor(d),
    weight: 3,
    opacity: 0.9
  };
}

// We'll declare variables so we can reference layers later
let crashDensityLayer,
  severityLayer,
  rainLayer,
  darknessLayer,
  lightingLayer,
  crossingLayer,
  slopeLayer;

// Load GeoJSONs
Promise.all([
  fetch("data/hk_crash_density.geojson").then((r) => r.json()),
  fetch("data/hk_severity_weighted.geojson").then((r) => r.json()),
  fetch("data/hk_rain_risk.geojson").then((r) => r.json()),
  fetch("data/hk_darkness_risk.geojson").then((r) => r.json()),
  fetch("data/hk_lighting_level.geojson").then((r) => r.json()),
  fetch("data/hk_crossing_density.geojson").then((r) => r.json()),
  fetch("data/hk_terrain_elev_change.geojson").then((r) => r.json())
]).then(
  ([
    crashDensityData,
    severityData,
    rainData,
    darknessData,
    lightingData,
    crossingData,
    slopeData
  ]) => {
    // Crash density layer
    crashDensityLayer = L.geoJSON(crashDensityData, {
      style: styleCrashDensity,
      onEachFeature: (feature, layer) => {
        layer.bindPopup(buildPopupContent(feature.properties));
      }
    }).addTo(map);

    // TODO: define style functions for the other six layers
    // For now, we can just give them a placeholder style until we wire in real breaks/colors

    severityLayer = L.geoJSON(severityData, {
      style: { color: "#ff9800", weight: 3, opacity: 0.9 },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(buildPopupContent(feature.properties));
      }
    });

    rainLayer = L.geoJSON(rainData, {
      style: { color: "#4fc3f7", weight: 3, opacity: 0.9 },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(buildPopupContent(feature.properties));
      }
    });

    darknessLayer = L.geoJSON(darknessData, {
      style: { color: "#ba68c8", weight: 3, opacity: 0.9 },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(buildPopupContent(feature.properties));
      }
    });

    lightingLayer = L.geoJSON(lightingData, {
      style: { color: "#ffd54f", weight: 3, opacity: 0.9 },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(buildPopupContent(feature.properties));
      }
    });

    crossingLayer = L.geoJSON(crossingData, {
      style: { color: "#81c784", weight: 3, opacity: 0.9 },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(buildPopupContent(feature.properties));
      }
    });

    slopeLayer = L.geoJSON(slopeData, {
      style: { color: "#ff7043", weight: 3, opacity: 0.9 },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(buildPopupContent(feature.properties));
      }
    });

    // Layer control
    const overlayMaps = {
      "Crash Density": crashDensityLayer,
      "Severity-Weighted": severityLayer,
      "Rain Risk": rainLayer,
      "Darkness Risk": darknessLayer,
      "Lighting Level": lightingLayer,
      "Crossing Density": crossingLayer,
      "Terrain Elevation Change": slopeLayer
    };

    L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);

    // Initial legend
    updateLegend("Crash Density");

    // Update legend when overlay changed
    map.on("overlayadd", (e) => {
      for (const [name, layer] of Object.entries(overlayMaps)) {
        if (e.layer === layer) {
          updateLegend(name);
          break;
        }
      }
    });
  }
);

// === Legend builder ===
function updateLegend(activeLayerName) {
  const legendDiv = document.getElementById("legend");
  if (!legendDiv) return;

  if (activeLayerName === "Crash Density") {
    legendDiv.innerHTML = `
      <h4>Crash Density (crashes/km)</h4>
      <small>Historical crashes, 2014–2019</small>
      <div class="item"><span class="swatch" style="background:#91cf60;"></span>0–0.10 (Very Low)</div>
      <div class="item"><span class="swatch" style="background:#d9ef8b;"></span>0.10–0.30 (Low)</div>
      <div class="item"><span class="swatch" style="background:#fee08b;"></span>0.30–0.80 (Moderate)</div>
      <div class="item"><span class="swatch" style="background:#fc8d59;"></span>0.80–2.0 (High)</div>
      <div class="item"><span class="swatch" style="background:#d73027;"></span>2.0+ (Very High)</div>
    `;
  } else if (activeLayerName === "Rain Risk") {
    legendDiv.innerHTML = `
      <h4>Rain Risk (% of crashes in rain)</h4>
      <div class="item"><span class="swatch" style="background:#e0f7fa;"></span>0–8% (Very Low)</div>
      <div class="item"><span class="swatch" style="background:#80deea;"></span>8–23% (Low)</div>
      <div class="item"><span class="swatch" style="background:#4fc3f7;"></span>23–40% (Moderate)</div>
      <div class="item"><span class="swatch" style="background:#0288d1;"></span>40–75% (High)</div>
      <div class="item"><span class="swatch" style="background:#01579b;"></span>75–100% (Very High)</div>
    `;
  }
  // TODO: add similar blocks for Darkness, Lighting, Crossings, Slope, Severity
}
