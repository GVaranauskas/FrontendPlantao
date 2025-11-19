#!/bin/bash
# Development script to run both Express and Angular concurrently

# Start Angular dev server in background
npx ng serve --configuration development --port 4200 &
ANGULAR_PID=$!

# Give Angular a moment to start
sleep 2

# Start Express server
NODE_ENV=development npx tsx server/index.ts &
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
