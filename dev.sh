#!/bin/bash
# Development script to run both Express and Angular concurrently

# Disable Angular analytics prompt
export NG_CLI_ANALYTICS=false

# Get absolute paths
ROOT_DIR=$(pwd)
CLIENT_DIR="$ROOT_DIR/client"

# Start Angular dev server in background (from client directory)
(cd "$CLIENT_DIR" && npx ng serve --configuration development --port 4200) &
ANGULAR_PID=$!

# Give Angular a moment to start
sleep 3

# Start Express server (from root directory)
(cd "$ROOT_DIR" && NODE_ENV=development npx tsx server/index.ts) &
EXPRESS_PID=$!

# Function to cleanup on exit
cleanup() {
  echo "Stopping servers..."
  kill $ANGULAR_PID $EXPRESS_PID 2>/dev/null
  exit
}

# Trap exit signals
trap cleanup INT TERM EXIT

# Wait for both processes
wait
