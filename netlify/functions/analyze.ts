import type { Handler } from "@netlify/functions";

const cleanBase64 = (dataUrl: string) => {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
};

export const handler: Handler = async (event) => {
  try {
    const sanitize = (v?: string | null) => (v ? v.trim().replace(/^['"`]+|['"`]+$/g, "") : undefined);
    const apiKey = sanitize(process.env.DASHSCOPE_API_KEY || process.env.VITE_DASHSCOPE_API_KEY);
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

    const preferred = sanitize(process.env.DASHSCOPE_MODEL || process.env.VITE_DASHSCOPE_MODEL) || "qwen2.5-vl";
    const candidates = Array.from(new Set([preferred, "qwen-vl-plus", "qwen2.5-vl-plus", "qwen-vl-max", "qwen2.5-vl"]));
    const base1 = sanitize(process.env.DASHSCOPE_ENDPOINT || process.env.VITE_DASHSCOPE_ENDPOINT) || "https://dashscope.aliyuncs.com";
    const endpoints = [
      base1 + "/compatible-mode/v1/chat/completions",
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"
    ];
    const endpointsRest = [
      base1 + "/api/v1/services/aigc/multimodal-generation/generate",
      "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generate"
    ];

    for (const endpoint of endpoints) {
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

        const controller = new AbortController();
        const timeoutMs = Number(process.env.DASHSCOPE_TIMEOUT_MS || 20000);
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let text = "";
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          text = await res.text();
          clearTimeout(timer);

          if (!res.ok) {
            let code = "";
            try {
              const j = JSON.parse(text);
              code = j?.error?.code || j?.error?.type || "";
            } catch {}
            if (code === "model_not_found") {
              continue;
            }
            // If HTML timeout page returned by upstream, try next endpoint/model
            if (/^\s*<html/i.test(text)) {
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
        } catch (err: any) {
          clearTimeout(timer);
          // Abort (timeout) or network error: try next endpoint/model
          continue;
        }
      }
    }

    for (const endpoint of endpointsRest) {
      for (const model of candidates) {
        const payload = {
          model,
          input: {
            messages: [
              { role: "system", content: [{ type: "text", text: String(systemInstruction || "") }] },
              {
                role: "user",
                content: [
                  { type: "text", text: "Design Mockup (Target):" },
                  { type: "image", image: `data:image/jpeg;base64,${cleanBase64(designImageBase64)}` },
                  { type: "text", text: "Development Screenshot (Implementation):" },
                  { type: "image", image: `data:image/jpeg;base64,${cleanBase64(devImageBase64)}` },
                  { type: "text", text: "Compare and find visual discrepancies. Return result in Chinese and only JSON." }
                ]
              }
            ]
          },
          parameters: { result_format: "message" }
        };

        const controller = new AbortController();
        const timeoutMs = Number(process.env.DASHSCOPE_TIMEOUT_MS || 20000);
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let text = "";
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          text = await res.text();
          clearTimeout(timer);

          if (!res.ok) {
            if (/^\s*<html/i.test(text)) {
              continue;
            }
            return { statusCode: res.status, body: text || "DashScope request failed" };
          }

          const data = JSON.parse(text);
          const outputText = data?.output_text || (data?.output?.choices?.[0]?.message?.content?.find((p: any) => p?.text)?.text);
          if (!outputText || typeof outputText !== "string") {
            continue;
          }
          return { statusCode: 200, body: outputText };
        } catch (err: any) {
          clearTimeout(timer);
          continue;
        }
      }
    }

    return { statusCode: 502, body: "All candidate models/endpoints failed. Please set DASHSCOPE_MODEL to a valid visual model or configure DASHSCOPE_ENDPOINT." };
  } catch (e: any) {
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
