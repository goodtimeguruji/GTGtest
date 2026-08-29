import express from "express";
import {
  getProfile,
  updateProfile,
  listSearchHistory,
  getSearchById,
  deleteSearch
} from "./profileController.js";
import { verifyToken } from "./authMiddleware.js";

const router = express.Router();

router.get("/me",              verifyToken, getProfile);
router.put("/me",               verifyToken, updateProfile);
router.get("/history",          verifyToken, listSearchHistory);
router.get("/history/:id",      verifyToken, getSearchById);
router.delete("/history/:id",   verifyToken, deleteSearch);

export default router;
