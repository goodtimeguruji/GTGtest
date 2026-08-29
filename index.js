import dotenv from "dotenv";
dotenv.config();

import express         from "express";
import path            from "path";
import { fileURLToPath } from "url";
import cors            from "cors";
import helmet          from "helmet";
import rateLimit       from "express-rate-limit";
import { runAuspiciousCheckAcrossDatesModel } from "./models/models.js";
import { initDB }      from "./services/db.js";
import { verifyToken } from "./services/authMiddleware.js";

import runAuspiciousCheckAcrossDatesDeivaPrathishta  from "./services/deivaprathista.js";
import runAuspiciousCheckAcrossDatesAksharaaramba    from "./services/Aksharaaramba.js";
import runAuspiciousCheckAcrossDatesAnnaprasana      from "./services/Annaprasana.js";
import runAuspiciousCheckAcrossDatesInvestment       from "./services/investment.js";
import runAuspiciousCheckAcrossDatesVidhyaarambha    from "./services/vidhyaaramba.js";
import runAuspiciousCheckAcrossDatesPumsuvanam       from "./services/Pumsuvanam.js";
import runAuspiciousCheckAcrossDatesVishnuBali       from "./services/VishnuBali.js";
import runAuspiciousCheckAcrossDatesDeliveryAdmission from "./services/DeliveryAdmission.js";
import runAuspiciousCheckAcrossDatesChildCradling    from "./services/ChildCradling.js";
import runAuspiciousCheckAcrossDatesHeadShave        from "./services/HeadShave.js";
import runAuspiciousCheckAcrossDatesNewPortfolio     from "./services/NewPortfolio.js";
import runAuspiciousCheckAcrossDatesUpanayanam       from "./services/Upanayanam.js";
import runAuspiciousCheckAcrossDatesTravel           from "./services/Travel.js";
import runAuspiciousCheckAcrossDatesConstruction     from "./services/Construction.js";
import runAuspiciousCheckAcrossDatesGruhaPravesam    from "./services/GruhaPravesam.js";
import runAuspiciousCheckAcrossDatesNilaiPadi        from "./services/NilaiPadi.js";
import runAuspiciousCheckAcrossDatesVehiclePurchase  from "./services/VehiclePurchase.js";
import runAuspiciousCheckAcrossDatesStartBuisiness   from "./services/StartBuisiness.js";
import runAuspiciousCheckAcrossDatesTakingMedicine   from "./services/TakingMedicine.js";
import runAuspiciousCheckAcrossDatesSurgery          from "./services/Surgery.js";
import runAuspiciousCheckAcrossDatesArogyaSnanam     from "./services/ArogyaSnanam.js";
import runAuspiciousCheckAcrossDatesOilBath          from "./services/OilBath.js";
import runAuspiciousCheckAcrossDatesCultivation      from "./services/Cultivation.js";
import runAuspiciousCheckAcrossDatesPlantingSeeds    from "./services/PlantingSeeds.js";
import runAuspiciousCheckAcrossDatesCuttingGrains    from "./services/CuttingGrains.js";
import runAuspiciousCheckAcrossDatesLandRegistration from "./services/LandRegistration.js";
import runAuspiciousCheckAcrossDatesExamFees         from "./services/ExamFees.js";
import runAuspiciousCheckAcrossDatesNamakarana       from "./services/Namakarana.js";
import runAuspiciousCheckAcrossDatesShantimuhurtam   from "./services/Shantimuhurtam.js";
import runAuspiciousCheckAcrossDatesSeemantham   from "./services/Seemantham.js";
import { sendContactUsEmail }      from "./services/contactusemail.js";
import authRoutes                  from "./services/authRoutes.js";
import { createOrder, verifyPayment } from "./services/razorpayService.js";
import { sendMuhuratEmail }        from "./services/emailService.js";
import { notifyPaymentApiFailure } from "./services/paymentFailureEmail.js";
import profileRoutes from "./services/profileRoutes.js";
import {
  createMuhuratRequest,
  saveMuhuratResults,
  failMuhuratRequest
} from "./services/muhuratService.js";

const app        = express();
const PORT       = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://goodtimeguruji.in";

// 1. Trust proxy
app.set("trust proxy", 1);

