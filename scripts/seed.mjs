import { MongoClient } from 'mongodb';
import { setServers } from 'dns';

setServers(['8.8.8.8', '8.8.4.4']);

const uri = 'mongodb://airlineAdmin:airline1234@ac-9lz6cbi-shard-00-00.osnwsbv.mongodb.net:27017,ac-9lz6cbi-shard-00-01.osnwsbv.mongodb.net:27017,ac-9lz6cbi-shard-00-02.osnwsbv.mongodb.net:27017/dairy-flat-airline?ssl=true&replicaSet=atlas-xzn3ks-shard-0&authSource=admin';

const airports = {
  NZNE: 'Dairy Flat',
  YSSY: 'Sydney',
  NZRO: 'Rotorua',
  NZGB: 'Claris (Great Barrier Island)',
  NZCI: 'Tuuta (Chatham Islands)',
  NZTL: 'Lake Tekapo',
};

const aircraft = {
  SJ30i:  { name: 'SyberJet SJ30i',   seats: 6 },
  SF50A:  { name: 'Cirrus SF50 (A)',   seats: 4 },
  SF50B:  { name: 'Cirrus SF50 (B)',   seats: 4 },
  HJ1:    { name: 'HondaJet Elite (1)', seats: 5 },
  HJ2:    { name: 'HondaJet Elite (2)', seats: 5 },
};

const prices = {
  'NZNE-YSSY': 1200, 'YSSY-NZNE': 1200,
  'NZNE-NZRO': 180,  'NZRO-NZNE': 180,
  'NZNE-NZGB': 220,  'NZGB-NZNE': 220,
  'NZNE-NZCI': 480,  'NZCI-NZNE': 480,
  'NZNE-NZTL': 320,  'NZTL-NZNE': 320,
};

// Returns a Date object for a given date string + time string in a timezone offset (hours)
function makeDate(dateStr, timeStr, tzOffsetHours) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  // Convert local time to UTC
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - tzOffsetHours * 60 * 60 * 1000;
  return new Date(utcMs);
}

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

