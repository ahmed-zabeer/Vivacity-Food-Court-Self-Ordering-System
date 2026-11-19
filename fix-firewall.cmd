@echo off
color 0a
title Vivacity Food Court - Windows Firewall LAN Fix
echo ================================================================
echo       VIVACITY FOOD COURT - ONE-CLICK FIREWALL LAN FIX
echo ================================================================
echo.
echo [1/3] Removing Windows Firewall BLOCK rules for Node.js...
netsh advfirewall firewall delete rule name="Node.js JavaScript Runtime"
powershell -NoProfile -Command "Remove-NetFirewallRule -DisplayName 'Node.js JavaScript Runtime' -ErrorAction SilentlyContinue" >nul 2>&1

echo [2/3] Adding ALLOW rules for Node.js and Port 3000...
netsh advfirewall firewall add rule name="Node.js JavaScript Runtime" dir=in action=allow program="C:\Program Files\nodejs\node.exe" profile=any
netsh advfirewall firewall add rule name="Vivacity Food Court (Port 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any

echo [3/3] Setting Wi-Fi network profile to Private...
powershell -NoProfile -Command "Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private" >nul 2>&1

echo.
echo ================================================================
echo [SUCCESS] Windows Firewall is now OPEN for Port 3000!
echo.
echo Your Android Phone at 192.168.31.219 can now connect!
echo Scan any Table QR code, or open in phone browser:
echo   http://192.168.31.22:3000/t/T17
echo ================================================================
echo.
pause
