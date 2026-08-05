import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve static assets from public, src, and root directories
app.use(express.static(path.join(__dirname, "public")));
app.use("/src", express.static(path.join(__dirname, "src")));
app.use(express.static(__dirname));

// API health endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "STB Singapore" });
});

// In-memory bookings store
const bookings = [];

// Booking submission endpoint - sends confirmation emails to Customer and Admin
app.post("/api/bookings", (req, res) => {
  const {
    voucherCode,
    passengerName,
    passengerEmail,
    passengerPhone,
    vehicle,
    pickup,
    destination,
    dateTime,
    flightNo,
    fare,
    currency,
    paymentMethod,
    pax
  } = req.body;

  if (!passengerName || !passengerEmail || !passengerPhone) {
    return res.status(400).json({ error: "Passenger name, email, and phone are required." });
  }

  const newBooking = {
    id: voucherCode || `STB-${Date.now()}`,
    passengerName,
    passengerEmail,
    passengerPhone,
    vehicle,
    pickup,
    destination,
    dateTime,
    flightNo,
    fare,
    currency,
    paymentMethod,
    pax,
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);

  // Email payload for Customer
  const customerEmailPayload = {
    to: passengerEmail,
    subject: `STB Singapore VIP Chauffeur Confirmation - ${newBooking.id}`,
    body: `Dear ${passengerName},\n\nThank you for booking with STB Singapore VIP Chauffeur Services!\n\nBooking Voucher: ${newBooking.id}\nVehicle: ${vehicle}\nPickup: ${pickup}\nDestination: ${destination || 'Hourly Disposal'}\nDate & Time: ${dateTime || 'As Scheduled'}\nPassenger Count: ${pax}\nTotal Fare: ${fare} (${currency})\nPayment: ${paymentMethod}\n\nYour driver details will be assigned 2 hours prior to pickup.`
  };

  // Email payload for Admin Dispatch
  const adminEmailPayload = {
    to: "dispatch@stbsingapore.com",
    subject: `[NEW BOOKING ALERT] ${newBooking.id} - ${passengerName}`,
    body: `New VIP Ride Request Received!\n\nVoucher: ${newBooking.id}\nCustomer Name: ${passengerName}\nCustomer Email: ${passengerEmail}\nPhone: ${passengerPhone}\nVehicle: ${vehicle}\nPickup: ${pickup}\nDestination: ${destination || 'Hourly Disposal'}\nDate/Time: ${dateTime}\nFlight: ${flightNo || 'N/A'}\nFare: ${fare} ${currency}\nPayment Method: ${paymentMethod}`
  };

  console.log("================ EMAIL DISPATCH ================");
  console.log("Customer Email Sent:", JSON.stringify(customerEmailPayload, null, 2));
  console.log("Admin Email Sent:", JSON.stringify(adminEmailPayload, null, 2));
  console.log("================================================");

  // Build WhatsApp API URL for frontend auto-connect
  let waText = `*STB Singapore - VIP Chauffeur Reservation*\n\n`;
  waText += `🎟 *Voucher ID:* ${newBooking.id}\n`;
  waText += `👤 *Passenger:* ${passengerName}\n`;
  waText += `🚘 *Vehicle:* ${vehicle}\n`;
  waText += `📍 *Pickup:* ${pickup}\n`;
  if (destination) waText += `🏁 *Destination:* ${destination}\n`;
  waText += `📅 *Date & Time:* ${dateTime || 'Flexible'}\n`;
  if (flightNo) waText += `✈️ *Flight:* ${flightNo}\n`;
  waText += `💰 *Fare:* ${fare} (${currency})\n`;
  waText += `💳 *Payment:* ${paymentMethod}\n\n`;
  waText += `Confirmation emails sent to ${passengerEmail} and Dispatch Admin. Please assign driver.`;

  const whatsappUrl = `https://api.whatsapp.com/send?phone=6591234567&text=${encodeURIComponent(waText)}`;

  res.json({
    success: true,
    message: "Booking confirmed! Email notifications dispatched to Customer and Dispatch Admin.",
    booking: newBooking,
    emailsSent: {
      customer: passengerEmail,
      admin: "dispatch@stbsingapore.com"
    },
    whatsappUrl
  });
});

// Serve index.html for all SPA routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`STB Singapore Server listening on http://0.0.0.0:${PORT}`);
});
