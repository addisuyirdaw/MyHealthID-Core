async function runTests() {
  const patientId = "870a9059-1165-4d3f-b6b5-d1e653362733";
  const url = "http://localhost:3000/api/chat";

  async function ask(question) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat",
        messages: [{ role: "user", content: question }],
        verifiedPatientId: patientId,
        language: "EN"
      })
    });
    const data = await res.json();
    return data.error || data.content;
  }

  console.log("=== ERROR CHECK ===");
  console.log(await ask("Hello"));
}

runTests().catch(console.error);
