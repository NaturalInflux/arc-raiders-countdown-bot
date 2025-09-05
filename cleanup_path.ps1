# PATH Cleanup Script
# This script will clean up your system PATH by removing duplicates and unnecessary entries

Write-Host "Current PATH Analysis:" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green

# Get current PATH
$currentPath = $env:PATH
$pathEntries = $currentPath -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }

Write-Host "Total entries: $($pathEntries.Count)" -ForegroundColor Yellow

# Identify issues
$issues = @()

# Check for duplicates (case-insensitive)
$duplicates = $pathEntries | Group-Object { $_.ToLower() } | Where-Object { $_.Count -gt 1 }
if ($duplicates) {
    $issues += "Duplicates found:"
    foreach ($dup in $duplicates) {
        $issues += "  - $($dup.Name) (appears $($dup.Count) times)"
    }
}

# Check for invalid entries
$invalidEntries = $pathEntries | Where-Object { $_ -eq '%PATH' -or $_ -match '\.exe$' }
if ($invalidEntries) {
    $issues += "Invalid entries:"
    foreach ($invalid in $invalidEntries) {
        $issues += "  - $invalid"
    }
}

# Check for non-existent directories
$nonExistent = $pathEntries | Where-Object { $_ -ne '%PATH' -and -not (Test-Path $_) }
if ($nonExistent) {
    $issues += "Non-existent directories:"
    foreach ($ne in $nonExistent) {
        $issues += "  - $ne"
    }
}

# Display issues
if ($issues.Count -gt 0) {
    Write-Host "`nIssues found:" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host $issue -ForegroundColor Red
    }
} else {
    Write-Host "`nNo issues found!" -ForegroundColor Green
}

Write-Host "`nRecommended Cleanup Actions:" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Java cleanup recommendations
$javaEntries = $pathEntries | Where-Object { $_ -match 'Eclipse Adoptium' }
if ($javaEntries.Count -gt 2) {
    Write-Host "`nJava Cleanup:" -ForegroundColor Yellow
    Write-Host "  - You have $($javaEntries.Count) Java installations"
    Write-Host "  - Consider keeping only 1-2 versions (e.g., latest LTS and one older)"
    Write-Host "  - Current entries:"
    foreach ($java in $javaEntries) {
        Write-Host "    * $java" -ForegroundColor Gray
    }
}

# Python cleanup recommendations
$pythonEntries = $pathEntries | Where-Object { $_ -match 'Python' }
if ($pythonEntries.Count -gt 2) {
    Write-Host "`nPython Cleanup:" -ForegroundColor Yellow
    Write-Host "  - You have $($pythonEntries.Count) Python installations"
    Write-Host "  - Consider keeping only 1-2 versions"
    Write-Host "  - Current entries:"
    foreach ($python in $pythonEntries) {
        Write-Host "    * $python" -ForegroundColor Gray
    }
}

# ImageMagick cleanup
$imagemagickEntries = $pathEntries | Where-Object { $_ -match 'ImageMagick' }
if ($imagemagickEntries.Count -gt 1) {
    Write-Host "`nImageMagick Cleanup:" -ForegroundColor Yellow
    Write-Host "  - You have $($imagemagickEntries.Count) ImageMagick versions"
    Write-Host "  - Consider keeping only the latest version"
    Write-Host "  - Current entries:"
    foreach ($im in $imagemagickEntries) {
        Write-Host "    * $im" -ForegroundColor Gray
    }
}

Write-Host "`nTo apply cleanup:" -ForegroundColor Green
Write-Host "1. Run this script to see recommendations" -ForegroundColor White
Write-Host "2. Manually edit your PATH in System Properties > Environment Variables" -ForegroundColor White
Write-Host "3. Or use the 'setx' command to update PATH programmatically" -ForegroundColor White
Write-Host "`nExample clean PATH (remove duplicates and keep latest versions):" -ForegroundColor Cyan

# Create a cleaned PATH example
$cleanPath = @(
    # System paths (keep these)
    'C:\WINDOWS\system32',
    'C:\WINDOWS',
    'C:\WINDOWS\System32\Wbem',
    'C:\WINDOWS\System32\WindowsPowerShell\v1.0\',
    
    # Development tools (keep latest)
    'C:\Program Files\PowerShell\7',
    'C:\Program Files\Git\cmd',
    'C:\Program Files\Git\mingw64\bin',
    'C:\Program Files\Git\usr\bin',
    'C:\Program Files\nodejs\',
    'C:\Program Files\dotnet\',
    
    # Java (keep latest LTS - 21 and 18)
    'C:\Program Files\Eclipse Adoptium\jre-21.0.8.9-hotspot\bin',
    'C:\Program Files\Eclipse Adoptium\jre-18.0.2.101-hotspot\bin',
    
    # Python (keep latest - 3.12)
    'C:\Python312\',
    'C:\Python312\Scripts\',
    
    # ImageMagick (keep latest - 7.1.2)
    'C:\Program Files\ImageMagick-7.1.2-Q16-HDRI',
    
    # Other tools
    'C:\FFmpeg\bin',
    'C:\Program Files\Docker\Docker\resources\bin',
    'C:\ProgramData\chocolatey\bin',
    'C:\Program Files\VSCodium\bin',
    'C:\Program Files\GitHub CLI\',
    'C:\Program Files\Tailscale\',
    'C:\Program Files\Apollo',
    'C:\Program Files\Apollo\tools',
    'C:\Users\YW\Scripts\mp3val',
    'C:\Users\YW\Scripts\flac\Win64',
    'C:\Users\YW\Scripts\chromaprint'
)

$cleanPathString = $cleanPath -join ';'
Write-Host $cleanPathString -ForegroundColor White

Write-Host "`nTo apply this clean PATH, run:" -ForegroundColor Green
Write-Host "setx PATH `"$cleanPathString`"" -ForegroundColor Yellow
Write-Host "`nNote: You'll need to restart your terminal for changes to take effect." -ForegroundColor Magenta
