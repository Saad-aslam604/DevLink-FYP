# DevLink auth automated test script (PowerShell)
# Usage: open PowerShell, cd to project root and run:
#   .\scripts\test-auth.ps1

$base = 'http://localhost:5002'
$errors = @()

function FailIf($condition, $message) {
  if ($condition) {
    Write-Host "[FAIL] $message" -ForegroundColor Red
    $script:errors += $message
  } else {
    Write-Host "[OK] $message" -ForegroundColor Green
  }
}

function Invoke-ApiRaw($method, $url, $bodyTable) {
  try {
    if ($bodyTable -ne $null) {
      $json = $bodyTable | ConvertTo-Json -Depth 10
      $resp = Invoke-RestMethod -Uri $url -Method $method -Body $json -ContentType 'application/json'
    } else {
      $resp = Invoke-RestMethod -Uri $url -Method $method
    }
    return $resp
  } catch {
    $err = $_
    $body = $null
    if ($err.Exception.Response -ne $null) {
      try {
        $stream = $err.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
      } catch {
        $body = $err.ToString()
      }
    } else {
      $body = $err.ToString()
    }
    return @{ __error = $true; body = $body }
  }
}

Write-Host "Starting DevLink auth automated tests" -ForegroundColor Cyan

# 1) Health check
Write-Host "\nTest 1: Health check" -ForegroundColor Cyan
$root = Invoke-ApiRaw GET "$base/" $null
if ($root -is [Hashtable] -and $root.success -eq $true) { FailIf($false, "Health check returned success") } else { FailIf($true, "Health check failed: $($root | ConvertTo-Json -Depth 3)") }

# Prepare a unique email to avoid duplicates
$ts = [int][double]::Parse((Get-Date -UFormat %s))
$email = "test+$ts@example.com"
$password = 'Password123'

# 2) Register (happy path)
Write-Host "\nTest 2: Register (happy path)" -ForegroundColor Cyan
$regBody = @{ email = $email; password = $password; role = 'junior' }
$reg = Invoke-ApiRaw POST "$base/api/auth/register" $regBody
if ($reg -is [Hashtable] -and $reg.success -eq $true -and $reg.data -and $reg.data.token) {
  $token = $reg.data.token
  FailIf($false, "Register succeeded and token returned")
} else {
  FailIf($true, "Register failed: $($reg.body)" )
}

# 3) Register validation error
Write-Host "\nTest 3: Register validation (bad data)" -ForegroundColor Cyan
$bad = @{ email = 'bad'; password = '123' }
$badResp = Invoke-ApiRaw POST "$base/api/auth/register" $bad
if ($badResp -is [Hashtable] -and $badResp.__error -eq $true) {
  # server returned non-2xx; check body for validation info
  if ($badResp.body -like '*VALIDATION_ERROR*' -or $badResp.body -like '*Validation failed*' -or $badResp.body -like '*Validation*') {
    FailIf($false, "Register returned validation error as expected")
  } else {
    FailIf($true, "Register bad-data response not recognized: $($badResp.body)")
  }
} else { FailIf($true, "Register bad-data did not fail as expected: $($badResp | ConvertTo-Json -Depth 3)") }

# 4) Login (correct credentials)
Write-Host "\nTest 4: Login (correct credentials)" -ForegroundColor Cyan
$loginBody = @{ email = $email; password = $password }
$login = Invoke-ApiRaw POST "$base/api/auth/login" $loginBody
if ($login -is [Hashtable] -and $login.success -eq $true -and $login.data -and $login.data.token) {
  $token = $login.data.token
  FailIf($false, "Login succeeded and token returned")
} else {
  FailIf($true, "Login failed: $($login | ConvertTo-Json -Depth 3)")
}

# 5) Login (wrong password)
Write-Host "\nTest 5: Login (wrong password)" -ForegroundColor Cyan
$badLogin = @{ email = $email; password = 'WrongPassword' }
$badLoginResp = Invoke-ApiRaw POST "$base/api/auth/login" $badLogin
if ($badLoginResp -is [Hashtable] -and $badLoginResp.__error -eq $true) {
  if ($badLoginResp.body -like '*Invalid email or password*' -or $badLoginResp.body -like '*401*') {
    FailIf($false, "Wrong-password login returned 401 as expected")
  } else {
    FailIf($true, "Wrong-password response unexpected: $($badLoginResp.body)")
  }
} else { FailIf($true, "Wrong-password login didn't fail as expected") }

# 6) Protected route with token
Write-Host "\nTest 6: GET /api/auth/me with token" -ForegroundColor Cyan
$hdr = @{ Authorization = "Bearer $token" }
$me = Invoke-ApiRaw GET "$base/api/auth/me" $null
# Using Invoke-RestMethod without headers above; call with headers explicitly
try { $me = Invoke-RestMethod -Uri "$base/api/auth/me" -Method Get -Headers $hdr -ContentType 'application/json' } catch { $err = $_; $me = @{ __error = $true; body = $err.Exception.Response.GetResponseStream() | ForEach-Object { $_ } } }
if ($me -is [Hashtable] -and $me.success -eq $true -and $me.data -and $me.data.user) { FailIf($false, "/me returned user with token") } else { FailIf($true, "/me failed with token: $($me | ConvertTo-Json -Depth 3)") }

# 7) Protected route without token
Write-Host "\nTest 7: GET /api/auth/me without token" -ForegroundColor Cyan
$meNo = Invoke-ApiRaw GET "$base/api/auth/me" $null
if ($meNo -is [Hashtable] -and $meNo.__error -eq $true) {
  if ($meNo.body -like '*No token*' -or $meNo.body -like '*Unauthorized*' -or $meNo.body -like '*Invalid token*') {
    FailIf($false, "/me without token failed as expected")
  } else {
    FailIf($true, "/me without token returned unexpected body: $($meNo.body)")
  }
} else { FailIf($true, "/me without token did not fail as expected: $($meNo | ConvertTo-Json -Depth 3)") }

# Summary
Write-Host "\nTest run complete" -ForegroundColor Cyan
if ($errors.Count -eq 0) {
  Write-Host "ALL TESTS PASSED" -ForegroundColor Green
  exit 0
} else {
  Write-Host "FAILED TESTS: $($errors.Count)" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
  exit 2
}