// 2. Helmet + tight CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'","'unsafe-inline'","https://cdn.jsdelivr.net","https://accounts.google.com","https://apis.google.com","https://www.google.com","https://www.gstatic.com","https://checkout.razorpay.com","https://cdn.razorpay.com","https://lumberjack.razorpay.com"],
      connectSrc:     ["'self'","https://accounts.google.com","https://apis.google.com","https://api.razorpay.com","https://checkout.razorpay.com","https://cdn.razorpay.com","https://lumberjack.razorpay.com","https://api.geoapify.com","https://ipapi.co"],
      styleSrc:       ["'self'","'unsafe-inline'","https://cdn.jsdelivr.net","https://fonts.googleapis.com","https://accounts.google.com"],
      fontSrc:        ["'self'","https://fonts.gstatic.com","https://ssl.gstatic.com"],
      imgSrc:         ["'self'","data:","https:"],
      frameSrc:       ["https://accounts.google.com","https://www.google.com","https://checkout.razorpay.com","https://api.razorpay.com","https://cdn.razorpay.com","https://lumberjack.razorpay.com"],
      objectSrc:      ["'none'"],
      baseUri:        ["'self'"],
      formAction:     ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  // 1. ADD THIS: Allows the Google Popup to talk back to your site via window.opener
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  
  // 2. ADD THIS: Prevents corporate resource access block issues
  crossOriginResourcePolicy: { policy: "cross-origin" }, 
  
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  permissionsPolicy: false
}));


// Permissions-Policy
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(self)");
  next();
});

// 3. CORS — own domain only
app.use(cors({ origin: ALLOWED_ORIGIN, methods: ["GET","POST","PUT","DELETE"], allowedHeaders: ["Content-Type","Authorization"], credentials: true }));

// 4. Hide fingerprint
app.disable("x-powered-by");

// 5. Body parsers
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));



// (hpp removed — incompatible with Express 5: req.query is read-only)

// 8. Rate limiters
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: "Too many login attempts, please try again later." }, standardHeaders: true, legacyHeaders: false });
const apiLimiter  = rateLimit({ windowMs: 15*60*1000, max: 100, message: { error: "Too many requests, try again later." }, standardHeaders: true, legacyHeaders: false });
const muhuratLimiter = rateLimit({ windowMs: 60*60*1000, max: 5, message: { error: "Muhurat check limit reached, please try again later." }, standardHeaders: true, legacyHeaders: false });
const contactLimiter = rateLimit({ windowMs: 60*60*1000, max: 3, message: { error: "Too many contact requests, please try again later." }, standardHeaders: true, legacyHeaders: false });

app.use("/api/auth/login",  authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api",             apiLimiter);

// 9. Auth + Profile routes
app.use("/api/auth",    authRoutes);
app.use("/api/profile", profileRoutes);

// 10. Static files
app.use(express.static(path.join(__dirname, "public"), {
  etag: true, lastModified: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-store");
  }
}));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// 11. Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} — IP: ${req.ip}`);
  next();
});

// 12. Muhurat route helper — saves request + results to DB
const setupRoute = (routePath, handler) => {
  app.post(routePath, muhuratLimiter, verifyToken, async (req, res, next) => {
    let requestId = null;
    try {
      console.log(`[${new Date().toISOString()}] ✅ ${routePath} — user: ${req.user?.email}`);
      const validated = runAuspiciousCheckAcrossDatesModel.parse(req.body);

      // Service name = route suffix (e.g. "Aksharaaramba")
      const serviceName      = routePath.replace("/runAuspiciousCheckAcrossDates", "");
      // Human-readable function label sent from the frontend
      const selectedFunction = req.body.selectedFunction || serviceName;

      // 1. Persist the request (status = pending)
      requestId = await createMuhuratRequest({
        userId:           req.user.id,
        serviceName,
        selectedFunction,
        fromDate:         validated.fromDateStr,
        toDate:           validated.toDateStr,
        nakshatra:        validated.userNakshatra,
        rasi:             validated.userRasi,
        location:         validated.place,
        lat:              validated.lat,
        lon:              validated.lon,
        timezone:         String(validated.tzone)
      });

      console.log(`[${new Date().toISOString()}] 📝 Request #${requestId} created — ${serviceName}`);

      // 2. Run the muhurat engine
      const result = await handler(
        validated.fromDateStr,
        validated.toDateStr,
        validated.userNakshatra,
        validated.userRasi,
        validated.lat,
        validated.lon,
        validated.tzone,
        validated.place
      );

      // 3. Persist results
      await saveMuhuratResults(requestId, result);
      const total = (result.filtered?.length || 0) + (result.common?.length || 0);
      console.log(`[${new Date().toISOString()}] 💾 Request #${requestId} saved — ${total} result(s)`);

      // 4. Return result + requestId so the frontend can link to it
      res.json({ ...result, requestId });
    } catch (error) {
      if (requestId) {
        await failMuhuratRequest(requestId, error.message).catch(() => {});
        console.error(`[${new Date().toISOString()}] ❌ Request #${requestId} failed:`, error.message);
      }
      next(error);
    }
  });
};

