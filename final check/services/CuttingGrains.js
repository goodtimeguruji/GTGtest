import { runAuspiciousCheck } from "./muhurat-core.js";

const CONFIG = {
  secondNakshatraList: ["Bharani","Rohini","Mrigashira","Ardhra","Pushya","Magha","Uttara Phalguni","Hasta","Vishakha","Anuradha","Uttara Ashadha","Shravan","Uttara Bhadrapada","Revati"],
  disallowedTithis:    ["Chaturthi","Ashtami","Navami","Ekadashi","Dwadashi","Chaturdashi","Amavasya"],
  timeMode:            "day",  // morning=00-13 | day=00-18 | evening=18-24
  lagnaPlace:          8   // which house must be empty in planetary positions
};

export default function runAuspiciousCheckAcrossDatesCuttingGrains(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
  return runAuspiciousCheck(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place, CONFIG);
}
