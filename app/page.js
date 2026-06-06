// app/page.js
// Main page component for Dairy Flat Airlines booking system.
// This is a client-side rendered page that handles:
//   - Flight search by origin, destination, and date range
//   - Flight booking with passenger details and invoice display
//   - Booking cancellation by reference and email
//   - Passenger booking lookup by email

"use client";
import { useState } from "react";

// List of all airports served by Dairy Flat Airlines with their ICAO codes
const AIRPORTS = [
  { code: "NZNE", name: "Dairy Flat" },
  { code: "YSSY", name: "Sydney" },
  { code: "NZRO", name: "Rotorua" },
  { code: "NZGB", name: "Claris (Great Barrier Island)" },
  { code: "NZCI", name: "Tuuta (Chatham Islands)" },
  { code: "NZTL", name: "Lake Tekapo" },
];

// Formats an ISO date string to a human-readable local time in NZ timezone
// e.g. "Wed, 3 Jun, 04:30 pm"
function formatTime(iso) {
  return new Date(iso).toLocaleString("en-NZ", {
    timeZone: "Pacific/Auckland",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Calculates and formats the flight duration between departure and arrival times
// e.g. "0h 55m"
function formatDuration(dep, arr) {
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function Home() {
  // Tab state: controls which section is displayed (search, cancel, mybookings)
  const [tab, setTab] = useState("search");

  // Flight search form state
  const [form, setForm] = useState({
    orig: "NZNE",
    dest: "NZRO",
    date1: "",
    date2: "",
  });

  // State for search results, loading indicator, and error messages
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // State for the flight selected by the user for booking
  const [selectedFlight, setSelectedFlight] = useState(null);

  // Passenger details form state
  const [passenger, setPassenger] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Invoice state shown after a successful booking
  const [invoice, setInvoice] = useState(null);

  // Cancel booking form state
  const [cancelForm, setCancelForm] = useState({ bookingRef: "", email: "" });

  // Result message after attempting to cancel a booking
  const [cancelResult, setCancelResult] = useState("");

  // Email input and results for the My Bookings lookup
  const [lookupEmail, setLookupEmail] = useState("");
  const [myBookings, setMyBookings] = useState([]);

  // Handles flight search form submission
  // Calls GET /api/schedules with origin, destination, and date filters
  async function searchFlights(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFlights([]);
    const params = new URLSearchParams(form);
    const res = await fetch(`/api/schedules?${params}`);
    const data = await res.json();
    setLoading(false);
    if (data.success) setFlights(data.flights);
    else setError(data.error);
  }

  // Handles booking form submission
  // Calls POST /api/bookings with selected flight ID and passenger details
  async function makeBooking(e) {
    e.preventDefault();
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flightId: selectedFlight._id, passenger }),
    });
    const data = await res.json();
    if (data.success) {
      // Show invoice page on successful booking
      setInvoice({ ...data, flight: selectedFlight });
      setSelectedFlight(null);
    } else setError(data.error);
  }

  // Handles booking cancellation form submission
  // Calls DELETE /api/bookings with booking reference and email for verification
  async function cancelBooking(e) {
    e.preventDefault();
    const res = await fetch("/api/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cancelForm),
    });
    const data = await res.json();
    setCancelResult(
      data.success ? "✅ Booking cancelled successfully." : `❌ ${data.error}`,
    );
  }

  // Handles My Bookings lookup form submission
  // Calls GET /api/passengers with the passenger's email
  async function lookupBookings(e) {
    e.preventDefault();
    const res = await fetch(
      `/api/passengers?email=${encodeURIComponent(lookupEmail)}`,
    );
    const data = await res.json();
    if (data.success) setMyBookings(data.bookings);
    else setError(data.error);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0f1e",
        color: "#e8e0d0",
        fontFamily: "'Georgia', serif",
      }}
    >
      {/* Hero section — displays airline name and tagline */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #0a0f1e 0%, #1a2540 50%, #0d1b2a 100%)",
          padding: "60px 20px 40px",
          textAlign: "center",
          borderBottom: "1px solid #2a3a5a",
        }}
      >
        <div
          style={{
            fontSize: 13,
            letterSpacing: 6,
            color: "#8a9bb5",
            marginBottom: 12,
            textTransform: "uppercase",
          }}
        >
          Dairy Flat Airport
        </div>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 400,
            margin: "0 0 8px",
            color: "#f0e8d8",
            letterSpacing: 2,
          }}
        >
          Dairy Flat Airlines
        </h1>
        <p style={{ color: "#6a7d96", fontSize: 15, margin: 0 }}>
          Private luxury aviation from the heart of New Zealand
        </p>
      </div>

      {/* Navigation tabs — Search Flights, Cancel Booking, My Bookings */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 4,
          padding: "20px 20px 0",
          borderBottom: "1px solid #1e2d45",
        }}
      >
        {[
          ["search", "✈ Search Flights"],
          ["cancel", "✕ Cancel Booking"],
          ["mybookings", "☰ My Bookings"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setInvoice(null);
              setError("");
            }}
            style={{
              padding: "10px 24px",
              background: tab === key ? "#c9a84c" : "transparent",
              color: tab === key ? "#0a0f1e" : "#8a9bb5",
              border: "1px solid",
              borderColor: tab === key ? "#c9a84c" : "#2a3a5a",
              borderRadius: "4px 4px 0 0",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
              letterSpacing: 1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "30px 20px" }}>
        {/* Error message display */}
        {error && (
          <div
            style={{
              background: "#2a1515",
              border: "1px solid #5a2020",
              borderRadius: 6,
              padding: "12px 16px",
              marginBottom: 20,
              color: "#e88",
            }}
          >
            {error}
          </div>
        )}

        {/* SEARCH TAB — Flight search form and results */}
        {tab === "search" && !invoice && (
          <>
            {/* Flight search form with origin, destination, and date range inputs */}
            <form
              onSubmit={searchFlights}
              style={{
                background: "#111827",
                border: "1px solid #1e2d45",
                borderRadius: 8,
                padding: 24,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 16,
                }}
              >
                {/* Origin and destination airport dropdowns */}
                {[
                  ["orig", "From"],
                  ["dest", "To"],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        letterSpacing: 2,
                        color: "#6a7d96",
                        marginBottom: 6,
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </label>
                    <select
                      value={form[field]}
                      onChange={(e) =>
                        setForm({ ...form, [field]: e.target.value })
                      }
                      style={{
                        width: "100%",
                        background: "#0d1520",
                        border: "1px solid #2a3a5a",
                        borderRadius: 4,
                        padding: "10px 12px",
                        color: "#e8e0d0",
                        fontFamily: "inherit",
                        fontSize: 14,
                      }}
                    >
                      {AIRPORTS.map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {/* Date range inputs — colorScheme dark makes calendar icon visible */}
                {[
                  ["date1", "From Date"],
                  ["date2", "To Date"],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        letterSpacing: 2,
                        color: "#6a7d96",
                        marginBottom: 6,
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </label>
                    <input
                      type="date"
                      value={form[field]}
                      onChange={(e) =>
                        setForm({ ...form, [field]: e.target.value })
                      }
                      style={{
                        width: "100%",
                        background: "#0d1520",
                        border: "1px solid #2a3a5a",
                        borderRadius: 4,
                        padding: "10px 12px",
                        color: "#e8e0d0",
                        fontFamily: "inherit",
                        fontSize: 14,
                        boxSizing: "border-box",
                        colorScheme: "dark", // Makes calendar icon visible on dark background
                      }}
                    />
                  </div>
                ))}
              </div>
              <button
                type="submit"
                style={{
                  marginTop: 20,
                  padding: "12px 32px",
                  background: "#c9a84c",
                  color: "#0a0f1e",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                  letterSpacing: 2,
                  fontWeight: 600,
                }}
              >
                SEARCH FLIGHTS
              </button>
            </form>

            {/* Loading indicator while fetching flights */}
            {loading && (
              <p style={{ textAlign: "center", color: "#6a7d96" }}>
                Searching...
              </p>
            )}

            {/* Flight results list — shows available seats and Book Now button */}
            {flights.length > 0 && !selectedFlight && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 3,
                    color: "#6a7d96",
                    marginBottom: 16,
                    textTransform: "uppercase",
                  }}
                >
                  {flights.length} flight{flights.length !== 1 ? "s" : ""} found
                </div>
                {flights.map((f) => {
                  // Calculate available seats by excluding cancelled bookings
                  const booked = f.bookings.filter(
                    (b) => b.status !== "cancelled",
                  ).length;
                  const available = f.totalSeats - booked;
                  return (
                    <div
                      key={f._id}
                      style={{
                        background: "#111827",
                        border: "1px solid #1e2d45",
                        borderRadius: 8,
                        padding: 20,
                        marginBottom: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 16,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6a7d96",
                            letterSpacing: 2,
                            marginBottom: 4,
                          }}
                        >
                          {f.flightNumber} · {f.aircraft.name}
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 400,
                            marginBottom: 4,
                          }}
                        >
                          {f.originName} → {f.destinationName}
                        </div>
                        <div style={{ fontSize: 13, color: "#8a9bb5" }}>
                          Dep: {formatTime(f.departureTime)}
                        </div>
                        <div style={{ fontSize: 13, color: "#8a9bb5" }}>
                          Arr: {formatTime(f.arrivalTime)} ·{" "}
                          {formatDuration(f.departureTime, f.arrivalTime)}
                        </div>
                        {/* Seat availability indicator — green if available, red if full */}
                        <div
                          style={{
                            fontSize: 12,
                            color: available > 0 ? "#6ab86a" : "#e88",
                            marginTop: 4,
                          }}
                        >
                          {available > 0
                            ? `${available} seat${available !== 1 ? "s" : ""} available`
                            : "FULL"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: 24,
                            color: "#c9a84c",
                            marginBottom: 8,
                          }}
                        >
                          NZ${f.price}
                        </div>
                        {/* Book Now button — disabled and greyed out if flight is full */}
                        <button
                          onClick={() => setSelectedFlight(f)}
                          disabled={available === 0}
                          style={{
                            padding: "10px 24px",
                            background: available > 0 ? "#c9a84c" : "#2a3a5a",
                            color: available > 0 ? "#0a0f1e" : "#4a5a6a",
                            border: "none",
                            borderRadius: 4,
                            cursor: available > 0 ? "pointer" : "not-allowed",
                            fontFamily: "inherit",
                            fontSize: 13,
                            letterSpacing: 1,
                          }}
                        >
                          BOOK NOW
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Booking form — shown when user clicks Book Now on a flight */}
            {selectedFlight && (
              <div
                style={{
                  background: "#111827",
                  border: "1px solid #c9a84c",
                  borderRadius: 8,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 3,
                    color: "#c9a84c",
                    marginBottom: 16,
                    textTransform: "uppercase",
                  }}
                >
                  Complete Your Booking
                </div>
                {/* Selected flight summary */}
                <div
                  style={{
                    background: "#0d1520",
                    borderRadius: 6,
                    padding: 16,
                    marginBottom: 20,
                    fontSize: 14,
                    color: "#8a9bb5",
                  }}
                >
                  <strong style={{ color: "#e8e0d0" }}>
                    {selectedFlight.flightNumber}
                  </strong>{" "}
                  · {selectedFlight.originName} →{" "}
                  {selectedFlight.destinationName}
                  <br />
                  {formatTime(selectedFlight.departureTime)} ·{" "}
                  <strong style={{ color: "#c9a84c" }}>
                    NZ${selectedFlight.price}
                  </strong>
                </div>
                {/* Passenger details form */}
                <form onSubmit={makeBooking}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                      marginBottom: 16,
                    }}
                  >
                    {[
                      ["firstName", "First Name"],
                      ["lastName", "Last Name"],
                      ["email", "Email"],
                      ["phone", "Phone"],
                    ].map(([field, label]) => (
                      <div key={field}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 11,
                            letterSpacing: 2,
                            color: "#6a7d96",
                            marginBottom: 6,
                            textTransform: "uppercase",
                          }}
                        >
                          {label}
                        </label>
                        <input
                          required
                          type={field === "email" ? "email" : "text"}
                          value={passenger[field]}
                          onChange={(e) =>
                            setPassenger({
                              ...passenger,
                              [field]: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            background: "#0d1520",
                            border: "1px solid #2a3a5a",
                            borderRadius: 4,
                            padding: "10px 12px",
                            color: "#e8e0d0",
                            fontFamily: "inherit",
                            fontSize: 14,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      type="submit"
                      style={{
                        padding: "12px 32px",
                        background: "#c9a84c",
                        color: "#0a0f1e",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 14,
                        letterSpacing: 2,
                        fontWeight: 600,
                      }}
                    >
                      CONFIRM BOOKING
                    </button>
                    {/* Back button returns user to flight results */}
                    <button
                      type="button"
                      onClick={() => setSelectedFlight(null)}
                      style={{
                        padding: "12px 24px",
                        background: "transparent",
                        color: "#8a9bb5",
                        border: "1px solid #2a3a5a",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 14,
                      }}
                    >
                      Back
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* INVOICE — shown after a successful booking with full flight details */}
        {invoice && (
          <div
            style={{
              background: "#111827",
              border: "1px solid #c9a84c",
              borderRadius: 8,
              padding: 32,
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 4,
                  color: "#c9a84c",
                  textTransform: "uppercase",
                }}
              >
                Booking Confirmed
              </div>
              <div style={{ fontSize: 28, marginTop: 8 }}>
                Ref:{" "}
                <strong style={{ color: "#c9a84c" }}>
                  {invoice.bookingRef}
                </strong>
              </div>
            </div>
            {/* Invoice details table — flight info, passenger, and price */}
            <div
              style={{
                borderTop: "1px solid #1e2d45",
                borderBottom: "1px solid #1e2d45",
                padding: "24px 0",
                marginBottom: 24,
              }}
            >
              {[
                ["Flight", invoice.flight.flightNumber],
                [
                  "Route",
                  `${invoice.flight.originName} → ${invoice.flight.destinationName}`,
                ],
                ["Aircraft", invoice.flight.aircraft.name],
                ["Departure", formatTime(invoice.flight.departureTime)],
                ["Arrival", formatTime(invoice.flight.arrivalTime)],
                [
                  "Duration",
                  formatDuration(
                    invoice.flight.departureTime,
                    invoice.flight.arrivalTime,
                  ),
                ],
                ["Passenger", `${passenger.firstName} ${passenger.lastName}`],
                ["Email", passenger.email],
                ["Price", `NZ$${invoice.flight.price}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #0d1520",
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: "#6a7d96", letterSpacing: 1 }}>
                    {label}
                  </span>
                  <span
                    style={{
                      color: label === "Price" ? "#c9a84c" : "#e8e0d0",
                      fontWeight: label === "Price" ? 600 : 400,
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#6a7d96", textAlign: "center" }}>
              Please save your booking reference. You will need it to cancel
              your booking.
            </p>
            {/* Reset button to return to search and book another flight */}
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => {
                  setInvoice(null);
                  setFlights([]);
                  setPassenger({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                  });
                }}
                style={{
                  padding: "12px 32px",
                  background: "#c9a84c",
                  color: "#0a0f1e",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                  letterSpacing: 2,
                }}
              >
                BOOK ANOTHER FLIGHT
              </button>
            </div>
          </div>
        )}

        {/* CANCEL TAB — form to cancel a booking by reference and email */}
        {tab === "cancel" && (
          <div
            style={{
              background: "#111827",
              border: "1px solid #1e2d45",
              borderRadius: 8,
              padding: 24,
              maxWidth: 480,
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: 3,
                color: "#6a7d96",
                marginBottom: 20,
                textTransform: "uppercase",
              }}
            >
              Cancel a Booking
            </div>
            <form onSubmit={cancelBooking}>
              {[
                ["bookingRef", "Booking Reference"],
                ["email", "Email Address"],
              ].map(([field, label]) => (
                <div key={field} style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      letterSpacing: 2,
                      color: "#6a7d96",
                      marginBottom: 6,
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </label>
                  <input
                    required
                    type={field === "email" ? "email" : "text"}
                    value={cancelForm[field]}
                    onChange={(e) =>
                      setCancelForm({ ...cancelForm, [field]: e.target.value })
                    }
                    style={{
                      width: "100%",
                      background: "#0d1520",
                      border: "1px solid #2a3a5a",
                      borderRadius: 4,
                      padding: "10px 12px",
                      color: "#e8e0d0",
                      fontFamily: "inherit",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
              <button
                type="submit"
                style={{
                  padding: "12px 32px",
                  background: "#8b2020",
                  color: "#e8e0d0",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                  letterSpacing: 2,
                }}
              >
                CANCEL BOOKING
              </button>
            </form>
            {/* Cancellation result message */}
            {cancelResult && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: "#0d1520",
                  borderRadius: 4,
                  fontSize: 14,
                }}
              >
                {cancelResult}
              </div>
            )}
          </div>
        )}

        {/* MY BOOKINGS TAB — lookup all bookings for a given email address */}
        {tab === "mybookings" && (
          <div>
            <form
              onSubmit={lookupBookings}
              style={{
                background: "#111827",
                border: "1px solid #1e2d45",
                borderRadius: 8,
                padding: 24,
                marginBottom: 24,
                maxWidth: 480,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 3,
                  color: "#6a7d96",
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}
              >
                Find My Bookings
              </div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  letterSpacing: 2,
                  color: "#6a7d96",
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Email Address
              </label>
              <input
                required
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0d1520",
                  border: "1px solid #2a3a5a",
                  borderRadius: 4,
                  padding: "10px 12px",
                  color: "#e8e0d0",
                  fontFamily: "inherit",
                  fontSize: 14,
                  boxSizing: "border-box",
                  marginBottom: 16,
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "12px 32px",
                  background: "#c9a84c",
                  color: "#0a0f1e",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                  letterSpacing: 2,
                  fontWeight: 600,
                }}
              >
                FIND BOOKINGS
              </button>
            </form>

            {/* List of bookings found for the given email */}
            {myBookings.length > 0 &&
              myBookings.map((b, i) => (
                <div
                  key={i}
                  style={{
                    background: "#111827",
                    border: "1px solid #1e2d45",
                    borderRadius: 8,
                    padding: 20,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6a7d96",
                          letterSpacing: 2,
                          marginBottom: 4,
                        }}
                      >
                        Ref:{" "}
                        <strong style={{ color: "#c9a84c" }}>
                          {b.bookingRef}
                        </strong>
                      </div>
                      <div style={{ fontSize: 16 }}>
                        {b.flight.originName} → {b.flight.destinationName}
                      </div>
                      <div style={{ fontSize: 13, color: "#8a9bb5" }}>
                        {formatTime(b.flight.departureTime)}
                      </div>
                      <div style={{ fontSize: 13, color: "#8a9bb5" }}>
                        {b.flight.flightNumber} · {b.flight.aircraft.name}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, color: "#c9a84c" }}>
                        NZ${b.flight.price}
                      </div>
                      {/* Booking status — green for confirmed, red for cancelled */}
                      <div
                        style={{
                          fontSize: 12,
                          marginTop: 4,
                          color: b.status === "cancelled" ? "#e88" : "#6ab86a",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        {b.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {/* Message shown when no bookings are found for the email */}
            {myBookings.length === 0 && lookupEmail && (
              <p style={{ color: "#6a7d96" }}>
                No bookings found for that email.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
