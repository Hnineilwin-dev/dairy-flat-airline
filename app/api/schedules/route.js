import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orig = searchParams.get("orig");
    const dest = searchParams.get("dest");
    const date1 = searchParams.get("date1");
    const date2 = searchParams.get("date2");

    const client = await clientPromise;
    const db = client.db("dairy-flat-airline");

    const query = {};
    if (orig) query.origin = orig.toUpperCase();
    if (dest) query.destination = dest.toUpperCase();
    if (date1 || date2) {
      query.departureTime = {};
      if (date1) query.departureTime.$gte = new Date(date1);
      if (date2) {
        const end = new Date(date2);
        end.setUTCHours(23, 59, 59, 999);
        query.departureTime.$lte = end;
      }
    }

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
