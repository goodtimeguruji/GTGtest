import { runAuspiciousCheck } from "./muhurat-core.js";

const CONFIG = {
  secondNakshatraList: ["Ashwini","Rohini","Mrigashira","Punarvasu","Pushya","Magha","Uttara Phalguni","Hasta","Swati","Anuradha","Uttara Ashadha","Shravan","Dhanishta","Satabhisha","Uttara Bhadrapada","Revati"],
  disallowedTithis:    ["Pratipada","Chaturthi","Shasti","Ashtami","Navami","Dwadashi","Chaturdashi","Purnima","Amavasya"],
  timeMode:            "day",  // morning=00-13 | day=00-18 | evening=18-24
  lagnaPlace:          12   // which house must be empty in planetary positions
};

export default function runAuspiciousCheckAcrossDatesNamakarana(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
  return runAuspiciousCheck(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place, CONFIG);
}
