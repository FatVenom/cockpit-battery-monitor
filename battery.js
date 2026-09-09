// Current graph view filter (12h or 24h)
let graphViewHours = 24;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  updateBatteryStats();
  setInterval(updateBatteryStats, 30000); // Live UI refresh every 30s
});

// Helper function to read sysfs/files via cockpit.spawn
function readBatteryFile(path) {
  return cockpit.spawn(["cat", path])
    .then(output => output.trim())
    .catch(() => null);
}

// Function to format time in seconds to human readable
function formatTime(seconds) {
  if (!seconds || seconds < 0) return "N/A";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return hours + "h " + minutes + "m";
  }
  return minutes + "m";
}

// Function to get health status label
function getHealthStatus(health) {
  if (health >= 95) return "Excellent";
  if (health >= 80) return "Good";
  if (health >= 60) return "Fair";
  return "Poor";
}

// Function to create circular progress UI
function createCircularProgress(capacity) {
  const percent = parseInt(capacity) || 0;
  let cssClass = 'high';
  
  if (percent < 20) cssClass = 'low';
  else if (percent < 50) cssClass = 'medium';
  
  return `
    <div class="circular-progress ${cssClass}">
      <div class="circular-progress-inner">
        <div>${percent}%</div>
      </div>
    </div>
  `;
}

// Function to get status badge with AC support
function getStatusBadge(status, acOnline) {
  let badgeClass = 'status-full';
  let icon = '⚡ ';
  
  if (status === 'Charging') {
    badgeClass = 'status-charging';
    icon = '⬆️ ';
  } else if (status === 'Discharging') {
    badgeClass = 'status-discharging';
    icon = '⬇️ ';
  } else if (acOnline === '1') {
    badgeClass = 'status-full';
    icon = '🔌 ';
    status = status || 'AC Mains Connected';
  }
  
  return `<span class="status-badge ${badgeClass}">${icon}${status || 'Unknown'}</span>`;
}

// Auto-detect battery device path
async function detectBatteryPath() {
  const paths = [
    "/sys/class/power_supply/BAT1",
    "/sys/class/power_supply/BAT0",
    "/sys/class/power_supply/Battery"
  ];
  for (const p of paths) {
    const cap = await readBatteryFile(p + "/capacity");
    if (cap !== null) return p;
  }
  return "/sys/class/power_supply/BAT0";
}

// Auto-detect AC adapter path
async function detectACPath() {
  const paths = [
    "/sys/class/power_supply/AC",
    "/sys/class/power_supply/ACAD",
    "/sys/class/power_supply/ADP1",
    "/sys/class/power_supply/AC0"
  ];
  for (const p of paths) {
    const online = await readBatteryFile(p + "/online");
    if (online !== null) return p;
  }
  return null;
}

