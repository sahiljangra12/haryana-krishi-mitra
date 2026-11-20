#!/usr/bin/env bash
# Stamp every JS/CSS URL with a new version so browsers and the GitHub Pages cache load fresh files after a deploy.
set -euo pipefail
cd "$(dirname "$0")/../docs"
V=${1:-$(date +%Y%m%d%H%M)}
sed -i -E "s#(from \"\./[a-z0-9]+\.js)(\?v=[0-9a-z]+)?\"#\1?v=$V\"#g" js/*.js
sed -i -E "s#(src=\"js/app\.js)(\?v=[0-9a-z]+)?\"#\1?v=$V\"#; s#(href=\"css/style\.css)(\?v=[0-9a-z]+)?\"#\1?v=$V\"#" index.html
echo "version $V"
