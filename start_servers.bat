@echo off
echo Starting Beauty Affiliate Platform Backend...
cd /d "c:\Users\jania\beauty-affiliate-platform\backend"
node server.js
echo Backend started on port 5000

echo Starting Beauty Affiliate Platform Frontend...
cd /d "c:\Users\jania\beauty-affiliate-platform\frontend"
start "vite" cmd /c "c:\Users\jania\beauty-affiliate-platform\frontend\node_modules\.bin\vite"
echo Frontend started on port 5173