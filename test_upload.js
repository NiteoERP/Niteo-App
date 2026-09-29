const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Simulate mesero_sync.go upload
async function uploadCode(sedeId, masterKey) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sedes?id=eq.${sedeId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${masterKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ codigo_terminal: 'MESA-TEST' })
  });
  
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
}

uploadCode('acdc769e-4160-46f5-b5d6-aa5fc3a68854', 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjEyYzAwMmE5LTkwMzEtNDdmZi04MzVjLWViNjk3YTRiZjhiYSIsInR5cCI6IkpXVCJ9.eyJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc5MDE4NzY3N31dLCJhcHBfbWV0YWRhdGEiOnsiZW1wcmVzYV9pZCI6IjgxOGQxNTU1LWU4NzktNGYxZC04YmVkLTM5ZWI0NjZhYTVlMyIsInByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXSwic3Vic2NyaXB0aW9uX3N0YXR1cyI6IkFDVElWQSIsInVzZXJfcm9sZSI6Ik1BU1RFUiJ9LCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZW1haWwiOiJkaWVnb2x1ejMxMTJAZ21haWwuY29tIiwiZXhwIjoxNzkwMTkxMjc3LCJpYXQiOjE3OTAxODc2NzcsImlzX2Fub255bW91cyI6ZmFsc2UsImlzcyI6Imh0dHBzOi8vZ3FsaGlsbGlmcHhpemJhcWFhZ2wuc3VwYWJhc2UuY28vYXV0aC92MSIsInBob25lIjoiIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzZXNzaW9uX2lkIjoiMzQzOTU0NmItNTBiZS00ZDI5LWFiZjItNjhiYmVlYTdlNzA0Iiwic3ViIjoiNWU1MzY4NDItMjEzNi00OGFhLThkY2UtYTMxM2E3M2EzMTNmIiwidXNlcl9tZXRhZGF0YSI6eyJjb21wYW55X25hbWUiOiJFbCBQZWx1Y2hlIiwiZW1haWwiOiJkaWVnb2x1ejMxMTJAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IkRpZWdvIEx1emFyZG8iLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjVlNTM2ODQyLTIxMzYtNDhhYS04ZGNlLWEzMTNhNzNhMzEzZiJ9fQ.MRpK4W3uvpjPm3-Zf_yvdOboTutvf9XSGBTLbw4z6rNzuDRU1d4w8ewde0dk702_LiqZiKIPh8kCGyrybAVUiA');
