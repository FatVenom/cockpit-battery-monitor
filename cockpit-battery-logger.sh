#!/bin/bash

#############################################################################
# Cockpit Battery Monitor - 48-Hour Background History Logger
# 
# Logs battery stats to /var/log/cockpit-battery-history.json every 15 min.
# Retains up to 192 entries (48 hours of data).
#############################################################################

LOG_FILE="/var/log/cockpit-battery-history.json"
MAX_ENTRIES=192

# Auto-detect battery sysfs path
BAT_PATH=""
for p in /sys/class/power_supply/BAT1 /sys/class/power_supply/BAT0 /sys/class/power_supply/Battery; do
    if [ -f "$p/capacity" ]; then
        BAT_PATH="$p"
        break
    fi
done

if [ -z "$BAT_PATH" ]; then
    exit 0
fi

# Auto-detect AC sysfs path
AC_PATH=""
for p in /sys/class/power_supply/AC /sys/class/power_supply/ACAD /sys/class/power_supply/ADP1 /sys/class/power_supply/AC0; do
    if [ -f "$p/online" ]; then
        AC_PATH="$p"
        break
    fi
done

# Helper function to read file safely
read_sys() {
    if [ -n "$1" ] && [ -f "$1" ]; then
        cat "$1" 2>/dev/null | tr -d '\n'
    fi
}

CAPACITY=$(read_sys "$BAT_PATH/capacity")
STATUS=$(read_sys "$BAT_PATH/status")
VOLTAGE=$(read_sys "$BAT_PATH/voltage_now")
CURRENT=$(read_sys "$BAT_PATH/current_now")
POWER=$(read_sys "$BAT_PATH/power_now")
TEMP=$(read_sys "$BAT_PATH/temp")

AC_ONLINE="0"
if [ -n "$AC_PATH" ]; then
    AC_ONLINE=$(read_sys "$AC_PATH/online")
fi

# Calculate power in Watts
POWER_W="0.00"
if [ -n "$POWER" ] && [ "$POWER" -gt 0 ] 2>/dev/null; then
    POWER_W=$(awk "BEGIN {printf \"%.2f\", $POWER / 1000000}")
elif [ -n "$CURRENT" ] && [ -n "$VOLTAGE" ] && [ "$CURRENT" -gt 0 ] 2>/dev/null; then
    POWER_W=$(awk "BEGIN {printf \"%.2f\", ($CURRENT / 1000000) * ($VOLTAGE / 1000000)}")
fi

# Temperature in Celsius
TEMP_C="N/A"
if [ -n "$TEMP" ] && [ "$TEMP" -gt 0 ] 2>/dev/null; then
    TEMP_C=$(awk "BEGIN {printf \"%.1f\", $TEMP / 10}")
fi

TIME_FMT=$(date +"%I:%M %p")
TIMESTAMP_SEC=$(date +"%s")

# Construct JSON entry
JSON_ENTRY=$(cat <<EOF
{"time":"$TIME_FMT","timestamp":$TIMESTAMP_SEC,"percent":${CAPACITY:-0},"status":"${STATUS:-Unknown}","acOnline":"${AC_ONLINE:-0}","power":"$POWER_W","temp":"$TEMP_C"}
EOF
)

# Initialize log file if missing
if [ ! -f "$LOG_FILE" ]; then
    echo "[]" > "$LOG_FILE"
    chmod 644 "$LOG_FILE"
fi

# Append entry into JSON array file
python3 -c "
import json
log_path = '$LOG_FILE'
entry = json.loads('''$JSON_ENTRY''')
try:
    with open(log_path, 'r') as f:
        data = json.load(f)
except Exception:
    data = []
if not isinstance(data, list):
    data = []
data.insert(0, entry)
data = data[:$MAX_ENTRIES]
with open(log_path, 'w') as f:
    json.dump(data, f, indent=2)
" 2>/dev/null || true
