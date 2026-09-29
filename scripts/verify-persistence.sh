#!/usr/bin/env bash
# Checks on a real phone that the Recess monitor survives what used to switch it off.
#
# Before running: connect the phone (USB debugging on), install the release build, open Recess,
# grant its permissions and turn the ON toggle on. Nothing here changes your settings; the steps
# that need you (swiping the app away, rebooting) are announced and wait for your confirmation.
#
#   scripts/verify-persistence.sh
#
# Set ADB=/path/to/adb if adb is not in the default location.

set -u
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
PKG="com.appblocker"
SERVICE="com.appblocker.service.MonitorService"
pass=0
fail=0

service_running() {
  "$ADB" shell dumpsys activity services "$PKG" 2>/dev/null | grep -q "$SERVICE"
}

# wait_for <seconds> <expect: up|down>
wait_for() {
  local limit=$1 want=$2 waited=0
  while [ "$waited" -lt "$limit" ]; do
    if service_running; then [ "$want" = up ] && return 0; else [ "$want" = down ] && return 0; fi
    sleep 5
    waited=$((waited + 5))
  done
  return 1
}

check() { # check <description> <exit-status>
  if [ "$2" -eq 0 ]; then echo "  PASS  $1"; pass=$((pass + 1)); else echo "  FAIL  $1"; fail=$((fail + 1)); fi
}

confirm() { # confirm <prompt>
  read -r -p "$1 [y/N] " answer
  [ "$answer" = "y" ] || [ "$answer" = "Y" ]
}

echo "== Precondition"
"$ADB" get-state >/dev/null 2>&1 || { echo "No phone attached (or not authorized)."; exit 2; }
service_running
check "MonitorService is running (is the toggle ON?)" $? 
[ "$fail" -eq 0 ] || { echo "Turn the toggle ON in the app and run again."; exit 2; }
"$ADB" shell dumpsys activity services "$PKG" | grep -m1 "foregroundServiceType" | sed 's/^ */  service: /'

echo
echo "== 1. Swipe the app away from Recents"
echo "   Open Recents on the phone and swipe Recess away. Do NOT use Force stop."
if confirm "Done?"; then
  wait_for 120 up
  check "service is running again within 2 minutes of the swipe" $?
fi

echo
echo "== 2. Force stop (expected to STAY down: this is Android's guarantee, not a bug)"
if confirm "Force-stop Recess now with adb?"; then
  "$ADB" shell am force-stop "$PKG"
  sleep 5
  service_running; [ $? -ne 0 ]
  check "service is down after a force-stop (as Android requires)" $?
  echo "   Now open the Recess app on the phone. Opening it should bring the monitor back."
  if confirm "App opened?"; then
    wait_for 30 up
    check "service came back after the app was opened" $?
  fi
fi

echo
echo "== 3. Reboot"
if confirm "Reboot the phone now? (unlock it after it starts, then this script continues)"; then
  "$ADB" reboot
  "$ADB" wait-for-device
  echo "   Unlock the phone; the monitor should start after you unlock."
  wait_for 240 up
  check "service is running within 4 minutes of the reboot (after unlock)" $?
fi

echo
echo "== 4. Turning it OFF must stay OFF"
echo "   In the app, tap the toggle to turn monitoring OFF."
if confirm "Toggle is OFF?"; then
  wait_for 30 down
  check "service stopped when the toggle was turned off" $?
  echo "   Waiting 3 minutes to make sure no alarm or watchdog brings it back..."
  sleep 180
  service_running; [ $? -ne 0 ]
  check "service is still down 3 minutes after being turned off" $?
fi

echo
echo "== Result: $pass passed, $fail failed"
echo "   Also useful: 'adb logcat -d -s Recess:I' and the app's 'last stop reason'."
[ "$fail" -eq 0 ]
