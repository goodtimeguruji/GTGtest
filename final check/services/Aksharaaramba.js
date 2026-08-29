import { runAuspiciousCheck } from "./muhurat-core.js";

const CONFIG = {
  secondNakshatraList: ["Ashwini","Ardhra","Punarvasu","Hasta","Chitra","Swati","Anuradha","Shravan","Revati"],
  disallowedTithis:    ["Pratipada","Chaturthi","Shasthi","Ashtami","Navami","Chaturdashi","Purnima","Amavasya"],
  timeMode:            "day",  // morning=00-13 | day=00-18 | evening=18-24
  lagnaPlace:          4   // which house must be empty in planetary positions
};

export default function runAuspiciousCheckAcrossDatesAksharaaramba(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
  return runAuspiciousCheck(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place, CONFIG);
}
