/**
 * Run this script to create a public `avatars` bucket in your Supabase project.
 *
 * Usage (PowerShell):
 * $env:SUPABASE_URL='https://your-project.supabase.co'; $env:SUPABASE_SERVICE_ROLE='your-service-role-key'; node .\scripts\create-avatar-bucket.js
 *
 * NOTE: This script requires a Supabase service role key. Do NOT commit or expose this key in client-side code.
 */

const { createClient } = require('@supabase/supabase-js')

async function main() {
  const url = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY

  if (!url || !serviceRole) {
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE environment variables')
    process.exit(1)
  }

  const supabase = createClient(url, serviceRole)

  try {
    const name = 'avatars'
    // check if bucket exists
    const { data: existing, error: listErr } = await supabase.storage.listBuckets()
    if (listErr) {
      console.error('Failed to list buckets:', listErr.message || listErr)
      process.exit(1)
    }

    const found = (existing || []).find(b => b.name === name)
    if (found) {
      console.log(`Bucket '${name}' already exists.`)
      process.exit(0)
    }

    const { data, error } = await supabase.storage.createBucket(name, { public: true })
    if (error) {
      console.error('Failed to create bucket:', error.message || error)
      process.exit(1)
    }

    console.log(`Created bucket '${name}':`, data)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

main()
