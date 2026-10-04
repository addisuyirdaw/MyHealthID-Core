const fetch = require('node-fetch'); // might not be installed, better use native Node fetch if >= v18

async function testAI() {
  const patientId = "1c5929b9-2bb3-4375-aaa0-4829b0f5fa63";
  
  const startTime = Date.now();
  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        verifiedPatientId: patientId,
        language: 'EN',
        messages: [{ role: 'user', content: 'What should I do if I have a severe headache and fever?' }]
      })
    });
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    if (!res.ok) {
      console.error("HTTP Error:", res.status, await res.text());
      return;
    }
    
    const data = await res.json();
    console.log("Success! Latency:", latency, "ms");
    console.log("Response:", data.content || data.error || data);
  } catch (e) {
    console.error("Test failed:", e);
  }
}

testAI();
