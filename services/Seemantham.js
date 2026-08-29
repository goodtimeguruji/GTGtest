import { runAuspiciousCheck } from "./muhurat-core.js";

const CONFIG = {
  secondNakshatraList: ["Ashwini","Rohini","Mrigashira","Punarvasu","Pushya","Uttara Phalguni","Chitra","Swati", "Moola","Anuradha","Uttara Ashadha","Shravan","Dhanishta", "Satabhisha","Uttara Bhadrapada","Revati"],
  disallowedTithis:    ["Pratipada","Chaturthi","Ashtami","Navami","Chaturdashi","Purnima","Amavasya"],
  disallowedVaras:     ["Shaniwara"], // Saturday is entirely disallowed for Seemantham
  disallowedLagnaSigns:["Scorpio","Leo"], // 8th house (lagnaPlace) sign must not be Scorpio or Leo
  timeMode:            "morning",  // morning=00-13 | day=00-18 | evening=18-24
  lagnaPlace:          8   // which house must be empty in planetary positions
};

export default function runAuspiciousCheckAcrossDatesSeemantham(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
  return runAuspiciousCheck(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place, CONFIG);
}