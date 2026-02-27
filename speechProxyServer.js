// A simple local proxy server for LanguageConfidence API
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.post("/speechProxy", async (req, res) => {
  try {
    // Build API body: strip endpoint; keep expected_text for scripted (scripted/uk expects "expected_text", not "reference_text")
    const { endpoint: _e, expected_text: expectedText, script, ...rest } = req.body;
    let apiBody = { ...rest };
    delete apiBody.script;

    // Get base endpoint: query param wins, then body endpoint, then default to unscripted
    let targetEndpoint =
      req.query.endpoint ||
      _e ||
      "https://apis.languageconfidence.ai/speech-assessment/unscripted/uk";

    let isScripted =
      typeof targetEndpoint === "string" &&
      targetEndpoint.includes("speech-assessment/scripted");

    // Rule: only switch from scripted -> unscripted when expected_text is > 300 chars
    if (isScripted && expectedText != null) {
      const textForLength = String(expectedText).trim();
      if (textForLength.length > 300) {
        // Change to the matching unscripted endpoint, but ONLY in this case
        targetEndpoint = targetEndpoint.replace(
          "/scripted/",
          "/unscripted/"
        );
        isScripted = false;
      }
    }

    // Scripted: use the field name the API accepts (LC scripted/uk = "expected_text"; set LC_SCRIPT_FIELD to override)
    const scriptedTextField = process.env.LC_SCRIPT_FIELD || "expected_text";
    if (isScripted && expectedText != null && String(expectedText).trim() !== "") {
      let text = typeof expectedText === "string" ? expectedText : String(expectedText);
      // Avoid sending double-wrapped quotes (e.g. "\"I have a dream...\"")
      if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
        try {
          const unquoted = JSON.parse(text);
          if (typeof unquoted === "string") text = unquoted;
        } catch (_) {}
      }
      apiBody[scriptedTextField] = text;
    }

    // For scripted, send only whitelisted fields to avoid upstream 422 "Extra inputs are not permitted"
    if (isScripted) {
      apiBody = {
        audio_base64: apiBody.audio_base64,
        audio_format: apiBody.audio_format,
        ...(apiBody[scriptedTextField] != null && { [scriptedTextField]: apiBody[scriptedTextField] }),
      };
    }

    // Keep lc-beta-features false so we get the same response as Postman: includes "reading" and metadata.content_relevance
    const response = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.LC_API_KEY,
        "lc-beta-features": req.headers["lc-beta-features"] || "false",
      },
      body: JSON.stringify(apiBody),
    });

    const data = await response.json();
    res.set("Access-Control-Allow-Origin", "*");
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Proxy Error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Speech Proxy server running on http://localhost:${PORT}`));
