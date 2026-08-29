import { runAuspiciousCheck } from "./muhurat-core.js";

const CONFIG = {
  secondNakshatraList: ["Ashwini","Rohini","Mrigashira","Ardhra","Punarvasu","Pushya","Hasta","Anuradha","Uttara Ashadha","Shravan","Uttara Bhadrapada","Revati"],
  disallowedTithis:    ["Pratipada","Chaturthi","Saptami","Ashtami","Navami","Dashami","Chaturdashi","Purnima","Amavasya"],
  timeMode:            "day",  // morning=00-13 | day=00-18 | evening=18-24
  lagnaPlace:          4   // which house must be empty in planetary positions
};

export default function runAuspiciousCheckAcrossDatesExamFees(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
  return runAuspiciousCheck(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place, CONFIG);
}
