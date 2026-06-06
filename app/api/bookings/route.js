// app/api/bookings/route.js
// API route handler for flight bookings.
// POST: Creates a new booking for a scheduled flight.
// DELETE: Cancels an existing booking by booking reference.

import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

// Generates a unique booking reference in the format "DF" + 6 random alphanumeric characters
// e.g. DF2C58DN
function generateRef() {
  return "DF" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/bookings
// Creates a new booking for a given flight.
// Requires: flightId, and passenger details (firstName, lastName, email, phone)
// Returns: booking reference and flight details on success
export async function POST(request) {
  try {
    const body = await request.json();
    const { flightId, passenger } = body;
    const { firstName, lastName, email, phone } = passenger;

    // Validate that all required fields are present
    if (!flightId || !firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db("dairy-flat-airline");

    // Look up the flight in the schedules collection
    const flight = await db
      .collection("schedules")
      .findOne({ _id: new ObjectId(flightId) });
    if (!flight)
      return NextResponse.json(
        { success: false, error: "Flight not found" },
        { status: 404 },
      );

    // Count only active (non-cancelled) bookings to check seat availability
    const bookedSeats = flight.bookings.filter(
      (b) => b.status !== "cancelled",
    ).length;

    // Reject booking if flight is full
    if (bookedSeats >= flight.totalSeats) {
      return NextResponse.json(
        { success: false, error: "Flight is full" },
        { status: 400 },
      );
    }

    // Generate unique booking reference
    const bookingRef = generateRef();

    // Add the new booking to the flight's bookings array
    await db.collection("schedules").updateOne(
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

// DELETE /api/bookings
// Cancels an existing booking by setting its status to "cancelled".
// Requires: bookingRef and email (email must match the original booking)
export async function DELETE(request) {
  try {
    const { bookingRef, email } = await request.json();

    const client = await clientPromise;
    const db = client.db("dairy-flat-airline");

    // Find the flight that contains the given booking reference
    const flight = await db
      .collection("schedules")
      .findOne({ "bookings.bookingRef": bookingRef });
    if (!flight)
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );

    // Verify the email matches the booking for security
    const booking = flight.bookings.find((b) => b.bookingRef === bookingRef);
    if (booking.email !== email)
      return NextResponse.json(
        { success: false, error: "Email does not match booking" },
        { status: 403 },
      );

    // Soft delete: mark booking as cancelled instead of removing it
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
