import { runAuspiciousCheck } from "./muhurat-core.js";

const CONFIG = {
  secondNakshatraList: ["Rohini","Ardhra","Pushya","Uttara Phalguni","Uttara Ashadha","Shravan","Dhanishta","Satabhisha","Uttara Bhadrapada"],
  disallowedTithis:    ["Pratipada","Chaturthi","Shasthi","Ashtami","Navami","Dwadashi","Chaturdashi","Purnima","Amavasya"],
  timeMode:            "day",  // morning=00-13 | day=00-18 | evening=18-24
  lagnaPlace:          8   // which house must be empty in planetary positions
};

export default function runAuspiciousCheckAcrossDatesChildCradling(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
  return runAuspiciousCheck(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place, CONFIG);
}
