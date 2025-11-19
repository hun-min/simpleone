$content = Get-Content "src\App.js" -Raw -Encoding UTF8
$content = $content -replace "fontWeight: 'bold', fontSize: '16px', marginBottom: '4px'(?!, minHeight)", "fontWeight: 'bold', fontSize: '16px', marginBottom: '4px', minHeight: '24px'"
$content | Set-Content "src\App.js" -Encoding UTF8 -NoNewline
