# German Bookshelf Setup Script
Write-Host "Setting up German Bookshelf application..." -ForegroundColor Green

# Create necessary directories if they don't exist
$directories = @(
    "src/components",
    "src/pages",
    "src/pages/admin",
    "src/hooks",
    "src/services",
    "src/types",
    "src/utils",
    "src/assets",
    "src/i18n",
    "src/i18n/locales/en",
    "src/i18n/locales/de",
    "src/context",
    "supabase"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        Write-Host "Creating directory: $dir" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Green
npm install

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
"@ | Out-File -FilePath ".env"
}

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "To start the development server, run: npm run dev" -ForegroundColor Cyan
Write-Host "Don't forget to update your .env file with your Supabase credentials!" -ForegroundColor Yellow
