#!/bin/bash
# ClassMgr one-line start: restarts both frontend and backend
cd "$(dirname "$0")"
launchctl kickstart gui/$(id -u)/com.classmgr.backend 2>/dev/null || launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.classmgr.backend.plist
launchctl kickstart gui/$(id -u)/com.classmgr.frontend 2>/dev/null || launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.classmgr.frontend.plist
echo "ClassMgr started → http://$(ipconfig getifaddr en0 2>/dev/null || echo localhost):${CLSMGR_FRONTEND_PORT:-5173}/classmgr/"
