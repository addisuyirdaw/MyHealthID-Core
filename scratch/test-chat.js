async function testChat() {
  const patientId = "870a9059-1165-4d3f-b6b5-d1e653362733"; // Patient ID from previous log

  const messages = [
    { role: "user", content: "I forgot how I should take my Amoxicillin medicine. Can you remind me?" }
  ];

  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "chat",
      messages,
      verifiedPatientId: patientId,
      language: "EN"
    })
  });

  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", data.content);
}

testChat().catch(console.error);
