@echo off
:: Self-elevate to Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [Vivacity] Requesting Administrator privileges to unblock Windows Firewall...
    powershell -NoProfile -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ================================================================
echo       VIVACITY FOOD COURT - PHONE CONNECTION FIREWALL FIX
echo ================================================================
echo.
echo [1/3] Removing existing Windows Firewall BLOCK rules for Node.js...
powershell -NoProfile -Command "Remove-NetFirewallRule -DisplayName 'Node.js JavaScript Runtime' -ErrorAction SilentlyContinue" >nul 2>&1
netsh advfirewall firewall delete rule name="Node.js JavaScript Runtime" >nul 2>&1

echo [2/3] Adding ALLOW rules for Node.js and Port 3000 across all profiles...
netsh advfirewall firewall add rule name="Node.js JavaScript Runtime" dir=in action=allow program="C:\Program Files\nodejs\node.exe" profile=any >nul
netsh advfirewall firewall add rule name="Vivacity Food Court (Port 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any >nul
echo       [OK] Node.js and Port 3000 are now unblocked.

echo.
echo [3/3] Setting Wi-Fi network to Private mode (allows phone access)...
powershell -NoProfile -Command "Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private" >nul 2>&1
echo       [OK] Wi-Fi network category set to Private.

echo.
echo ================================================================
echo [SUCCESS] Windows Firewall is now OPEN for your phone!
echo.
echo Now open this URL on your Android phone:
echo   http://192.168.31.22:3000/t/T17
echo.
echo NOTE: If the page still times out on Vivacity_Office, your router
echo has AP/Client Isolation enabled. If so:
echo   1. Turn ON Personal Hotspot on your phone.
echo   2. Connect your laptop to your phone's hotspot Wi-Fi.
echo ================================================================
echo.
pause
