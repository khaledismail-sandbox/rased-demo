#!/bin/bash
# Assemble every page (except the standalone fix page) = shared head + body fragment from _tools/pages/.
cd "$(dirname "$0")/.."
while IFS=';' read -r route root kind title scripts; do
  [ -z "$route" ] && continue; [ "$route" = ROOT ] && route=""
  name=$(echo "$route" | sed 's#/$##; s#/#_#g'); [ -z "$name" ] && name=home
  mkdir -p "./$route"
  { _tools/head.sh "$root" "$kind" "$title" $scripts; cat "_tools/pages/$name.html"; echo "</html>"; } > "./${route}index.html"
  echo "built ${route:-/}index.html"
done <<'T'
ROOT;./;marketing;Rased | Fleet Management System;marketing.js
demo-request/;../;marketing;Rased | Request a Demo;marketing.js
demo-request/thank-you/;../../;marketing;Rased | Thank you;marketing.js
login/;../;login;Rased | Sign in;app.js
platform/dashboard/;../../;platform;Rased | Fleet Dashboard;app.js
platform/maintenance/;../../;platform;Rased | Maintenance;app.js
platform/maintenance/book/;../../../;platform;Rased | Book a Workshop;app.js
platform/maintenance/confirm/;../../../;platform;Rased | Booking Confirmation;app.js
platform/maintenance/orders/;../../../;platform;Rased | Maintenance Orders;app.js
platform/live-map/;../../;platform;Rased | Live Map;app.js
platform/operations/;../../;platform;Rased | Operations;app.js
platform/fuel/;../../;platform;Rased | Expenses & Fuel;app.js
platform/rental/;../../;platform;Rased | Rental;app.js
platform/alerts/;../../;platform;Rased | Alerts;app.js
platform/reports/;../../;platform;Rased | Reports;app.js
T