// Get all dates in range [start, start + numWeeks weeks)
function getDateRange(startDate, numWeeks) {
  const dates = [];
  const end = new Date(startDate.getTime() + numWeeks * 7 * 24 * 60 * 60 * 1000);
  let cur = new Date(startDate);
  while (cur < end) {
    dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function getDayOfWeek(date) {
  return date.getUTCDay(); // 0=Sun,1=Mon,...,6=Sat
}

let flightCounter = 1;
function flightNumber(prefix) {
  return `${prefix}${String(flightCounter++).padStart(3, '0')}`;
}

async function seed() {
  const client = new MongoClient(uri);
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db('dairy-flat-airline');
  await db.collection('schedules').deleteMany({});
  await db.collection('passengers').deleteMany({});
  console.log('Cleared existing data');

  const schedules = [];

  // Start from today (UTC), generate 4 weeks
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dates = getDateRange(start, 4);

  for (const date of dates) {
    const dow = getDayOfWeek(date); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
    const ds = date.toISOString().slice(0, 10);

    // === SYDNEY SERVICE (SyberJet) ===
    // Outbound: Friday, departs NZNE 10:00 NZST (UTC+12)
    if (dow === 5) {
      const dep = makeDate(ds, '10:00', 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'NZNE', destination: 'YSSY',
        originName: airports.NZNE, destinationName: airports.YSSY,
        aircraft: aircraft.SJ30i,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 195), // ~3h15m westbound
        price: prices['NZNE-YSSY'],
        totalSeats: aircraft.SJ30i.seats,
        bookings: [],
      });
    }
    // Return: Sunday, departs YSSY 14:00 AEDT (UTC+10)
    if (dow === 0) {
      const dep = makeDate(ds, '14:00', 10);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'YSSY', destination: 'NZNE',
        originName: airports.YSSY, destinationName: airports.NZNE,
        aircraft: aircraft.SJ30i,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 165), // ~2h45m eastbound
        price: prices['YSSY-NZNE'],
        totalSeats: aircraft.SJ30i.seats,
        bookings: [],
      });
    }

    // === ROTORUA SHUTTLE (Cirrus SF50A) — Mon–Fri, 2x daily ===
    if (dow >= 1 && dow <= 5) {
      // Morning: NZNE 07:00 -> NZRO, then NZRO -> NZNE
      const dep1 = makeDate(ds, '07:00', 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'NZNE', destination: 'NZRO',
        originName: airports.NZNE, destinationName: airports.NZRO,
        aircraft: aircraft.SF50A,
        departureTime: dep1,
        arrivalTime: addMinutes(dep1, 55),
        price: prices['NZNE-NZRO'],
        totalSeats: aircraft.SF50A.seats,
        bookings: [],
      });
      const dep2 = makeDate(ds, '08:30', 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'NZRO', destination: 'NZNE',
        originName: airports.NZRO, destinationName: airports.NZNE,
        aircraft: aircraft.SF50A,
        departureTime: dep2,
        arrivalTime: addMinutes(dep2, 55),
        price: prices['NZRO-NZNE'],
        totalSeats: aircraft.SF50A.seats,
        bookings: [],
      });
      // Afternoon: NZNE 16:30 -> NZRO, then NZRO -> NZNE
      const dep3 = makeDate(ds, '16:30', 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'NZNE', destination: 'NZRO',
        originName: airports.NZNE, destinationName: airports.NZRO,
        aircraft: aircraft.SF50A,
        departureTime: dep3,
        arrivalTime: addMinutes(dep3, 55),
        price: prices['NZNE-NZRO'],
        totalSeats: aircraft.SF50A.seats,
        bookings: [],
      });
      const dep4 = makeDate(ds, '18:00', 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'NZRO', destination: 'NZNE',
        originName: airports.NZRO, destinationName: airports.NZNE,
        aircraft: aircraft.SF50A,
        departureTime: dep4,
        arrivalTime: addMinutes(dep4, 55),
        price: prices['NZRO-NZNE'],
        totalSeats: aircraft.SF50A.seats,
        bookings: [],
      });
    }

    // === GREAT BARRIER ISLAND (Cirrus SF50B) ===
    // Outbound: Mon, Wed, Fri — NZNE 09:00
    if (dow === 1 || dow === 3 || dow === 5) {
      const dep = makeDate(ds, '09:00', 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'NZNE', destination: 'NZGB',
        originName: airports.NZNE, destinationName: airports.NZGB,
        aircraft: aircraft.SF50B,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 40),
        price: prices['NZNE-NZGB'],
        totalSeats: aircraft.SF50B.seats,
        bookings: [],
      });
    }
    // Return: Tue, Thu, Sat — NZGB 09:00
    if (dow === 2 || dow === 4 || dow === 6) {
      const dep = makeDate(ds, '09:00', 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'NZGB', destination: 'NZNE',
        originName: airports.NZGB, destinationName: airports.NZNE,
        aircraft: aircraft.SF50B,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 40),
        price: prices['NZGB-NZNE'],
        totalSeats: aircraft.SF50B.seats,
        bookings: [],
      });
    }

    // === CHATHAM ISLANDS (HondaJet HJ1) ===
    // Outbound: Tue, Fri — NZNE 08:00
    if (dow === 2 || dow === 5) {
      const dep = makeDate(ds, '08:00', 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'NZNE', destination: 'NZCI',
        originName: airports.NZNE, destinationName: airports.NZCI,
        aircraft: aircraft.HJ1,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 115), // ~1h55m, Chatham is UTC+12:45
        price: prices['NZNE-NZCI'],
        totalSeats: aircraft.HJ1.seats,
        bookings: [],
      });
    }
    // Return: Wed, Sat — NZCI 10:00 (Chatham UTC+12:45)
    if (dow === 3 || dow === 6) {
      const dep = makeDate(ds, '10:00', 12.75);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'NZCI', destination: 'NZNE',
        originName: airports.NZCI, destinationName: airports.NZNE,
        aircraft: aircraft.HJ1,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 100),
        price: prices['NZCI-NZNE'],
        totalSeats: aircraft.HJ1.seats,
        bookings: [],
      });
    }

    // === LAKE TEKAPO (HondaJet HJ2) ===
    // Outbound: Mon — NZNE 09:00
    if (dow === 1) {
      const dep = makeDate(ds, '09:00', 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'NZNE', destination: 'NZTL',
        originName: airports.NZNE, destinationName: airports.NZTL,
        aircraft: aircraft.HJ2,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 90),
        price: prices['NZNE-NZTL'],
        totalSeats: aircraft.HJ2.seats,
        bookings: [],
      });
    }
    // Return: Tue — NZTL 09:00
    if (dow === 2) {
      const dep = makeDate(ds, '09:00', 12);
      schedules.push({
        flightNumber: `DF${String(schedules.length + 1).padStart(3,'0')}`,
        origin: 'NZTL', destination: 'NZNE',
        originName: airports.NZTL, destinationName: airports.NZNE,
        aircraft: aircraft.HJ2,
        departureTime: dep,
        arrivalTime: addMinutes(dep, 80),
        price: prices['NZTL-NZNE'],
        totalSeats: aircraft.HJ2.seats,
        bookings: [],
      });
    }
  }

  await db.collection('schedules').insertMany(schedules);
  console.log(`✅ Inserted ${schedules.length} flight schedules`);
  await client.close();
}

seed().catch(console.error);