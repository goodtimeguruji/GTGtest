import express from "express";
import { signup, login, googleLogin, getUser, logout, verifyEmail, resendVerification } from "./authController.js";
import { verifyToken } from "./authMiddleware.js";
import { verifyCaptcha } from "./verifyCaptcha.js";     

const router = express.Router();

router.post("/signup", verifyCaptcha, signup); // ✅ updated
router.post("/login", verifyCaptcha, login);   // ✅ updated
router.post("/google", googleLogin);
router.get("/get-user", verifyToken, getUser);
router.post("/logout", verifyToken, logout);

// Hit by the link in the verification email — plain GET, redirects to verify-email.html
router.get("/verify-email", verifyEmail);

// Hit by the "Resend verification email" button on verify-email.html
router.post("/resend-verification", resendVerification);

export default router;