#!/bin/bash
# Deploy cutting settings app to the live FabMo approot AND the .fma archive
# Usage: ./deploy.sh

APP_ID="1548dde0-3a8e-11f1-be57-2d646270fddb"
DEST="/opt/fabmo/approot/approot/${APP_ID}.fma"
ARCHIVE="/opt/fabmo/apps/${APP_ID}.fma"
SRC="/home/pi/fabmo-cutting-settings-app"
EXCLUDES="--exclude=.git --exclude=.github --exclude=.gitignore --exclude=build.ps1 --exclude=LICENSE --exclude=README.md --exclude=deploy.sh --exclude=node_modules --exclude=_sass --exclude=_javascript"

echo "Deploying cutting settings app..."

# Update the extracted approot (live files)
sudo rsync -av --delete $EXCLUDES "$SRC/" "$DEST/"

# Rebuild the .fma ZIP so restarts don't clobber changes
cd "$SRC"
rm -f /tmp/cutting-settings.fma
zip -r /tmp/cutting-settings.fma . \
  -x '.git/*' '.github/*' '.gitignore' 'build.ps1' 'LICENSE' 'README.md' 'deploy.sh' 'node_modules/*' '_sass/*' '_javascript/*'
sudo cp /tmp/cutting-settings.fma "$ARCHIVE"

echo "Done. Refresh your browser to see changes."
