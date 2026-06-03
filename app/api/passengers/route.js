import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email)
      return NextResponse.json(
        { success: false, error: "Email required" },
        { status: 400 },
      );

    const client = await clientPromise;
    const db = client.db("dairy-flat-airline");

    const flights = await db
      .collection("schedules")
      .find({ "bookings.email": email })
      .toArray();

    const bookings = [];
    for (const flight of flights) {
      for (const booking of flight.bookings) {
        if (booking.email === email) {
          bookings.push({
            ...booking,
            flight: {
              flightNumber: flight.flightNumber,
              origin: flight.origin,
              destination: flight.destination,
              originName: flight.originName,
              destinationName: flight.destinationName,
              departureTime: flight.departureTime,
              arrivalTime: flight.arrivalTime,
              price: flight.price,
              aircraft: flight.aircraft,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
