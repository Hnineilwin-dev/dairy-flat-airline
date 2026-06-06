// scripts/seed.mjs
// Database seeding script for Dairy Flat Airlines.
// Generates 4 weeks of scheduled flights for all routes and inserts them into MongoDB Atlas.
// Run with: node scripts/seed.mjs

import { MongoClient } from "mongodb";
import { setServers } from "dns";

// Use Google DNS servers to avoid connection issues in some network environments
setServers(["8.8.8.8", "8.8.4.4"]);

// MongoDB Atlas connection string using direct shard addresses
const uri =
  "mongodb://airlineAdmin:airline1234@ac-9lz6cbi-shard-00-00.osnwsbv.mongodb.net:27017,ac-9lz6cbi-shard-00-01.osnwsbv.mongodb.net:27017,ac-9lz6cbi-shard-00-02.osnwsbv.mongodb.net:27017/dairy-flat-airline?ssl=true&replicaSet=atlas-xzn3ks-shard-0&authSource=admin";

// ICAO airport codes and their human-readable names
const airports = {
  NZNE: "Dairy Flat",
  YSSY: "Sydney",
  NZRO: "Rotorua",
  NZGB: "Claris (Great Barrier Island)",
  NZCI: "Tuuta (Chatham Islands)",
  NZTL: "Lake Tekapo",
};

// Fleet of aircraft with their names and seat capacities
const aircraft = {
  SJ30i: { name: "SyberJet SJ30i", seats: 6 }, // Prestige Sydney service
  SF50A: { name: "Cirrus SF50 (A)", seats: 4 }, // Rotorua shuttle
  SF50B: { name: "Cirrus SF50 (B)", seats: 4 }, // Great Barrier Island service
  HJ1: { name: "HondaJet Elite (1)", seats: 5 }, // Chatham Islands service
  HJ2: { name: "HondaJet Elite (2)", seats: 5 }, // Lake Tekapo service
};

// One-way prices (NZD) for each route leg
const prices = {
  "NZNE-YSSY": 1200,
  "YSSY-NZNE": 1200,
  "NZNE-NZRO": 180,
  "NZRO-NZNE": 180,
  "NZNE-NZGB": 220,
  "NZGB-NZNE": 220,
  "NZNE-NZCI": 480,
  "NZCI-NZNE": 480,
  "NZNE-NZTL": 320,
  "NZTL-NZNE": 320,
};

// Converts a local date string and time string to a UTC Date object,
// accounting for the given timezone offset in hours (e.g. 12 for NZST, 10 for AEST, 12.75 for Chatham)
function makeDate(dateStr, timeStr, tzOffsetHours) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  // Subtract timezone offset to convert local time to UTC
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute) -
    tzOffsetHours * 60 * 60 * 1000;
  return new Date(utcMs);
}

// Returns a new Date object with the given number of minutes added
function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

