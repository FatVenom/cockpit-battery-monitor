# Installation Guide for Cockpit Battery Monitor

## Prerequisites

Before installing, ensure you have:

- Ubuntu Server or any Linux distribution with Cockpit
- `sudo` (root) access
- Cockpit already installed and running
- A laptop with a battery

### Check if Cockpit is installed

```bash
sudo systemctl status cockpit
```

If Cockpit is not installed:

```bash
# For Ubuntu/Debian
sudo apt-get update
sudo apt-get install cockpit

# For other distributions
# Refer to: https://cockpit-project.org/running.html
```

## Installation Methods

### Method 1: Automated Installation (Recommended) ⚡

The easiest and fastest way to install is using the provided installation script.

#### Steps:

1. **Clone or download the repository:**
   ```bash
   git clone https://github.com/yourusername/cockpit-battery-monitor.git
   cd cockpit-battery-monitor
   ```

2. **Make the install script executable:**
   ```bash
   chmod +x install.sh
   ```

3. **Run the installation script:**
   ```bash
   sudo bash install.sh
   ```

4. **Wait for completion** - The script will display a summary when done

#### What the Script Does:

The `install.sh` script automatically:

- ✅ Checks if you're running as root (sudo)
- ✅ Verifies Cockpit is installed and running
- ✅ Checks all required files exist
- ✅ Detects your battery device (BAT0, BAT1, etc.)
- ✅ Creates the module directory: `/usr/share/cockpit/battery-monitor`
- ✅ Backs up any existing installation
- ✅ Copies all module files
- ✅ Sets correct file permissions
- ✅ Restarts Cockpit service
- ✅ Shows installation summary with next steps

#### Sample Output:

```
╔════════════════════════════════════════════════════════════╗
║  Cockpit Battery Monitor Installation Script              ║
║  Version: 1.0                                             ║
╚════════════════════════════════════════════════════════════╝

ℹ Checking if Cockpit is installed...
✓ Cockpit is installed
ℹ Checking if Cockpit service is running...
✓ Cockpit service is running
ℹ Verifying required files...
✓ Found: manifest.json
✓ Found: index.html
✓ Found: battery.js
✓ Found: battery-style.css
ℹ Creating module directory...
✓ Module directory created: /usr/share/cockpit/battery-monitor
ℹ Copying files to module directory...
✓ Copied: manifest.json
✓ Copied: index.html
✓ Copied: battery.js
✓ Copied: battery-style.css
ℹ Setting file permissions...
✓ Permissions set correctly
ℹ Verifying battery device...
✓ Battery device found: BAT1
  Manufacturer: Hewlett-Packard
  Model: PABAS0241231
ℹ Restarting Cockpit service...
✓ Cockpit service restarted successfully

╔════════════════════════════════════════════════════════════╗
║  Cockpit Battery Monitor Installation Complete!           ║
╚════════════════════════════════════════════════════════════╝

Installation Summary:
  Module Location: /usr/share/cockpit/battery-monitor
  Module Name:     Battery Monitor

Next Steps:
  1. Open your browser and go to: https://localhost:9090
  2. Log in with your credentials
  3. Look for 'Battery Monitor' in the sidebar under 'Tools'
  4. Click it to view your battery information

Configuration:
  The module automatically detects your battery device.
  If you need to change it, edit:
    /usr/share/cockpit/battery-monitor/battery.js
  And change the battery device path (line ~71)

Troubleshooting:
  If the module doesn't appear:
    1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
    2. Check Cockpit logs: sudo journalctl -u cockpit -f
    3. Verify battery: ls /sys/class/power_supply/
```

### Method 2: Manual Installation

If you prefer to install manually or the script doesn't work:

#### Step 1: Create the module directory

```bash
sudo mkdir -p /usr/share/cockpit/battery-monitor
```

#### Step 2: Copy the module files

Navigate to the repository directory and copy all files:

```bash
sudo cp manifest.json /usr/share/cockpit/battery-monitor/
sudo cp index.html /usr/share/cockpit/battery-monitor/
sudo cp battery.js /usr/share/cockpit/battery-monitor/
sudo cp battery-style.css /usr/share/cockpit/battery-monitor/
```

#### Step 3: Set proper permissions

```bash
sudo chmod -R 755 /usr/share/cockpit/battery-monitor
sudo chmod 644 /usr/share/cockpit/battery-monitor/*
```

#### Step 4: Restart Cockpit

```bash
sudo systemctl restart cockpit
```

#### Step 5: Access the module

