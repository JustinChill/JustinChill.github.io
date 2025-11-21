$files = Get-ChildItem -Path . -Filter *.html -Recurse -Exclude .git
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Update og:image URLs (handle both orders)
    # Case 1: content before property
    $content = $content -replace '(<meta\s+content=")imgs/(.*?)("\s+property="og:image"\s*/?>)', '${1}https://www.justinchill.com/imgs/${2}${3}'
    # Case 2: property before content
    $content = $content -replace '(<meta\s+property="og:image"\s+content=")imgs/(.*?)("\s*/?>)', '${1}https://www.justinchill.com/imgs/${2}${3}'
    
    # Update twitter:image URLs (handle both orders)
    # Case 1: content before property
    $content = $content -replace '(<meta\s+content=")imgs/(.*?)("\s+property="twitter:image"\s*/?>)', '${1}https://www.justinchill.com/imgs/${2}${3}'
    # Case 2: property before content
    $content = $content -replace '(<meta\s+property="twitter:image"\s+content=")imgs/(.*?)("\s*/?>)', '${1}https://www.justinchill.com/imgs/${2}${3}'

    # Also catch name="twitter:image"
     $content = $content -replace '(<meta\s+name="twitter:image"\s+content=")imgs/(.*?)("\s*/?>)', '${1}https://www.justinchill.com/imgs/${2}${3}'
    
    if ($content -ne $originalContent) {
        Write-Host "Updating $($file.Name)"
        $content | Set-Content $file.FullName -NoNewline
    }
}
