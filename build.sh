#!/usr/bin/env bash
set -e

# Install Python dependencies
pip install -r backend/requirements.txt

# Install and build frontend
cd frontend
npm install
npm run build
cd ..
