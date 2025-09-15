import fetch from "node-fetch";

const KIE_API_KEY = "f9bc6acc93509c486b88ce0ff1f1131d";
const TASK_ID = "b792eb9feb25b8c216a3c8695d5fec9e";

async function getTaskResult(taskId) {
  const response = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${KIE_API_KEY}`
    }
  });

  const data = await response.json();

  if (data.data.state === "success") {
    // Result URLs are in resultJson
    const result = JSON.parse(data.data.resultJson);
    console.log("✅ Generated Images:", result.resultUrls);
    return result.resultUrls;
  } else if (data.data.state === "fail") {
    console.error("❌ Generation failed:", data.data.failMsg);
    return null;
  } else {
    console.log("⏳ Task still in progress, current state:", data.data.state);
    return null;
  }
}

// Usage
getTaskResult(TASK_ID);