// Render Windows 11-style interactive bar graph using Native SVG (100% CSP Compliant)
function renderWindows11Graph(historyEntries, timeframeHours) {
  if (!historyEntries || historyEntries.length === 0) {
    return `
      <div class="graph-card">
        <div class="graph-header">
          <span class="graph-title">Battery levels</span>
        </div>
        <div class="graph-empty">
          <em>Collecting initial background battery logs... Please check back in a few minutes.</em>
        </div>
      </div>
    `;
  }

  // Filter entries based on selected timeframe (12h or 24h)
  const maxEntriesToDisplay = timeframeHours === 12 ? 48 : 96;
  const filteredEntries = historyEntries.slice(0, maxEntriesToDisplay).reverse();

  // Downsample to 24 bars max for clean spacing (like Windows 11)
  const barCount = 24;
  const step = Math.max(1, Math.floor(filteredEntries.length / barCount));
  const sampledEntries = [];

  for (let i = 0; i < filteredEntries.length; i += step) {
    sampledEntries.push(filteredEntries[i]);
    if (sampledEntries.length >= barCount) break;
  }

  const viewBoxWidth = 800;
  const viewBoxHeight = 180;
  const numBars = sampledEntries.length;
  const barGap = 12;
  const totalGaps = numBars - 1;
  const availableWidth = viewBoxWidth - (barGap * totalGaps);
  const barWidth = Math.max(10, Math.min(22, availableWidth / numBars));
  const totalChartWidth = (barWidth * numBars) + (barGap * totalGaps);
  const startX = (viewBoxWidth - totalChartWidth) / 2;

  let barsSvgHtml = '';

  sampledEntries.forEach((entry, idx) => {
    const pct = Math.min(100, Math.max(0, parseInt(entry.percent) || 0));
    let colorClass = 'bar-high';
    if (pct < 20) colorClass = 'bar-low';
    else if (pct < 50) colorClass = 'bar-medium';

    const isCharging = entry.status === 'Charging' || entry.acOnline === '1';
    
    // Scale 0-100% to height in SVG
    const maxBarH = 160;
    const barH = Math.max(6, (pct / 100) * maxBarH);
    const x = startX + idx * (barWidth + barGap);
    const y = viewBoxHeight - barH;

    barsSvgHtml += `
      <g class="bar-group" 
         data-time="${entry.time}" 
         data-percent="${pct}" 
         data-status="${entry.status || 'Discharging'}" 
         data-power="${entry.power || ''}" 
         data-temp="${entry.temp || ''}">
        <rect class="bar-rect ${colorClass}" x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" ry="4" />
        ${isCharging ? `<text class="charging-icon-svg" x="${x + barWidth/2}" y="${y - 6}" text-anchor="middle">⚡</text>` : ''}
      </g>
    `;
  });

  return `
    <div class="graph-card">
      <div class="graph-header">
        <span class="graph-title">Battery levels</span>
        <div class="graph-time-selector">
          <label for="timeframe-select">Time period: </label>
          <select id="timeframe-select">
            <option value="12" ${timeframeHours === 12 ? 'selected' : ''}>Last 12 hours</option>
            <option value="24" ${timeframeHours === 24 ? 'selected' : ''}>Last 24 hours</option>
          </select>
        </div>
      </div>

      <div class="graph-body">
        <div class="y-axis-labels">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>

        <div class="chart-area" id="chart-area-container">
          <div class="grid-line line-100"></div>
          <div class="grid-line line-50"></div>
          <div class="grid-line line-0"></div>

          <svg class="battery-svg-chart" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" preserveAspectRatio="none">
            ${barsSvgHtml}
          </svg>

          <div id="graph-floating-tooltip" class="graph-floating-tooltip"></div>
        </div>
      </div>

      <div class="x-axis-labels">
        <span>${sampledEntries[0] ? sampledEntries[0].time : ''}</span>
        <span>${sampledEntries[Math.floor(sampledEntries.length / 2)] ? sampledEntries[Math.floor(sampledEntries.length / 2)].time : ''}</span>
        <span>${sampledEntries[sampledEntries.length - 1] ? sampledEntries[sampledEntries.length - 1].time : ''}</span>
      </div>
    </div>
  `;
}

// Function to attach DOM event listeners (100% CSP Compliant, zero inline handlers)
function attachGraphEventListeners() {
  const timeframeSelect = document.getElementById("timeframe-select");
  if (timeframeSelect) {
    timeframeSelect.addEventListener("change", function() {
      graphViewHours = parseInt(this.value);
      updateBatteryStats();
    });
  }

  const tooltipElem = document.getElementById("graph-floating-tooltip");
  const chartContainer = document.getElementById("chart-area-container");

  if (tooltipElem && chartContainer) {
    const barGroups = document.querySelectorAll(".bar-group");
    barGroups.forEach(group => {
      group.addEventListener("mouseenter", function(e) {
        const time = this.getAttribute("data-time");
        const percent = this.getAttribute("data-percent");
        const status = this.getAttribute("data-status");
        const power = this.getAttribute("data-power");
        const temp = this.getAttribute("data-temp");

        let content = `<div class="tooltip-time">${time}</div>`;
        content += `<div class="tooltip-percent">${percent}%</div>`;
        content += `<div class="tooltip-status">${status}</div>`;
        if (power) content += `<div class="tooltip-detail">Power: ${power} W</div>`;
        if (temp && temp !== 'N/A') content += `<div class="tooltip-detail">Temp: ${temp} °C</div>`;

        tooltipElem.innerHTML = content;
        tooltipElem.style.display = "block";

        // Position tooltip relative to container
        const rect = this.getBoundingClientRect();
        const containerRect = chartContainer.getBoundingClientRect();
        const leftPos = rect.left - containerRect.left + (rect.width / 2);
        const topPos = rect.top - containerRect.top - 10;

        tooltipElem.style.left = leftPos + "px";
        tooltipElem.style.top = topPos + "px";
      });

      group.addEventListener("mouseleave", function() {
        tooltipElem.style.display = "none";
      });
    });
  }
}

