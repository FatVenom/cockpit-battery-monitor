# Cockpit Battery Stats

A beautiful and feature-rich Cockpit module that displays comprehensive battery statistics for laptops running Ubuntu Server with Cockpit.

## Features

✨ **Real-time Battery Monitoring**
- Live battery percentage with color-coded indicators
- Current charge status (Charging/Discharging/Full)
- Voltage and power usage monitoring

🔋 **Battery Health Analysis**
- Overall battery health percentage
- Design vs. current capacity comparison
- Health degradation warnings
- Battery wear assessment

⏱️ **Time Estimates**
- Estimated time until battery depletion (when discharging)
- Estimated time to full charge (when charging)

📊 **Battery History**
- Track last 30 battery readings
- Timestamp for each reading
- Historical data for trend analysis

⚠️ **Smart Alerts**
- Low battery critical warnings
- Battery degradation alerts
- Health status notifications

📱 **Beautiful Dashboard**
- Modern purple gradient UI
- Responsive design (desktop & mobile)
- Circular battery percentage indicator
- Visual progress bars
- Color-coded status badges

🔧 **Device Information**
- Manufacturer and model details
- Serial number
- Battery technology type (Li-ion, etc.)
- Charge cycle count

## Screenshots

The dashboard displays:
- Battery percentage with circular indicator
- Current charge and capacity information
- Voltage and power usage
- Battery health status
- Device manufacturer and model details
- Historical battery readings

## Requirements

- Ubuntu Server (or any Linux distribution)
- Cockpit installed and running
- Laptop with battery (BAT0, BAT1, or similar)
- Root/administrative access to Cockpit

## Installation

### Quick Install

```bash
# Clone the repository
git clone https://github.com/yourusername/cockpit-battery-stats.git

# Install
cd cockpit-battery-stats
sudo bash install.sh
```

### Manual Install

See [INSTALL.md](INSTALL.md) for detailed installation instructions.

## Configuration

The module automatically detects your battery device. If you have multiple batteries or a different battery device name, edit `battery.js` and update:

```javascript
const batteryBasePath = "/sys/class/power_supply/BAT1";
```

Replace `BAT1` with your battery device name. Find available devices with:

```bash
ls /sys/class/power_supply/
```

## Usage

1. Open Cockpit in your web browser (usually `https://localhost:9090`)
2. Log in with your credentials
3. In the sidebar under "Tools", click **"Battery Stats"**
4. View your battery information and statistics

The dashboard updates automatically every 30 seconds.

## Troubleshooting

### Blank Page

If you see a blank page:

1. **Check browser console** (F12) for errors
2. **Verify file permissions:**
   ```bash
   ls -la /usr/share/cockpit/battery-stats/
   ```
3. **Check Cockpit logs:**
   ```bash
   sudo journalctl -u cockpit -f
   ```
4. **Restart Cockpit:**
   ```bash
   sudo systemctl restart cockpit
   ```

### Battery Device Not Found

If battery information is not showing:

1. **Check available battery devices:**
   ```bash
   ls /sys/class/power_supply/
   ```
2. **Verify battery access:**
   ```bash
   cat /sys/class/power_supply/BAT0/capacity
   ```
3. **Update `battery.js`** with the correct battery device name

### Module Not Appearing in Sidebar

1. **Verify installation location:**
   ```bash
   ls /usr/share/cockpit/battery-stats/
   ```
2. **Check manifest.json** is properly formatted
3. **Restart Cockpit** and refresh browser


## How It Works

The module uses Cockpit's `cockpit.spawn()` API to safely read battery information from `/sys/class/power_supply/` without exposing system files directly to the browser. This approach:

- ✅ Maintains security (server-side execution)
- ✅ Avoids browser sandbox restrictions
- ✅ Provides real-time data updates
- ✅ Handles missing or unavailable battery files gracefully

## Supported Systems

- Ubuntu Server 18.04+
- Debian with Cockpit
- Any Linux distribution with Cockpit and battery support
- x86_64 and ARM architectures

## Known Limitations

- Requires `/sys/class/power_supply/` to be accessible (standard on most Linux systems)
- Some laptops may not provide all battery metrics (time estimates may show as "N/A")
- Battery device naming varies by manufacturer (auto-detection handles most cases)

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest improvements
- Submit pull requests
- Improve documentation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Created with ❤️ for the Cockpit and Ubuntu community.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Related Projects

- [Cockpit](https://cockpit-project.org/) - The web console for Linux servers
- [Ubuntu Server](https://ubuntu.com/server) - Ubuntu's server distribution
- [Battery Management on Linux](https://wiki.archlinux.org/title/Laptop)

---

**Note:** This is a community project and is not officially affiliated with the Cockpit project.