// Generates an array of Date objects for every day from startDate
// covering the specified number of weeks
function getDateRange(startDate, numWeeks) {
  const dates = [];
  const end = new Date(
    startDate.getTime() + numWeeks * 7 * 24 * 60 * 60 * 1000,
  );
  let cur = new Date(startDate);
  while (cur < end) {
    dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

// Returns the UTC day of week for a date (0=Sun, 1=Mon, ..., 6=Sat)
function getDayOfWeek(date) {
  return date.getUTCDay();
}

// Main seeding function — connects to MongoDB, clears existing data,
// and inserts 4 weeks of scheduled flights for all routes
async function seed() {
  const client = new MongoClient(uri);
  await client.connect();
  console.log("Connected to MongoDB");

  const db = client.db("dairy-flat-airline");

  // Clear existing schedules and passengers before re-seeding
  await db.collection("schedules").deleteMany({});
  await db.collection("passengers").deleteMany({});
  console.log("Cleared existing data");

  const schedules = [];

  // Start from today (UTC) and generate flights for the next 4 weeks
  const today = new Date();
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const dates = getDateRange(start, 4);

  for (const date of dates) {
    const dow = getDayOfWeek(date); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
    const ds = date.toISOString().slice(0, 10); // Format: YYYY-MM-DD

    // === SYDNEY SERVICE (SyberJet SJ30i, 6 seats) ===
    // Weekly prestige service. Westbound takes longer than eastbound.

    // Outbound: Friday, departs NZNE 10:00 NZST (UTC+12), ~3h15m to Sydney
    if (dow === 5) {
      const dep = makeDate(ds, "10:00", 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "NZNE",
        destination: "YSSY",
        originName: airports.NZNE,
        destinationName: airports.YSSY,
        aircraft: aircraft.SJ30i,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 195), // ~3h15m westbound
        price: prices["NZNE-YSSY"],
        totalSeats: aircraft.SJ30i.seats,
        bookings: [],
      });
    }
    // Return: Sunday, departs YSSY 14:00 AEST (UTC+10), ~2h45m to Dairy Flat
    if (dow === 0) {
      const dep = makeDate(ds, "14:00", 10);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "YSSY",
        destination: "NZNE",
        originName: airports.YSSY,
        destinationName: airports.NZNE,
        aircraft: aircraft.SJ30i,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 165), // ~2h45m eastbound
        price: prices["YSSY-NZNE"],
        totalSeats: aircraft.SJ30i.seats,
        bookings: [],
      });
    }

    // === ROTORUA SHUTTLE (Cirrus SF50A, 4 seats) — Mon–Fri, 2x daily ===
    if (dow >= 1 && dow <= 5) {
      // Morning outbound: NZNE 07:00 → NZRO (~55 min)
      const dep1 = makeDate(ds, "07:00", 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "NZNE",
        destination: "NZRO",
        originName: airports.NZNE,
        destinationName: airports.NZRO,
        aircraft: aircraft.SF50A,
        departureTime: dep1,
        arrivalTime: addMinutes(dep1, 55),
        price: prices["NZNE-NZRO"],
        totalSeats: aircraft.SF50A.seats,
        bookings: [],
      });
      // Morning return: NZRO 08:30 → NZNE (~55 min)
      const dep2 = makeDate(ds, "08:30", 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "NZRO",
        destination: "NZNE",
        originName: airports.NZRO,
        destinationName: airports.NZNE,
        aircraft: aircraft.SF50A,
        departureTime: dep2,
        arrivalTime: addMinutes(dep2, 55),
        price: prices["NZRO-NZNE"],
        totalSeats: aircraft.SF50A.seats,
        bookings: [],
      });
      // Afternoon outbound: NZNE 16:30 → NZRO (~55 min)
      const dep3 = makeDate(ds, "16:30", 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "NZNE",
        destination: "NZRO",
        originName: airports.NZNE,
        destinationName: airports.NZRO,
        aircraft: aircraft.SF50A,
        departureTime: dep3,
        arrivalTime: addMinutes(dep3, 55),
        price: prices["NZNE-NZRO"],
        totalSeats: aircraft.SF50A.seats,
        bookings: [],
      });
      // Afternoon return: NZRO 18:00 → NZNE (~55 min)
      const dep4 = makeDate(ds, "18:00", 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "NZRO",
        destination: "NZNE",
        originName: airports.NZRO,
        destinationName: airports.NZNE,
        aircraft: aircraft.SF50A,
        departureTime: dep4,
        arrivalTime: addMinutes(dep4, 55),
        price: prices["NZRO-NZNE"],
        totalSeats: aircraft.SF50A.seats,
        bookings: [],
      });
    }

    // === GREAT BARRIER ISLAND (Cirrus SF50B, 4 seats) ===
    // Outbound: Mon, Wed, Fri — NZNE 09:00 (~40 min)
    if (dow === 1 || dow === 3 || dow === 5) {
      const dep = makeDate(ds, "09:00", 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "NZNE",
        destination: "NZGB",
        originName: airports.NZNE,
        destinationName: airports.NZGB,
        aircraft: aircraft.SF50B,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 40),
        price: prices["NZNE-NZGB"],
        totalSeats: aircraft.SF50B.seats,
        bookings: [],
      });
    }
    // Return: Tue, Thu, Sat — NZGB 09:00 (~40 min)
    if (dow === 2 || dow === 4 || dow === 6) {
      const dep = makeDate(ds, "09:00", 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "NZGB",
        destination: "NZNE",
        originName: airports.NZGB,
        destinationName: airports.NZNE,
        aircraft: aircraft.SF50B,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 40),
        price: prices["NZGB-NZNE"],
        totalSeats: aircraft.SF50B.seats,
        bookings: [],
      });
    }

    // === CHATHAM ISLANDS (HondaJet HJ1, 5 seats) ===
    // Chatham Islands timezone is UTC+12:45 — handled in makeDate()

    // Outbound: Tue, Fri — NZNE 08:00 (~1h55m)
    if (dow === 2 || dow === 5) {
      const dep = makeDate(ds, "08:00", 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "NZNE",
        destination: "NZCI",
        originName: airports.NZNE,
        destinationName: airports.NZCI,
        aircraft: aircraft.HJ1,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 115), // ~1h55m
        price: prices["NZNE-NZCI"],
        totalSeats: aircraft.HJ1.seats,
        bookings: [],
      });
    }
    // Return: Wed, Sat — NZCI 10:00 Chatham time (UTC+12:45), ~1h40m
    if (dow === 3 || dow === 6) {
      const dep = makeDate(ds, "10:00", 12.75); // 12.75 = UTC+12:45
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "NZCI",
        destination: "NZNE",
        originName: airports.NZCI,
        destinationName: airports.NZNE,
        aircraft: aircraft.HJ1,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 100),
        price: prices["NZCI-NZNE"],
        totalSeats: aircraft.HJ1.seats,
        bookings: [],
      });
    }

    // === LAKE TEKAPO (HondaJet HJ2, 5 seats) ===
    // Outbound: Monday — NZNE 09:00 (~1h30m)
    if (dow === 1) {
      const dep = makeDate(ds, "09:00", 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "NZNE",
        destination: "NZTL",
        originName: airports.NZNE,
        destinationName: airports.NZTL,
        aircraft: aircraft.HJ2,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 90),
        price: prices["NZNE-NZTL"],
        totalSeats: aircraft.HJ2.seats,
        bookings: [],
      });
    }
    // Return: Tuesday — NZTL 09:00 (~1h20m)
    if (dow === 2) {
      const dep = makeDate(ds, "09:00", 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3, "0")}`,
        origin: "NZTL",
        destination: "NZNE",
        originName: airports.NZTL,
        destinationName: airports.NZNE,
        aircraft: aircraft.HJ2,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 80),
        price: prices["NZTL-NZNE"],
        totalSeats: aircraft.HJ2.seats,
        bookings: [],
      });
    }
  }

  // Insert all generated schedules into the database
  await db.collection("schedules").insertMany(schedules);
  console.log(`✅ Inserted ${schedules.length} flight schedules`);
  await client.close();
}

seed().catch(console.error);
