import { z } from "zod";
import { NAKSHATRAS, RASIS } from "../constants";

export const runAuspiciousCheckAcrossDatesModel = z.object({
  fromDateStr: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (yyyy-mm-dd)")
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date value")
    .transform((s) => s.trim()),

  toDateStr: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (yyyy-mm-dd)")
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date value")
    .transform((s) => s.trim()),

  lat: z.string()
    .regex(/^-?\d+(\.\d+)?$/, "Latitude must be a number")
    .refine((val) => parseFloat(val) >= -90 && parseFloat(val) <= 90, "Latitude out of range")
    .transform((s) => s.trim()),

  lon: z.string()
    .regex(/^-?\d+(\.\d+)?$/, "Longitude must be a number")
    .refine((val) => parseFloat(val) >= -180 && parseFloat(val) <= 180, "Longitude out of range")
    .transform((s) => s.trim()),

  tzone: z.string()
    .regex(/^-?\d+(\.\d+)?$/, "Timezone must be a number")
    .transform((s) => parseFloat(s)),
  // removed tzone completely

  place: z.string()
    .min(1, "Place is required")
    .max(100, "Place too long")
    .transform((s) => s.trim()),

  userNakshatra: z.enum(NAKSHATRAS, { errorMap: () => ({ message: "Invalid Nakshatra" }) }),

  userRasi: z.enum(RASIS, { errorMap: () => ({ message: "Invalid Rasi" }) }),

  selectedFunction: z.string().optional()

})
  .strict(); // disallow extra fields
