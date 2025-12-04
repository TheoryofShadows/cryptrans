# CrypTrans Devnet Deployment Script (Windows)
# This script deploys CrypTrans to Solana Devnet

Write-Host "🚀 CrypTrans Devnet Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if we're on devnet
Write-Host "📋 Current Solana config:" -ForegroundColor Yellow
solana config get

# Check balance
Write-Host "💰 Checking SOL balance..." -ForegroundColor Yellow
$balanceOutput = solana balance
$balance = $balanceOutput -replace ' SOL', ''
Write-Host "Current balance: $balance SOL" -ForegroundColor White

if ([double]$balance -lt 1.0) {
    Write-Host "❌ Insufficient SOL balance. Need at least 1 SOL for deployment." -ForegroundColor Red
    Write-Host "💡 Request devnet SOL: solana airdrop 2" -ForegroundColor Green
    Write-Host "   Or visit: https://faucet.solana.com/" -ForegroundColor Green
    exit 1
}

Write-Host "✅ Sufficient balance for deployment" -ForegroundColor Green

# Deploy the program
Write-Host "📦 Deploying CrypTrans program to devnet..." -ForegroundColor Yellow
solana program deploy --program-id target/deploy/cryptrans-keypair.json target/deploy/cryptrans.so

Write-Host "✅ Deployment successful!" -ForegroundColor Green

# Verify deployment
Write-Host "🔍 Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
solana program show 57wFcRcKLeU2WuUbadwXR56TtdgijAFQX8X73PqDURVn

Write-Host "🎉 CrypTrans deployed to devnet!" -ForegroundColor Green
Write-Host "Program ID: 57wFcRcKLeU2WuUbadwXR56TtdgijAFQX8X73PqDURVn" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update API config with devnet program ID" -ForegroundColor White
Write-Host "2. Test basic functionality with CLI/SDK" -ForegroundColor White
Write-Host "3. Deploy API and frontend" -ForegroundColor White
Write-Host "4. Test end-to-end governance flow" -ForegroundColor White
