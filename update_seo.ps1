$files = Get-ChildItem -Path . -Filter *.html -Recurse -Exclude .git
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Remove keywords meta tag (case insensitive)
    $content = $content -replace '(?m)^\s*<meta name="keywords".*?>\r?\n?', ''
    
    # Update og:image URLs
    $content = $content -replace '(<meta content=")imgs/(.*?)(" property="og:image">)', '${1}https://www.justinchill.com/imgs/${2}${3}'
    
    # Update twitter:image URLs
    $content = $content -replace '(<meta content=")imgs/(.*?)(" property="twitter:image">)', '${1}https://www.justinchill.com/imgs/${2}${3}'
    
    if ($content -ne $originalContent) {
        Write-Host "Updating $($file.Name)"
        $content | Set-Content $file.FullName -NoNewline
    }
}
