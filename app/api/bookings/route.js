import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

function generateRef() {
  return "DF" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { flightId, passenger } = body;
    const { firstName, lastName, email, phone } = passenger;

    if (!flightId || !firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("dairy-flat-airline");

    const flight = await db
      .collection("schedules")
      .findOne({ _id: new ObjectId(flightId) });
    if (!flight)
      return NextResponse.json(
        { success: false, error: "Flight not found" },
        { status: 404 },
      );

    const bookedSeats = flight.bookings.filter(
      (b) => b.status !== "cancelled",
    ).length;
    if (bookedSeats >= flight.totalSeats) {
      return NextResponse.json(
        { success: false, error: "Flight is full" },
        { status: 400 },
      );
    }

    const bookingRef = generateRef();

    await db
      .collection("schedules")
      .updateOne(
        { _id: new ObjectId(flightId) },
        {
          $push: {
            bookings: {
              bookingRef,
              firstName,
              lastName,
              email,
              phone,
              status: "confirmed",
              bookedAt: new Date(),
            },
          },
        },
      );

    return NextResponse.json({ success: true, bookingRef, flight });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const { bookingRef, email } = await request.json();

    const client = await clientPromise;
    const db = client.db("dairy-flat-airline");

    const flight = await db
      .collection("schedules")
      .findOne({ "bookings.bookingRef": bookingRef });
    if (!flight)
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );

    const booking = flight.bookings.find((b) => b.bookingRef === bookingRef);
    if (booking.email !== email)
      return NextResponse.json(
        { success: false, error: "Email does not match booking" },
        { status: 403 },
      );

    await db
      .collection("schedules")
      .updateOne(
        { "bookings.bookingRef": bookingRef },
        { $set: { "bookings.$.status": "cancelled" } },
      );

    return NextResponse.json({ success: true, message: "Booking cancelled" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
