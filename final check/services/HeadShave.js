import { runAuspiciousCheck } from "./muhurat-core.js";

const CONFIG = {
  secondNakshatraList: ["Ashwini","Rohini","Mrigashira","Punarvasu","Pushya","Uttara Phalguni","Chitra","Swati","Uttara Ashadha","Shravan","Shatabhisha","Uttara Bhadrapada","Revati"],
  disallowedTithis:    ["Pratipada","Chaturthi","Shasthi","Ashtami","Navami","Ekadashi","Dwadashi","Chaturdashi","Purnima","Amavasya"],
  timeMode:            "day",  // morning=00-13 | day=00-18 | evening=18-24
  lagnaPlace:          9   // which house must be empty in planetary positions
};

export default function runAuspiciousCheckAcrossDatesHeadShave(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
  return runAuspiciousCheck(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place, CONFIG);
}