1. Open your browser and go to `https://localhost:9090` (or your server's IP)
2. Log in with your credentials
3. Look for **"Battery Monitor"** in the sidebar under "Tools"
4. Click it to view your battery information

## Verification

### Verify Installation

Check if the module is installed correctly:

```bash
ls -la /usr/share/cockpit/battery-monitor/
```

You should see:
- manifest.json
- index.html
- battery.js
- battery-style.css

### Verify Permissions

Ensure all files are readable:

```bash
ls -l /usr/share/cockpit/battery-monitor/
```

All files should have at least `r--r--r--` (644) permissions.

### Test Battery Access

Verify that your battery files are accessible:

```bash
# Find your battery device
ls /sys/class/power_supply/

# Test reading battery capacity
cat /sys/class/power_supply/BAT0/capacity
```

If you see a number (0-100), your battery is detected correctly.

## Configuration

### Auto-detecting Battery Device

The module will automatically find your battery device. However, if it doesn't work:

1. **Find your battery device name:**
   ```bash
   ls /sys/class/power_supply/ | grep -i bat
   ```

2. **Edit battery.js:**
   ```bash
   sudo nano /usr/share/cockpit/battery-monitor/battery.js
   ```

3. **Find this line (around line 71):**
   ```javascript
   const batteryBasePath = "/sys/class/power_supply/BAT1";
   ```

4. **Replace BAT1 with your battery device** (e.g., BAT0, Battery, etc.)

5. **Save and restart Cockpit:**
   ```bash
   sudo systemctl restart cockpit
   ```

## Troubleshooting

### Issue: Script fails with permission error

**Solution:**

Make sure you're using `sudo`:
```bash
sudo bash install.sh
```

### Issue: Module doesn't appear in Cockpit sidebar

**Solution:**

1. Check Cockpit logs:
   ```bash
   sudo journalctl -u cockpit -n 50
   ```

2. Verify manifest.json syntax:
   ```bash
   cat /usr/share/cockpit/battery-monitor/manifest.json | python3 -m json.tool
   ```

3. Restart Cockpit:
   ```bash
   sudo systemctl restart cockpit
   ```

4. Clear browser cache (Ctrl+Shift+R) and reload

### Issue: Blank page when clicking Battery Monitor

**Solution:**

1. Open browser console (F12) and check for errors

2. Verify file permissions:
   ```bash
   ls -la /usr/share/cockpit/battery-monitor/
   ```

3. Check Cockpit logs:
   ```bash
   sudo journalctl -u cockpit -f
   ```

4. Verify battery files exist:
   ```bash
   ls -la /sys/class/power_supply/BAT1/
   ```

### Issue: No battery information displayed

**Solution:**

1. **Find your correct battery device:**
   ```bash
   cat /sys/class/power_supply/*/capacity
   ```

2. **Update battery.js** with the correct device name

3. **Restart Cockpit:**
   ```bash
   sudo systemctl restart cockpit
   ```

### Issue: "Permission denied" errors

**Solution:**

1. Ensure Cockpit process has read access to battery files (usually owned by root):
   ```bash
   sudo ls -la /sys/class/power_supply/BAT0/
   ```

2. Cockpit typically runs with sufficient privileges. If issues persist, restart the Cockpit socket:
   ```bash
   sudo systemctl restart cockpit.socket
   ```

### Issue: Module appears but shows error messages

**Solution:**

1. Check the browser console (F12) for specific error messages

2. Verify battery device path in battery.js matches your system:
   ```bash
   ls /sys/class/power_supply/
   ```

3. Test battery file access:
   ```bash
   sudo cat /sys/class/power_supply/BAT0/capacity
   ```

## Uninstallation

To remove the module:

```bash
sudo rm -rf /usr/share/cockpit/battery-monitor
sudo systemctl restart cockpit
```

The module will no longer appear in Cockpit.

## Updating

To update to the latest version:

1. **Pull the latest changes:**
   ```bash
   cd /path/to/cockpit-battery-monitor
   git pull origin main
   ```

2. **Re-run installation:**
   ```bash
   sudo bash install.sh
   ```

Or manually copy the updated files and restart Cockpit.

## System Support

### Tested On

- Ubuntu Server 20.04 LTS
- Ubuntu Server 22.04 LTS
- Debian 11
- Debian 12

### Requirements by Distribution

| Distribution | Battery Support | Cockpit Available |
|---|---|---|
| Ubuntu Server 18.04+ | ✅ Yes | ✅ Yes |
| Debian 10+ | ✅ Yes | ✅ Yes |
| Fedora | ✅ Yes | ✅ Yes |
| CentOS 8+ | ✅ Yes | ✅ Yes |

## Advanced Configuration

### Custom Battery Device Paths

Some systems may have battery information in different locations:

- `/sys/class/power_supply/BAT0/` (most common)
- `/sys/class/power_supply/BAT1/` (multiple batteries)
- `/sys/class/power_supply/Battery/` (some manufacturers)

Use the troubleshooting steps above to identify your battery location.

### Cockpit Configuration

For multi-machine setups, ensure Cockpit is properly configured:

```bash
sudo nano /etc/cockpit/cockpit.conf
```

Refer to [Cockpit documentation](https://cockpit-project.org/guide/latest/guide-authentication) for detailed configuration.

## Getting Help

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Review Cockpit logs:** `sudo journalctl -u cockpit -f`
3. **Verify your battery device:** `ls /sys/class/power_supply/`
4. **Open an issue** on GitHub with:
   - Your distribution and version
   - Output of `ls /sys/class/power_supply/`
   - Browser console errors (F12)
   - Cockpit log entries

## Quick Reference

| Task | Command |
|------|---------|
| Install (automated) | `sudo bash install.sh` |
| Install (manual) | See Method 2 above |
| Verify installation | `ls -la /usr/share/cockpit/battery-monitor/` |
| Check battery device | `ls /sys/class/power_supply/` |
| View Cockpit logs | `sudo journalctl -u cockpit -f` |
| Restart Cockpit | `sudo systemctl restart cockpit` |
| Uninstall | `sudo rm -rf /usr/share/cockpit/battery-monitor && sudo systemctl restart cockpit` |
| Update | `git pull && sudo bash install.sh` |

## Next Steps

After successful installation:

1. **Access Battery Monitor** from Cockpit sidebar
2. **Monitor battery health** regularly
3. **Report issues** if you find any bugs
4. **Share your experience** - star the project if you like it!

For more information, see [README.md](README.md).