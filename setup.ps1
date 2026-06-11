# =========================================================================
# MYHEALTHID CORE ONE-CLICK MIGRATION & SETUP SCRIPT
# =========================================================================
# Run this script on any new machine to instantly configure and start the app.
# Usage: Open PowerShell in this folder and run: .\setup.ps1

$ErrorActionPreference = "Stop"
Clear-Host

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   MyHealthID Core - Quick Setup Script   " -ForegroundColor Cyan -BackgroundColor DarkBlue
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check for Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please download Node.js from https://nodejs.org/ and restart PowerShell." -ForegroundColor Yellow
    Exit
}
Write-Host "✔ Node.js detected: $(node -v)" -ForegroundColor Green

# 2. Install Dependencies
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing project dependencies (npm install)... This may take a moment." -ForegroundColor Cyan
    npm install
    Write-Host "✔ Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✔ Dependencies already installed (node_modules exists)." -ForegroundColor Green
}

# 3. Create .env & .env.local if missing
$defaultUser = "myhealthid_prod"
$defaultPass = "AddisHealth2025DB"
$defaultHost = "cluster0.jpr7vag.mongodb.net/MyHealthID"

$envFiles = @(".env", ".env.local")
foreach ($file in $envFiles) {
    if (!(Test-Path $file)) {
        Write-Host "🔧 Creating configuration file: $file" -ForegroundColor Cyan
        
        $envContent = @"
# =========================================================================
# MYHEALTHID CORE APPLICATION CONFIGURATION
# =========================================================================
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database Connection (MongoDB Atlas Cloud Cluster)
DATABASE_URL="mongodb+srv://$defaultUser:$defaultPass@$defaultHost?retryWrites=true&w=majority"

# Authentication & Security
NEXTAUTH_SECRET="your_fallback_secure_nextauth_secret_here"
NEXTAUTH_URL=http://localhost:3000

# Local Medical RAG Engine Configuration
MEDICAL_INDEX_PATH="./lib/ai/knowledge-base/medical-index.json"
LOCAL_DICTIONARY_PATH="./lib/ai/dictionary.ts"

# Default Language Context (EN / AM)
NEXT_PUBLIC_DEFAULT_LANG="en"

# Cloud Backup & APIs
GEMINI_API_KEY="AIzaSyYourActualGeminiStudioAPIKeyGoesHere"
NEXT_PUBLIC_MOCK_FAYDA_VERIFICATION=true
FAYDA_API_ENDPOINT="https://api.fayda.gov.et/v1/verify"
"@
        [System.IO.File]::WriteAllText((Resolve-Path . -Relative) + "/" + $file, $envContent, [System.Text.UTF8Encoding]::new($false))
        Write-Host "✔ Created $file with default Atlas credentials." -ForegroundColor Green
    } else {
        Write-Host "✔ $file config already exists." -ForegroundColor Green
    }
}

# 4. Generate Prisma Client
Write-Host "🛠 Regenerating Prisma Client..." -ForegroundColor Cyan
npx prisma generate
Write-Host "✔ Prisma Client ready!" -ForegroundColor Green

# 5. Clean up any hanging local port 3000/3001 processes
Write-Host "🧹 Checking for hanging Node.js dev server processes..." -ForegroundColor Cyan
$processes = Get-NetTCPConnection -LocalPort 3000, 3001 -ErrorAction SilentlyContinue | 
             Where-Object { $_.State -eq 'Listen' } | 
             ForEach-Object { $_.OwningProcess } | 
             Unique

if ($processes) {
    Write-Host "Found hanging dev process IDs: $processes. Terminating to free up ports..." -ForegroundColor Yellow
    foreach ($procId in $processes) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Write-Host "✔ Ports cleared!" -ForegroundColor Green
} else {
    Write-Host "✔ Ports 3000 and 3001 are free." -ForegroundColor Green
}

# 6. Start the Server
Write-Host ""
Write-Host "🚀 Launching development server (npm run dev)..." -ForegroundColor Cyan
Write-Host "------------------------------------------" -ForegroundColor Gray
npm run dev
