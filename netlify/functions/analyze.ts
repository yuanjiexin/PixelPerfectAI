import type { Handler } from "@netlify/functions";

const cleanBase64 = (dataUrl: string) => {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
};

export const handler: Handler = async (event) => {
  try {
    const apiKey = (process.env.DASHSCOPE_API_KEY || process.env.VITE_DASHSCOPE_API_KEY) as string | undefined;
    if (!apiKey) {
      return { statusCode: 500, body: "DASHSCOPE_API_KEY is missing (ensure site env set and redeployed)" };
    }

    if (!event.body) {
      return { statusCode: 400, body: "Missing body" };
    }

    const { designImageBase64, devImageBase64, systemInstruction } = JSON.parse(event.body);
    if (!designImageBase64 || !devImageBase64) {
      return { statusCode: 400, body: "Missing images" };
    }

    const preferred = (process.env.DASHSCOPE_MODEL || process.env.VITE_DASHSCOPE_MODEL || "qwen2.5-vl") as string;
    const candidates = Array.from(new Set([preferred, "qwen-vl-plus", "qwen2.5-vl-plus", "qwen-vl-max", "qwen2.5-vl"]));

    for (const model of candidates) {
      const payload = {
        model,
        messages: [
          {
            role: "system",
            content: [{ type: "text", text: String(systemInstruction || "") }]
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Design Mockup (Target):" },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanBase64(designImageBase64)}` } },
              { type: "text", text: "Development Screenshot (Implementation):" },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanBase64(devImageBase64)}` } },
              { type: "text", text: "Compare and find visual discrepancies. Return result in Chinese." }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "AnalysisResult",
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                issues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      location: { type: "string" },
                      severity: { type: "string", enum: ["High", "Medium", "Low"] },
                      category: { type: "string", enum: ["Layout", "Style", "Content"] },
                      box_2d: { type: "array", items: { type: "number" } }
                    },
                    required: ["title", "description", "severity", "category", "location", "box_2d"]
                  }
                }
              },
              required: ["summary", "issues"]
            }
          }
        }
      };

      const res = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      if (!res.ok) {
        let code = "";
        try {
          const j = JSON.parse(text);
          code = j?.error?.code || j?.error?.type || "";
        } catch {}
        if (code === "model_not_found") {
          continue;
        }
        return { statusCode: res.status, body: text || "DashScope request failed" };
      }
      const data = JSON.parse(text);
      const content = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        continue;
      }
      return { statusCode: 200, body: content };
    }

    return { statusCode: 502, body: "All candidate models failed. Please set DASHSCOPE_MODEL to a valid model." };
  } catch (e: any) {
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
