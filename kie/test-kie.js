import fetch from "node-fetch";

const GEMINI_KEY = "AIzaSyA0h0kXtR9IkewwnLDnZCyr0IaIchuL300";
const KIE_API_KEY = "f9bc6acc93509c486b88ce0ff1f1131d";

/* -------------------------------------------
1. Analyze Presenter & Product with Gemini 2.5
-------------------------------------------- */
async function analyzeImages(presenterUrl, productUrl) {
  const systemPrompt = `
You are a top-tier Creative Director. 
Analyze the presenter and product images provided. 
Give recommendations for:
- Pose adjustments, camera angle, outfit details for the presenter
- Lighting or scene suggestions to improve ad quality
Do NOT change the product image. Keep the presenter as the main character.
Respond in a structured, concise format.
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nPresenter Image: ${presenterUrl}\nProduct Image: ${productUrl}` }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();
  const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log("🔹 Image Analysis Recommendations:\n", analysis);
  return analysis;
}

/* -------------------------------------------
2. Enhance Prompt with Gemini 2.0
-------------------------------------------- */
async function enhancePrompt(prompt, analysis) {
  const systemPrompt = `
You are a world-class Creative Director. 
Refine ad prompts into detailed, premium instructions for AI image generation.

Rules:
- Only one final ad image is required.
- Use the presenter image exactly as provided.
  - Minor adjustments allowed: pose, camera angle, outfit details (as suggested in analysis)
  - Do NOT replace the character with another person.
- Product image must remain unchanged.
- Logo can be placed naturally.
- Background, lighting, and scene can be adjusted for a premium look.
- Composition must be balanced and ad-ready.
- Typography should be stylish and modern, no shadows.

Constraints:
- Keep under 4800 characters.
- Be specific, clear, and realistic.
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nImage Analysis:\n${analysis}\n\nRaw Idea:\n${prompt}` }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();
  const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text || prompt;
  console.log("🔹 Enhanced Prompt:\n", enhanced);
  return safePrompt(enhanced);
}

/* -------------------------------------------
3. Safe Prompt (limit to 4800 chars)
-------------------------------------------- */
function safePrompt(text) {
  const MAX = 4800;
  return text.length > MAX ? text.slice(0, MAX) : text;
}

/* -------------------------------------------
4. Create KIE Ad Task
-------------------------------------------- */
async function createAdTask({ prompt, presenter, product, logo, size = "1:1" }) {
  const analysis = await analyzeImages(presenter, product);
  const enhanced = await enhancePrompt(prompt, analysis);

  const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${KIE_API_KEY}`
    },
    body: JSON.stringify({
      model: "google/nano-banana-edit",
      input: {
        prompt: enhanced,
        image_urls: [presenter, product, logo],
        output_format: "png",
        image_size: size
      }
    })
  });

  const data = await response.json();
  console.log("✅ Task Created:", data);
  return data.taskId;
}

/* -------------------------------------------
5. Poll KIE for Task Completion
-------------------------------------------- */
async function getTaskResult(taskId) {
  let state = "";
  let resultUrls = null;

  while (state !== "success" && state !== "fail") {
    const response = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${KIE_API_KEY}` }
    });

    const data = await response.json();
    state = data.data.state;

    if (state === "success") {
      resultUrls = JSON.parse(data.data.resultJson).resultUrls;
      console.log("✅ Generated Image URLs:", resultUrls);
      return resultUrls;
    } else if (state === "fail") {
      console.error("❌ Generation failed:", data.data.failMsg);
      return null;
    } else {
      console.log(`⏳ Task in progress (${state}), checking again in 3s...`);
      await new Promise(res => setTimeout(res, 3000));
    }
  }
}

/* -------------------------------------------
6. Full Example Usage
-------------------------------------------- */
(async () => {
  const taskId = await createAdTask({
    prompt: `
      Create a premium Adidas ad campaign:
      - Use the presenter/character image exactly as provided (minor pose/outfit adjustments allowed)
      - Product image must remain unchanged
      - Add the Adidas logo naturally
      - Text: "Impossible is Nothing" in bold, modern typography
      - Background, lighting, and composition should be cinematic and professional
    `,
    presenter: "https://thumbs.dreamstime.com/b/close-up-male-feet-white-casual-shoes-fashionable-young-man-close-up-male-feet-white-casual-shoes-fashionable-young-367782511.jpg",
    product: "https://www.batabd.com/cdn/shop/files/1_ad606851-49c6-4ff0-afb9-e71894bf5f7e_1024x1024.jpg?v=1756574905",
    logo: "https://logos-marques.com/wp-content/uploads/2024/02/Adidas-Logo-1991.png",
    size: "1:1"
  });

  await getTaskResult(taskId);
})();