// 13. Muhurat routes
setupRoute("/runAuspiciousCheckAcrossDatesDeivaPrathishta",  runAuspiciousCheckAcrossDatesDeivaPrathishta);
setupRoute("/runAuspiciousCheckAcrossDatesAksharaaramba",    runAuspiciousCheckAcrossDatesAksharaaramba);
setupRoute("/runAuspiciousCheckAcrossDatesAnnaprasana",      runAuspiciousCheckAcrossDatesAnnaprasana);
setupRoute("/runAuspiciousCheckAcrossDatesInvestment",       runAuspiciousCheckAcrossDatesInvestment);
setupRoute("/runAuspiciousCheckAcrossDatesVidhyaarambha",    runAuspiciousCheckAcrossDatesVidhyaarambha);
setupRoute("/runAuspiciousCheckAcrossDatesPumsuvanam",       runAuspiciousCheckAcrossDatesPumsuvanam);
setupRoute("/runAuspiciousCheckAcrossDatesVishnuBali",       runAuspiciousCheckAcrossDatesVishnuBali);
setupRoute("/runAuspiciousCheckAcrossDatesDeliveryAdmission",runAuspiciousCheckAcrossDatesDeliveryAdmission);
setupRoute("/runAuspiciousCheckAcrossDatesChildCradling",    runAuspiciousCheckAcrossDatesChildCradling);
setupRoute("/runAuspiciousCheckAcrossDatesHeadShave",        runAuspiciousCheckAcrossDatesHeadShave);
setupRoute("/runAuspiciousCheckAcrossDatesNewPortfolio",     runAuspiciousCheckAcrossDatesNewPortfolio);
setupRoute("/runAuspiciousCheckAcrossDatesUpanayanam",       runAuspiciousCheckAcrossDatesUpanayanam);
setupRoute("/runAuspiciousCheckAcrossDatesTravel",           runAuspiciousCheckAcrossDatesTravel);
setupRoute("/runAuspiciousCheckAcrossDatesConstruction",     runAuspiciousCheckAcrossDatesConstruction);
setupRoute("/runAuspiciousCheckAcrossDatesGruhaPravesam",    runAuspiciousCheckAcrossDatesGruhaPravesam);
setupRoute("/runAuspiciousCheckAcrossDatesNilaiPadi",        runAuspiciousCheckAcrossDatesNilaiPadi);
setupRoute("/runAuspiciousCheckAcrossDatesVehiclePurchase",  runAuspiciousCheckAcrossDatesVehiclePurchase);
setupRoute("/runAuspiciousCheckAcrossDatesStartBuisiness",   runAuspiciousCheckAcrossDatesStartBuisiness);
setupRoute("/runAuspiciousCheckAcrossDatesTakingMedicine",   runAuspiciousCheckAcrossDatesTakingMedicine);
setupRoute("/runAuspiciousCheckAcrossDatesSurgery",          runAuspiciousCheckAcrossDatesSurgery);
setupRoute("/runAuspiciousCheckAcrossDatesArogyaSnanam",     runAuspiciousCheckAcrossDatesArogyaSnanam);
setupRoute("/runAuspiciousCheckAcrossDatesOilBath",          runAuspiciousCheckAcrossDatesOilBath);
setupRoute("/runAuspiciousCheckAcrossDatesNamakarana",       runAuspiciousCheckAcrossDatesNamakarana);
setupRoute("/runAuspiciousCheckAcrossDatesCultivation",      runAuspiciousCheckAcrossDatesCultivation);
setupRoute("/runAuspiciousCheckAcrossDatesPlantingSeeds",    runAuspiciousCheckAcrossDatesPlantingSeeds);
setupRoute("/runAuspiciousCheckAcrossDatesCuttingGrains",    runAuspiciousCheckAcrossDatesCuttingGrains);
setupRoute("/runAuspiciousCheckAcrossDatesLandRegistration", runAuspiciousCheckAcrossDatesLandRegistration);
setupRoute("/runAuspiciousCheckAcrossDatesExamFees",         runAuspiciousCheckAcrossDatesExamFees);
setupRoute("/runAuspiciousCheckAcrossDatesShantimuhurtam",   runAuspiciousCheckAcrossDatesShantimuhurtam);
setupRoute("/runAuspiciousCheckAcrossDatesSeemantham",       runAuspiciousCheckAcrossDatesSeemantham);

// 14. Payment + email routes (verifyToken added to create-order and verify-payment)
app.post("/api/create-order",        verifyToken, createOrder);
app.post("/api/verify-payment",      verifyToken, verifyPayment);
app.post("/api/send-muhurat-email",  verifyToken, sendMuhuratEmail);
app.post("/api/contact-us",          contactLimiter, sendContactUsEmail);
app.post("/api/payment-api-failure", verifyToken, notifyPaymentApiFailure);

// 15. 404
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// 16. Error handler — never leak stack traces to client
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ❌ ${req.path}:`, err.message);
  if (err.name === "ZodError") return res.status(400).json({ error: "Invalid request data" });
  res.status(500).json({ error: "Internal server error" });
});

// 17. Start
const startServer = async () => {
  try {
    await initDB();
    app.listen(PORT, () => console.log(`[${new Date().toISOString()}] 🚀 Server on port ${PORT}`));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Startup failed:`, err);
    process.exit(1);
  }
};
startServer();