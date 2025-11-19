#!/bin/bash
# Production build script for Angular + Express

echo "Building Angular application..."
npx ng build --configuration production --output-path dist/client/browser

echo "Compiling Express server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build complete! Run 'npm start' to serve the application."