// Main function to update battery stats
async function updateBatteryStats() {
  try {
    const batteryBasePath = await detectBatteryPath();
    const acBasePath = await detectACPath();
    const batteryDeviceName = batteryBasePath.split('/').pop();
    
    // Read core battery fields
    const capacity = await readBatteryFile(batteryBasePath + "/capacity");
    const status = await readBatteryFile(batteryBasePath + "/status");
    const capacityLevel = await readBatteryFile(batteryBasePath + "/capacity_level");
    
    // Read Ah metrics
    const chargeNow = await readBatteryFile(batteryBasePath + "/charge_now");
    const chargeFull = await readBatteryFile(batteryBasePath + "/charge_full");
    const chargeFullDesign = await readBatteryFile(batteryBasePath + "/charge_full_design");
    
    // Read Wh fallback metrics
    const energyNow = await readBatteryFile(batteryBasePath + "/energy_now");
    const energyFull = await readBatteryFile(batteryBasePath + "/energy_full");
    const energyFullDesign = await readBatteryFile(batteryBasePath + "/energy_full_design");
    
    // Read Voltage and Power/Current
    const voltageNow = await readBatteryFile(batteryBasePath + "/voltage_now");
    const currentNow = await readBatteryFile(batteryBasePath + "/current_now");
    const powerNow = await readBatteryFile(batteryBasePath + "/power_now");
    
    // Read Thermal metric
    const temp = await readBatteryFile(batteryBasePath + "/temp");
    
    // Read Charge Control Limit / Conservation Mode
    const chargeControlEnd = await readBatteryFile(batteryBasePath + "/charge_control_end_threshold");
    const conservationMode = await readBatteryFile("/sys/bus/platform/drivers/ideapad_acpi/conservation_mode");
    
    // Read Hardware Info
    const manufacturer = await readBatteryFile(batteryBasePath + "/manufacturer");
    const modelName = await readBatteryFile(batteryBasePath + "/model_name");
    const serialNumber = await readBatteryFile(batteryBasePath + "/serial_number");
    const technology = await readBatteryFile(batteryBasePath + "/technology");
    const cycleCount = await readBatteryFile(batteryBasePath + "/cycle_count");
    const timeToEmpty = await readBatteryFile(batteryBasePath + "/time_to_empty_now");
    const timeToFull = await readBatteryFile(batteryBasePath + "/time_to_full_now");
    
    // Read AC Power Adapter Info
    const acOnline = acBasePath ? await readBatteryFile(acBasePath + "/online") : null;
    const acType = acBasePath ? await readBatteryFile(acBasePath + "/type") : null;

    // Check if Persistent Background Log File Exists
    const bgLogRaw = await readBatteryFile("/var/log/cockpit-battery-history.json");
    let historyEntries = null;
    if (bgLogRaw) {
      try {
        const parsed = JSON.parse(bgLogRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          historyEntries = parsed;
        }
      } catch(e) {
        historyEntries = null;
      }
    }

    // Calculate power usage (W)
    let power = 0;
    if (powerNow) {
      power = parseInt(powerNow) / 1000000;
    } else if (currentNow && voltageNow) {
      const current = parseInt(currentNow);
      const voltage = parseInt(voltageNow);
      power = (current / 1000000) * (voltage / 1000000);
    }
    
    // Process Temperature (°C)
    let tempCelsius = null;
    if (temp) {
      tempCelsius = (parseInt(temp) / 10).toFixed(1);
    }
    
    // Calculate health & capacities (with Wh fallback)
    let health = 100;
    let currentCapStr = 'N/A';
    let fullCapStr = 'N/A';
    let designCapStr = 'N/A';

    if (chargeFullDesign && chargeFull) {
      const cFullDesign = parseInt(chargeFullDesign);
      const cFull = parseInt(chargeFull);
      const cNow = chargeNow ? parseInt(chargeNow) : 0;
      health = ((cFull / cFullDesign) * 100).toFixed(1);
      currentCapStr = (cNow / 1000000).toFixed(2) + ' Ah';
      fullCapStr = (cFull / 1000000).toFixed(2) + ' Ah';
      designCapStr = (cFullDesign / 1000000).toFixed(2) + ' Ah';
    } else if (energyFullDesign && energyFull) {
      const eFullDesign = parseInt(energyFullDesign);
      const eFull = parseInt(energyFull);
      const eNow = energyNow ? parseInt(energyNow) : 0;
      health = ((eFull / eFullDesign) * 100).toFixed(1);
      currentCapStr = (eNow / 1000000).toFixed(2) + ' Wh';
      fullCapStr = (eFull / 1000000).toFixed(2) + ' Wh';
      designCapStr = (eFullDesign / 1000000).toFixed(2) + ' Wh';
    }
    
    // Calculate time estimates
    let estimatedTimeToEmpty = "N/A";
    let estimatedTimeToFull = "N/A";
    
    if (status === "Discharging" && timeToEmpty) {
      estimatedTimeToEmpty = formatTime(parseInt(timeToEmpty));
    }
    if (status === "Charging" && timeToFull) {
      estimatedTimeToFull = formatTime(parseInt(timeToFull));
    }
    
    const healthStatus = getHealthStatus(health);
    
    // Build HTML Dashboard
    let html = '';
    
    // Main Status Card
    html += `
      <div class="battery-card">
        <div class="card-title">Battery Status</div>
        <div class="battery-percentage-container">
          ${createCircularProgress(capacity)}
          <div class="battery-info-section">
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value">${getStatusBadge(status, acOnline)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Power Source:</span>
              <span class="info-value">${acOnline === '1' ? `🔌 Connected ${acType ? '(' + acType + ')' : ''}` : '🔋 Battery Power'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Current Charge:</span>
              <span class="info-value">${currentCapStr}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Full Capacity:</span>
              <span class="info-value">${fullCapStr}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Voltage:</span>
              <span class="info-value">${voltageNow ? (parseInt(voltageNow) / 1000000).toFixed(2) : 'N/A'} V</span>
            </div>
            <div class="info-item">
              <span class="info-label">Power Usage:</span>
              <span class="info-value">${power.toFixed(2)} W</span>
            </div>
            ${tempCelsius !== null ? `
              <div class="info-item">
                <span class="info-label">Temperature:</span>
                <span class="info-value ${tempCelsius > 45 ? 'text-danger' : ''}">${tempCelsius} °C</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div>
          <div class="info-label">Charge Level ${capacityLevel ? '(' + capacityLevel + ')' : ''}</div>
          <div class="charge-bar">
            <div class="charge-fill" style="width: ${capacity}%">${capacity}%</div>
          </div>
        </div>
        
        ${estimatedTimeToEmpty !== "N/A" ? `
          <div class="time-estimate">
            ⏱️ Estimated time remaining: ${estimatedTimeToEmpty}
          </div>
        ` : ''}
        
        ${estimatedTimeToFull !== "N/A" ? `
          <div class="time-estimate">
            ⏱️ Estimated time to full: ${estimatedTimeToFull}
          </div>
        ` : ''}

        ${(chargeControlEnd || conservationMode === '1') ? `
          <div class="info-box">
            🛡️ <strong>Battery Protection Active:</strong> Charge threshold set to ${chargeControlEnd ? chargeControlEnd + '%' : '80% (Conservation Mode)'}.
          </div>
        ` : ''}
        
        ${tempCelsius !== null && tempCelsius > 45 ? `
          <div class="critical-box">
            🔥 <strong>High Temperature Warning!</strong> Battery is running hot (${tempCelsius} °C). Check cooling and ventilation.
          </div>
        ` : ''}
        
        ${parseInt(capacity) < 20 ? `
          <div class="critical-box">
            ⚠️ Low battery! Please charge your device soon.
          </div>
        ` : parseInt(capacity) < 50 ? `
          <div class="warning-box">
            ℹ️ Battery is below 50%. Consider charging soon.
          </div>
        ` : `
          <div class="success-box">
            ✓ Battery is operating normally.
          </div>
        `}
        
        <div class="last-update">Last updated: ${new Date().toLocaleTimeString()}</div>
      </div>
    `;
    
    // Render Windows 11 Graph Card ONLY IF Persistent Background History is Enabled/Present
    if (historyEntries !== null) {
      html += renderWindows11Graph(historyEntries, graphViewHours);
    }
    
    // Battery Health Card
    html += `
      <div class="battery-card">
        <div class="card-title">Battery Health</div>
        <div class="info-item">
          <span class="info-label">Health Status:</span>
          <span class="info-value">${health}% - ${healthStatus}</span>
        </div>
        <div class="health-bar">
          <div class="health-fill ${health < 60 ? 'critical' : health < 80 ? 'warning' : ''}" style="width: ${health}%"></div>
        </div>
        
        <div style="margin-top: 20px;">
          <div class="info-label">Design Capacity:</div>
          <span class="info-value">${designCapStr}</span>
        </div>
        
        <div style="margin-top: 15px;">
          <div class="info-label">Current Capacity:</div>
          <span class="info-value">${fullCapStr}</span>
        </div>
        
        ${health < 80 ? `
          <div class="warning-box">
            ⚠️ Battery health is degrading. Consider battery replacement soon.
          </div>
        ` : health < 95 ? `
          <div class="warning-box">
            ℹ️ Battery has normal wear. Performance may decrease over time.
          </div>
        ` : `
          <div class="success-box">
            ✓ Battery health is excellent!
          </div>
        `}
      </div>
    `;
    
    // Device Information Card with Hover Tooltip Icon
    html += `
      <div class="battery-card">
        <div class="card-title">Device Information</div>
        <div class="device-info-grid">
          <div class="device-info-item">
            <div class="device-info-label">Manufacturer</div>
            <div class="device-info-value">${manufacturer || 'N/A'}</div>
          </div>
          <div class="device-info-item">
            <div class="device-info-label">Model</div>
            <div class="device-info-value">${modelName || 'N/A'}</div>
          </div>
          <div class="device-info-item">
            <div class="device-info-label">Serial Number</div>
            <div class="device-info-value">${serialNumber || 'N/A'}</div>
          </div>
          <div class="device-info-item">
            <div class="device-info-label">Technology</div>
            <div class="device-info-value">${technology || 'N/A'}</div>
          </div>
          <div class="device-info-item">
            <div class="device-info-label">Charge Cycles</div>
            <div class="device-info-value">${cycleCount || '0'}</div>
          </div>
          <div class="device-info-item">
            <div class="device-info-label">
              Battery Device
              <span class="tooltip">ℹ️
                <span class="tooltiptext">${batteryBasePath}</span>
              </span>
            </div>
            <div class="device-info-value">${batteryDeviceName}</div>
          </div>
          ${tempCelsius !== null ? `
            <div class="device-info-item">
              <div class="device-info-label">Temperature</div>
              <div class="device-info-value">${tempCelsius} °C</div>
            </div>
          ` : ''}
          ${chargeControlEnd ? `
            <div class="device-info-item">
              <div class="device-info-label">Charge Limit</div>
              <div class="device-info-value">${chargeControlEnd}%</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    // Update DOM
    const elem = document.getElementById("battery-info");
    if (elem) {
      elem.innerHTML = html;
      attachGraphEventListeners();
    }
    
  } catch (error) {
    console.error("Error updating battery stats:", error);
    const elem = document.getElementById("battery-info");
    if (elem) {
      elem.innerHTML = `
        <div class="battery-card">
          <p class="loading-text"><strong>Error:</strong> ${error.message}</p>
        </div>
      `;
    }
  }
}
