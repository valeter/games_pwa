#!/bin/bash
# Deploy all games to S3

source secrets.sh

set -euo pipefail

# === CONFIGURATION ===
# Set your S3 bucket name here
S3_BUCKET=games-pwa

# Find all game directories (containing index.html, not inside wip)
GAME_DIRS=$(find . -mindepth 2 -maxdepth 2 -type f -name 'index.html' -not -path '*/wip/*' -exec dirname {} \;)

# Deploy each game directory
for DIR in $GAME_DIRS; do
    GAME_NAME=$(basename "$DIR")
    echo "Deploying $DIR to $S3_BUCKET/$GAME_NAME ..."
    aws --endpoint-url=https://storage.yandexcloud.net/ --profile games-pwa s3 sync "$DIR" "s3://$S3_BUCKET/$GAME_NAME" --delete
    echo "Done: $DIR"
done

# Deploy root index.html (main menu)
echo "Deploying root index.html to $S3_BUCKET/index.html ..."
aws --endpoint-url=https://storage.yandexcloud.net/ --profile games-pwa s3 cp index.html "s3://$S3_BUCKET/index.html"
echo "Deployment complete." 