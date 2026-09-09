#!/bin/bash

#############################################################################
# Cockpit Battery Monitor - Installation Script
#
# Automates installation of Cockpit Battery Monitor module and optional 
# 24/7 background logging systemd timer service.
#
# Usage: sudo bash install.sh [--with-logger | --without-logger]
#############################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Module information
MODULE_NAME="battery-monitor"
MODULE_DIR="/usr/share/cockpit/battery-monitor"
REQUIRED_FILES=("manifest.json" "index.html" "battery.js" "battery-style.css")

# Arguments parsing
ENABLE_LOGGER=""
for arg in "$@"; do
    case $arg in
        --with-logger)
            ENABLE_LOGGER="yes"
            ;;
        --without-logger)
            ENABLE_LOGGER="no"
            ;;
    esac
done

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_cockpit() {
    print_info "Checking if Cockpit is installed..."
    if ! command -v cockpit-bridge &> /dev/null; then
        print_error "Cockpit is not installed"
        echo ""
        echo "To install Cockpit, run:"
        echo "  sudo apt-get update && sudo apt-get install cockpit"
        exit 1
    fi
    print_success "Cockpit is installed"
}

check_cockpit_running() {
    print_info "Checking if Cockpit service is running..."
    if ! systemctl is-active --quiet cockpit.service; then
        print_warning "Cockpit service is not running"
        print_info "Starting Cockpit service..."
        systemctl start cockpit.service
        print_success "Cockpit service started"
    else
        print_success "Cockpit service is running"
    fi
}

verify_files() {
    print_info "Verifying required files..."
    local missing_files=0
    for file in "${REQUIRED_FILES[@]}"; do
        if [[ ! -f "$file" ]]; then
            print_error "Missing file: $file"
            missing_files=$((missing_files + 1))
        else
            print_success "Found: $file"
        fi
    done
    
    if [[ $missing_files -gt 0 ]]; then
        print_error "Some required files are missing"
        exit 1
    fi
}

create_module_directory() {
    print_info "Creating module directory..."
    if [[ -d "$MODULE_DIR" ]]; then
        print_info "Updating existing installation in $MODULE_DIR..."
        BACKUP_DIR="/var/backups/cockpit-battery-monitor_backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p /var/backups
        cp -r "$MODULE_DIR" "$BACKUP_DIR" 2>/dev/null || true
        print_success "Backup created at: $BACKUP_DIR"
    else
        mkdir -p "$MODULE_DIR"
        print_success "Module directory created: $MODULE_DIR"
    fi
}

copy_files() {
    print_info "Copying files to module directory..."
    for file in "${REQUIRED_FILES[@]}"; do
        cp "$file" "$MODULE_DIR/"
        print_success "Copied: $file"
    done
}

set_permissions() {
    print_info "Setting file permissions..."
    chmod 755 "$MODULE_DIR"
    for file in "${REQUIRED_FILES[@]}"; do
        chmod 644 "$MODULE_DIR/$file"
    done
    print_success "Permissions set correctly"
}

verify_battery() {
    print_info "Verifying battery device..."
    local found_battery=0
    for bat in /sys/class/power_supply/BAT*; do
        if [[ -d "$bat" ]]; then
            found_battery=1
            bat_name=$(basename "$bat")
            print_success "Battery device found: $bat_name"
            if [[ -f "$bat/manufacturer" ]]; then
                mfg=$(cat "$bat/manufacturer")
                print_info "  Manufacturer: $mfg"
            fi
            if [[ -f "$bat/model_name" ]]; then
                model=$(cat "$bat/model_name")
                print_info "  Model: $model"
            fi
            break
        fi
    done
    if [[ $found_battery -eq 0 ]]; then
        print_warning "No battery device found in /sys/class/power_supply/"
    fi
}

setup_optional_logger() {
    if [[ -z "$ENABLE_LOGGER" ]]; then
        echo ""
        read -p "Do you want to install & enable persistent 48-hour battery history logging? [y/N]: " choice
        case "$choice" in 
            y|Y|yes|YES) ENABLE_LOGGER="yes" ;;
            *) ENABLE_LOGGER="no" ;;
        esac
    fi

    if [[ "$ENABLE_LOGGER" == "yes" ]]; then
        print_info "Installing background logger service..."
        cp cockpit-battery-logger.sh /usr/local/bin/
        chmod +x /usr/local/bin/cockpit-battery-logger.sh
        
        cp cockpit-battery-logger.service /etc/systemd/system/
        cp cockpit-battery-logger.timer /etc/systemd/system/
        
        systemctl daemon-reload
        systemctl enable --now cockpit-battery-logger.timer
        print_success "24/7 Background Logger Service installed and enabled!"
    else
        print_info "Skipping background logger installation (Can be enabled later anytime)."
    fi
}

restart_cockpit() {
    print_info "Restarting Cockpit service..."
    systemctl restart cockpit.service
    sleep 2
    if systemctl is-active --quiet cockpit.service; then
        print_success "Cockpit service restarted successfully"
    else
        print_error "Failed to restart Cockpit service"
        exit 1
    fi
}

cleanup() {
    jobs -p | xargs -r kill -9 2>/dev/null || true
    wait
}

trap cleanup EXIT

show_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  Cockpit Battery Monitor Installation Complete!          ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Installation Summary:"
    echo "  Module Location:   $MODULE_DIR"
    echo "  Module Name:       Battery Monitor"
    echo "  Background Logger: ${ENABLE_LOGGER:-no}"
    echo ""
    echo "Next Steps:"
    echo "  1. Open your browser and go to: https://localhost:9090"
    echo "  2. Log in with your credentials"
    echo "  3. Look for 'Battery Monitor' in the sidebar under 'Tools'"
    echo ""
}

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  Cockpit Battery Monitor Installation Script              ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  Version: 2.0                                             ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    check_root
    check_cockpit
    check_cockpit_running
    verify_files
    create_module_directory
    copy_files
    set_permissions
    verify_battery
    setup_optional_logger
    restart_cockpit
    show_summary
}

main "$@"
