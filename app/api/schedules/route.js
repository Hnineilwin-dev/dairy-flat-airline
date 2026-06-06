// app/api/schedules/route.js
// API route handler for searching scheduled flights.
// GET: Returns a list of flights filtered by origin, destination, and date range.
// Example: /api/schedules?orig=NZNE&dest=NZRO&date1=2026-06-10&date2=2026-06-30

import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

// GET /api/schedules
// Query parameters:
//   orig  - ICAO code of origin airport (e.g. NZNE)
//   dest  - ICAO code of destination airport (e.g. YSSY)
//   date1 - Start date of search range (e.g. 2026-06-10)
//   date2 - End date of search range (e.g. 2026-06-30)
export async function GET(request) {
  try {
    // Extract query parameters from the request URL
    const { searchParams } = new URL(request.url);
    const orig = searchParams.get("orig");
    const dest = searchParams.get("dest");
    const date1 = searchParams.get("date1");
    const date2 = searchParams.get("date2");

    const client = await clientPromise;
    const db = client.db("dairy-flat-airline");

    // Build the MongoDB query dynamically based on provided parameters
    const query = {};

    // Filter by origin airport if provided (case-insensitive)
    if (orig) query.origin = orig.toUpperCase();

    // Filter by destination airport if provided (case-insensitive)
    if (dest) query.destination = dest.toUpperCase();

    // Filter by date range if either date is provided
    if (date1 || date2) {
      query.departureTime = {};

      // Set start of date range (beginning of date1)
      if (date1) query.departureTime.$gte = new Date(date1);

      // Set end of date range (end of day on date2)
      if (date2) {
        const end = new Date(date2);
        end.setUTCHours(23, 59, 59, 999); // Include all flights on the last day
        query.departureTime.$lte = end;
      }
    }

    // Fetch matching flights from the schedules collection, sorted by departure time
    const flights = await db
      .collection("schedules")
      .find(query)
      .sort({ departureTime: 1 })
      .toArray();

    return NextResponse.json({ success: true, flights });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
