$connections = Get-NetTCPConnection -LocalPort 3000,3003 -ErrorAction SilentlyContinue
foreach ($conn in $connections) {
  Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 1

if (Test-Path ".next") {
  Remove-Item -Recurse -Force ".next"
}

npm run dev
