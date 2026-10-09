import dotenv from 'dotenv';
dotenv.config();

async function checkKeyDirect() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found in .env');
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  console.log('Sending direct HTTP GET request to list models...');
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (!res.ok) {
      console.log('❌ HTTP Error Status:', res.status);
      console.log('Raw Error Details:', JSON.stringify(data, null, 2));
    } else {
      console.log('✅ HTTP Success! Supported models:');
      if (data.models && data.models.length > 0) {
        data.models.forEach(m => console.log(` - ${m.name}`));
      } else {
        console.log('No models returned in response.');
      }
    }
  } catch (err) {
    console.error('Network request failed:', err);
  }
}

checkKeyDirect();
