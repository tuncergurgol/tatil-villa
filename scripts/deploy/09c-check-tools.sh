#!/usr/bin/env bash
set -euo pipefail
which node || true
which npm || true
which npx || true
which rclone || true
which python3 || true
which curl || true
ls /var/www/tatil-villa/node_modules/@aws-sdk/client-s3 2>/dev/null | head -n 5 || echo "no aws-sdk in app"
node -e 'try{require("@aws-sdk/client-s3");console.log("sdk-ok")}catch(e){console.log("no-sdk",e.message)}'
