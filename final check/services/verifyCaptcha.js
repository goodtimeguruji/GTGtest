import path from "path";
import { fileURLToPath } from "url";
import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Universal key path
const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "goodtimeguruji-491009-c45a856dd008.json");

// ✅ Use credentials properly
const client = new RecaptchaEnterpriseServiceClient({
  keyFilename: "./goodtimeguruji-491009-c45a856dd008.json",
});

export const verifyCaptcha = async (req, res, next) => {
  try {
    const token = req.body.token;

    if (!token) {
      return res.status(400).json({ message: "Captcha token missing" });
    }

    const projectID = "goodtimeguruji-491009";
    const recaptchaKey = "6LeLJL4sAAAAALSqbioODckXsMfSyi_ZTshk0ZDD";

    const recaptchaAction = req.path.includes("signup") ? "signup" : "login";

    const projectPath = client.projectPath(projectID);

    const request = {
      assessment: {
        event: {
          token: token,
          siteKey: recaptchaKey,
        },
      },
      parent: projectPath,
    };

    const [response] = await client.createAssessment(request);

    if (!response.tokenProperties.valid) {
      return res.status(403).json({
        message: "Invalid captcha",
        reason: response.tokenProperties.invalidReason,
      });
    }

    if (response.tokenProperties.action !== recaptchaAction) {
      return res.status(403).json({
        message: "Captcha action mismatch",
      });
    }

    const score = response.riskAnalysis.score;

    if (score < 0.5) {
      return res.status(403).json({
        message: "Captcha verification failed (low score)",
      });
    }

    next();

  } catch (err) {
    console.error("Captcha error:", err);
    res.status(500).json({ message: "Captcha verification error" });
  }
};