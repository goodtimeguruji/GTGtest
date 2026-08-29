import { runAuspiciousCheck } from "./muhurat-core.js";

const CONFIG = {
  secondNakshatraList: ["Rohini","Pushya","Shravan"],
  disallowedTithis:    ["Pratipada","Tritiya","Chaturthi","Panchmi","Shasthi","Ashtami","Navami","Ekadashi","Tryodashi","Chaturdashi","Purnima","Amavasya"],
  timeMode:            "day",  // morning=00-13 | day=00-18 | evening=18-24
  lagnaPlace:          11   // which house must be empty in planetary positions
};

export default function runAuspiciousCheckAcrossDatesVishnuBali(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
  return runAuspiciousCheck(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place, CONFIG);
}
