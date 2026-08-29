import { runAuspiciousCheck } from "./muhurat-core.js";

const CONFIG = {
  secondNakshatraList: ["Ashwini","Bharani","Krittika","Mrigashira","Ardhra","Pushya","Purva Phalguni","Hasta","Chitra","Vishakha","Anuradha","Jyeshtha","Moola","Poorva Ashadha","Shravan","Dhanishta","Satabhisha","Poorva Bhadrapada"],
  disallowedTithis:    ["Pratipada","Chaturthi","Ashtami","Navami","Chaturdashi","Purnima","Amavasya"],
  timeMode:            "day",  // morning=00-13 | day=00-18 | evening=18-24
  lagnaPlace:          8   // which house must be empty in planetary positions
};

export default function runAuspiciousCheckAcrossDatesArogyaSnanam(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
  return runAuspiciousCheck(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place, CONFIG);
}
