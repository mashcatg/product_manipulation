import { fal } from "@fal-ai/client";

// ==========================
// 🔑 API Keys
// ==========================
const FAL_KEY = "8b7f3fe5-493e-465e-b0d7-3162fcdbb0a9:6c84bdb70bb2303bf36ceea33c2d9883";
const GEMINI_KEY = "AIzaSyA0h0kXtR9IkewwnLDnZCyr0IaIchuL300";

// ==========================
// ⚙️ Fal.ai Config
// ==========================
fal.config({ credentials: FAL_KEY });

// ==========================
// 📝 System Prompt
// ==========================
const systemPrompt = `
You are an expert creative director and advertising designer. 
Your task is to generate high-quality, realistic advertisement images that feature:
- The provided product (main focus).
- The presenter (natural, expressive, not robotic, not feels like ai generated).
- If a logo is provided, include it in a professional way.
- The background, lighting, and scene should enhance the overall ad quality.
- NEVER change the product image or the presentor or the logo.
- Change the presentor's pose, outfit as needed to fit the theme. NEVER PRESENTOR's FACE and body.
- Ensure the composition is balanced and visually appealing.
- Use realistic textures, lighting, and shadows to create a premium look.
- The final image should look like a high-end advertisement ready for publication.
`;

// ==========================
// ✍️ User Custom Prompt
// ==========================
const userPrompt = `
Create a high-end, visually captivating perfume ad featuring the presenter in a sophisticated, minimalist setting. 
The ad should convey elegance, sensuality, and modern luxury.
NEVER change the product image or the presentor or the logo image. change the presentor's pose, outfit as needed to fit the theme. The perfume bottle should be the focal point, with the presenter enhancing its allure.
Incorporate soft, diffused lighting to enhance the product's allure and the presenter's features. 
Use a neutral color palette with subtle accents that complement the perfume bottle design. 
The background should be clean and uncluttered, focusing attention on the product and presenter. 
Include the Ajmal Perfumes logo in a tasteful manner, ensuring it integrates seamlessly into the overall composition.
`;

// ==========================
// 🧹 Clean Gemini Output
// ==========================
function cleanGeminiText(text) {
  return text
    .replace(/\*\*/g, "") // remove bold markers
    .replace(/\*/g, "")   // remove bullet markers
    .replace(/#+\s?/g, "") // remove headings
    .replace(/Example Combined Prompt[\s\S]*/gi, "") // cut off examples/notes
    .replace(/Important Notes[\s\S]*/gi, "") // cut off notes
    .trim();
}

// ==========================
// 🤖 Enhance Prompt with Gemini
// ==========================
async function enhancePrompt(prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Enhance this advertisement design prompt for AI image generation. 
Make it concise, natural, and visually descriptive. Avoid markdown, lists, or meta notes:\n\n${prompt}`
              }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();
  let enhanced = data?.candidates?.[0]?.content?.parts?.[0]?.text || prompt;
  return cleanGeminiText(enhanced);
}

// ==========================
// 🎨 Run Fal Ad Generation
// ==========================
async function runFalAd() {
  try {
    // 1️⃣ Enhance prompt
    const enhancedPrompt = await enhancePrompt(userPrompt);
    console.log("\n✨ Clean Enhanced Prompt:\n", enhancedPrompt);

    // 2️⃣ Merge with system prompt
    const finalPrompt = `${systemPrompt}\n\n${enhancedPrompt}`;

    // 3️⃣ Call Fal.ai
    const result = await fal.subscribe("fal-ai/nano-banana/edit", {
      input: {
        prompt: finalPrompt,
        image_urls: [
          "https://in.ajmal.com/cdn/shop/files/YEARN_EDP_100ML_1.jpg?v=1719380645&width=1445", // product
          "https://tahmidurrahman.com/wp-content/uploads/2020/11/Favourits-scaled.jpg", // presenter
          "https://www.perfume-week.com/wp-content/uploads/2024/11/Ajmal-Logo.png" // logo
        ],
        num_images: 1,
        output_format: "jpeg",
        aspect_ratio: "16:9" // ✅ control ratio
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      }
    });

    console.log("\n✅ Generated Image URL:", result.data.images[0].url);
    console.log("🆔 Request ID:", result.requestId);
    console.log("📝 Description:", result.data.description);

  } catch (err) {
    console.error("❌ Error:", err);
  }
}

// ▶️ Run the script
runFalAd();
