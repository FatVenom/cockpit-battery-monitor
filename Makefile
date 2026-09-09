PREFIX ?= /usr
DATADIR ?= $(PREFIX)/share/cockpit/battery-monitor
BINDIR ?= $(PREFIX)/local/bin
SYSTEMDDIR ?= /etc/systemd/system

FILES = manifest.json index.html battery.js battery-style.css

all:
	@echo "Nothing to build for cockpit-battery-monitor. Run 'make install' to install."

install:
	install -d $(DESTDIR)$(DATADIR)
	install -m 644 $(FILES) $(DESTDIR)$(DATADIR)

install-service: install
	install -d $(DESTDIR)$(BINDIR)
	install -m 755 cockpit-battery-logger.sh $(DESTDIR)$(BINDIR)/cockpit-battery-logger.sh
	install -d $(DESTDIR)$(SYSTEMDDIR)
	install -m 644 cockpit-battery-logger.service $(DESTDIR)$(SYSTEMDDIR)/cockpit-battery-logger.service
	install -m 644 cockpit-battery-logger.timer $(DESTDIR)$(SYSTEMDDIR)/cockpit-battery-logger.timer
	@echo "To activate 24/7 background battery history logging, run:"
	@echo "  sudo systemctl daemon-reload && sudo systemctl enable --now cockpit-battery-logger.timer"

uninstall:
	rm -rf $(DESTDIR)$(DATADIR)

uninstall-service: uninstall
	-systemctl disable --now cockpit-battery-logger.timer 2>/dev/null || true
	-systemctl stop cockpit-battery-logger.service 2>/dev/null || true
	rm -f $(DESTDIR)$(BINDIR)/cockpit-battery-logger.sh
	rm -f $(DESTDIR)$(SYSTEMDDIR)/cockpit-battery-logger.service
	rm -f $(DESTDIR)$(SYSTEMDDIR)/cockpit-battery-logger.timer
	rm -f /var/log/cockpit-battery-history.json
	-systemctl daemon-reload 2>/dev/null || true

.PHONY: all install install-service uninstall uninstall-service
