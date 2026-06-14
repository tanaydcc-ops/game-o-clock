import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { ref, push, onValue, update, remove } from "firebase/database";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const SLOTS = [
  "6:00 AM – 7:30 AM","7:30 AM – 9:00 AM","9:00 AM – 10:30 AM",
  "10:30 AM – 12:00 PM","12:00 PM – 1:30 PM","1:30 PM – 3:00 PM",
  "3:00 PM – 4:30 PM","4:30 PM – 6:00 PM","6:00 PM – 7:30 PM",
  "7:30 PM – 9:00 PM","9:00 PM – 10:30 PM","10:30 PM – 12:00 AM",
  "12:00 AM – 1:30 AM",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const BKASH_NUMBER = "01875600258";

function getSlotPrice(dateStr, slotTime) {
  const d = new Date(dateStr);
  const isFriday = d.getDay() === 5;

  // Extract start hour from slot time
  const startTime = slotTime.split("–")[0].trim();
  const timeParts = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeParts) return isFriday ? 1500 : 1200;

  let hour = parseInt(timeParts[1]);
  const period = timeParts[3].toUpperCase();

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  // Morning: 6am – 1:30pm (6, 7, 8, 9, 10, 11, 12)
  if (hour >= 6 && hour < 15) return isFriday ? 1500 : 1200;
  // Afternoon–Evening: 3pm – 6pm (15, 16, 17)
  if (hour >= 15 && hour < 18) return isFriday ? 2000 : 1500;
  // Night: 6pm – 12am (18, 19, 20, 21, 22, 23)
  if (hour >= 18 && hour < 24) return isFriday ? 2500 : 2000;
  // Midnight: 12am – 3am (0, 1, 2)
  if (hour >= 0 && hour < 3) return isFriday ? 2000 : 1800;

  return isFriday ? 1500 : 1200;
}

const FACILITIES = [
  { icon: "🏆", text: "MVP Award for best performers", color: "#FFF8E1", border: "#FFD54F" },
  { icon: "🚗", text: "Spacious car parking", color: "#E3F2FD", border: "#90CAF9" },
  { icon: "📹", text: "CCTV camera coverage", color: "#FCE4EC", border: "#F48FB1" },
  { icon: "⚽", text: "Ball and gloves available", color: "#E8F5E9", border: "#A5D6A7" },
  { icon: "💧", text: "Fresh drinking water", color: "#E1F5FE", border: "#81D4FA" },
  { icon: "🪑", text: "Comfortable seating", color: "#F3E5F5", border: "#CE93D8" },
  { icon: "🚻", text: "Clean toilet facilities", color: "#E0F7FA", border: "#80DEEA" },
  { icon: "🔒", text: "Secure locker facilities", color: "#FBE9E7", border: "#FFAB91" },
];

const PRICE_CHART = [
  { session: "Morning (6am – 1:30pm)", icon: "🌅", weekday: 1200, weekend: 1500 },
  { session: "Afternoon–Evening (3pm – 6pm)", icon: "☀️", weekday: 1500, weekend: 2000 },
  { session: "Night (6pm – 12am)", icon: "🌙", weekday: 2000, weekend: 2500 },
  { session: "Midnight (12am – 3am)", icon: "⭐", weekday: 1800, weekend: 2000 },
];

const TURF_INFO = {
  address: "Siddhirganj Silo Road (Khader Par), Siddhirganj, Narayanganj",
  phone: "+8801875600258",
  whatsapp: "8801875600258",
  facebook: "https://www.facebook.com/share/14ZyhMhNrhC/",
  maps: "https://maps.app.goo.gl/MbFfTJfgT1DLqJvP6",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getDateOptions() {
  const today = new Date();
  return Array.from({ length: 60 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const v = d.toISOString().slice(0, 10);
    const lbl = i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
    return { v, lbl };
  });
}

function fmt(n) { return "৳ " + Number(n).toLocaleString(); }

function statusOf(b) {
  const total = b.totalPrice || 0;
  const paid = b.advancePaid || 0;
  if (total === 0 && paid === 0) return "due";
  if (paid >= total && total > 0) return "paid";
  if (paid > 0) return "partial";
  return "due";
}

function getDateLabel(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1) return `${DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;
  return dateStr;
}

const C = {
  green: "#1D9E75", lightGreen: "#E1F5EE", darkGreen: "#0F6E56",
  amber: "#BA7517", lightAmber: "#FAEEDA",
  blue: "#1565C0", lightBlue: "#E3F2FD",
  red: "#A32D2D", lightRed: "#FCEBEB",
  grad: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 50%, #1D9E75 100%)",
  gradHeader: "linear-gradient(135deg, #0d3b2e 0%, #1a5c44 50%, #1D9E75 100%)",
};

// ─── CUSTOMER CANCEL BOOKING ──────────────────────────────────────
function CancelBooking({ allBookings }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [selDate, setSelDate] = useState("");
  const [selSlot, setSelSlot] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!phone || !selDate || !selSlot) { setStatus({ type: "error", msg: "Please fill all fields" }); return; }
    setLoading(true);
    const match = allBookings.find(b =>
      (b.phone === phone || b.phone === "0" + phone.slice(-10)) &&
      b.date === selDate && b.slot === selSlot &&
      b.status !== "cancelled"
    );
    if (!match) {
      setStatus({ type: "error", msg: "No booking found with these details. Please check and try again." });
      setLoading(false); return;
    }
    await update(ref(db, `bookings/${match.id}`), {
      status: "cancelled",
      cancelledBy: "customer",
      cancelledAt: new Date().toISOString(),
    });
    setStatus({ type: "success", msg: `✅ Booking cancelled for ${match.name} on ${match.date} (${match.slot})` });
    setPhone(""); setSelDate(""); setSelSlot("");
    setLoading(false);
  }

  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", marginTop: 4, background: "#fafafa" };

  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "12px", background: "#FCEBEB", border: "1.5px solid #FFAB91",
        borderRadius: 12, fontSize: 14, fontWeight: 600, color: C.red, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        ✕ Cancel my booking
      </button>
      {open && (
        <div style={{ background: "#fff", border: "1.5px solid #FFAB91", borderRadius: 12, padding: "1rem 1.25rem", marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 12 }}>Cancel a booking</div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>📞 Your phone number</label>
            <input type="tel" placeholder="01XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} style={inp} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>📆 Booking date</label>
            <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)} style={inp} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>🕐 Slot</label>
            <select value={selSlot} onChange={e => setSelSlot(e.target.value)} style={inp}>
              <option value="">Select slot</option>
              {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {status && (
            <div style={{
              padding: "10px 12px", borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 500,
              background: status.type === "success" ? C.lightGreen : C.lightRed,
              color: status.type === "success" ? C.darkGreen : C.red,
            }}>{status.msg}</div>
          )}
          <button onClick={handleCancel} disabled={loading} style={{
            width: "100%", padding: "11px", background: loading ? "#ccc" : C.red,
            color: "#fff", border: "none", borderRadius: 10, fontSize: 14,
            fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          }}>{loading ? "Processing..." : "✕ Cancel booking"}</button>
        </div>
      )}
    </div>
  );
}

// ─── CUSTOMER VIEW ────────────────────────────────────────────────
function CustomerApp({ bookings, allBookings }) {
  const [step, setStep] = useState(1);
  const [selDate, setSelDate] = useState(todayStr());
  const [selSlot, setSelSlot] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", area: "", advancePaid: "", totalPrice: "1800" });
  const [payOpt, setPayOpt] = useState("skip");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (toast) { const id = setTimeout(() => setToast(null), 3000); return () => clearTimeout(id); }
  }, [toast]);

  const bookedSlots = bookings.filter(b => b.date === selDate).map(b => b.slot);

  async function handleConfirm() {
    if (!form.name.trim()) { setToast("Please enter your name"); return; }
    if (!form.phone.trim()) { setToast("Please enter your phone number"); return; }
    setLoading(true);
    try {
      await push(ref(db, "bookings"), {
        name: form.name.trim(), phone: form.phone.trim(), area: form.area.trim(),
        date: selDate, slot: selSlot,
        totalPrice: parseInt(form.totalPrice) || 1800,
        advancePaid: payOpt === "pay" ? (parseInt(form.advancePaid) || 0) : 0,
        createdAt: new Date().toISOString(),
      });
      setToast("✓ Booking confirmed!");
      setStep(1); setSelSlot(null);
      setForm({ name: "", phone: "", area: "", advancePaid: "", totalPrice: "1800" });
      setPayOpt("skip");
    } catch (e) { setToast("Error saving booking. Please try again."); }
    setLoading(false);
  }

  const inp = {
    width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0e0",
    borderRadius: 10, fontSize: 14, fontFamily: "inherit", marginTop: 4,
    background: "#fafafa", outline: "none", color: "#222",
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#f0f4f0", minHeight: "100vh" }}>

      {/* Hero Header */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* Cover photo */}
        <img src="/cover.jpeg" alt="Game O'Clock Turf" style={{ width: "100%", height: 220, objectFit: "cover", objectPosition: "center top", display: "block" }} />
        {/* Dark overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(13,59,46,0.85) 100%)" }} />
        {/* Content on top */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "1.25rem 1rem", textAlign: "center" }}>
          <img src="/logo.png" alt="Game O'Clock Logo" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 8, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: 0.5, textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>Game O'Clock</div>
          <div style={{ fontSize: 13, color: "#a8d5bf", fontWeight: 500, marginTop: 2 }}>Football & Cricket Academy</div>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 12, padding: "4px 14px", borderRadius: 20, marginTop: 8, backdropFilter: "blur(4px)" }}>
            📅 Book Your Slot Online
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px 2rem" }}>

        {/* Contact Info */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "1rem 1.25rem", marginTop: 16, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>📍</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>{TURF_INFO.address}</div>
              <a href={TURF_INFO.maps} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.green, textDecoration: "none", fontWeight: 500 }}>
                View on Google Maps →
              </a>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={`tel:${TURF_INFO.phone}`} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              background: "#FFF3E0", border: "1.5px solid #FFB74D", borderRadius: 25,
              fontSize: 13, color: "#E65100", textDecoration: "none", fontWeight: 600,
            }}>📞 {TURF_INFO.phone}</a>
            <a href={`https://wa.me/${TURF_INFO.whatsapp}`} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              background: "#E8F5E9", border: "1.5px solid #66BB6A", borderRadius: 25,
              fontSize: 13, color: "#2E7D32", textDecoration: "none", fontWeight: 600,
            }}>💬 WhatsApp</a>
            <a href={TURF_INFO.facebook} target="_blank" rel="noreferrer" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              background: "#E3F2FD", border: "1.5px solid #42A5F5", borderRadius: 25,
              fontSize: 13, color: "#1565C0", textDecoration: "none", fontWeight: 600,
            }}>📘 Facebook</a>
          </div>
        </div>

        {/* Price Chart */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "1rem 1.25rem", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: C.lightAmber, padding: "4px 8px", borderRadius: 8 }}>💰</span>
            Slot Pricing
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "4px 8px" }}>
            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, paddingBottom: 6, borderBottom: "1.5px solid #f0f0f0" }}>Session</div>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 700, textAlign: "center", paddingBottom: 6, borderBottom: "1.5px solid #f0f0f0" }}>Sat–Thu</div>
            <div style={{ fontSize: 11, color: "#E65100", fontWeight: 700, textAlign: "center", paddingBottom: 6, borderBottom: "1.5px solid #f0f0f0" }}>Friday</div>
            {PRICE_CHART.map((p, i) => (
              <>
                <div key={"s"+i} style={{ fontSize: 12, color: "#444", padding: "6px 0", borderBottom: "0.5px solid #f5f5f5", display: "flex", alignItems: "center", gap: 4 }}>
                  <span>{p.icon}</span> {p.session}
                </div>
                <div key={"w"+i} style={{ fontSize: 13, fontWeight: 700, color: C.green, textAlign: "center", padding: "6px 0", borderBottom: "0.5px solid #f5f5f5" }}>৳{p.weekday.toLocaleString()}</div>
                <div key={"e"+i} style={{ fontSize: 13, fontWeight: 700, color: "#E65100", textAlign: "center", padding: "6px 0", borderBottom: "0.5px solid #f5f5f5" }}>৳{p.weekend.toLocaleString()}</div>
              </>
            ))}
          </div>
        </div>

        {/* Facilities */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "1rem 1.25rem", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: C.lightGreen, padding: "4px 8px", borderRadius: 8 }}>🏟️</span>
            Our Facilities
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {FACILITIES.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#333",
                background: f.color, border: `1px solid ${f.border}`, borderRadius: 10, padding: "7px 10px",
              }}>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <span style={{ fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Booking section header */}
        <div style={{ background: C.grad, borderRadius: 16, padding: "1rem 1.25rem", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>📅 Book a Slot</div>
          <div style={{ fontSize: 12, color: "#a8d5bf", marginTop: 4 }}>Choose your date and time below</div>
        </div>

        {/* Customer cancellation */}
        <CancelBooking allBookings={allBookings || []} />

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
          {[1, 2, 3].map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", flex: i < 2 ? "1" : "0" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
                background: step > n ? C.green : step === n ? C.gradHeader : "#fff",
                color: step > n ? "#fff" : step === n ? "#fff" : "#ccc",
                border: `2px solid ${step > n ? C.green : step === n ? C.green : "#e0e0e0"}`,
                boxShadow: step === n ? `0 0 0 4px ${C.lightGreen}` : "none",
              }}>{step > n ? "✓" : n}</div>
              {i < 2 && <div style={{ flex: 1, height: 2, background: step > n+1 ? C.green : "#e0e0e0", margin: "0 4px", borderRadius: 2 }} />}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "#1a3a2a" }}>📆 Choose a date</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
              {getDateOptions().map(d => (
                <button key={d.v} onClick={() => { setSelDate(d.v); setSelSlot(null); setForm(f=>({...f,totalPrice:"1800"})); }} style={{
                  padding: "8px 16px", borderRadius: 25, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
                  border: `2px solid ${selDate === d.v ? C.green : "#e0e0e0"}`,
                  background: selDate === d.v ? C.green : "#fff",
                  color: selDate === d.v ? "#fff" : "#555",
                  fontWeight: selDate === d.v ? 700 : 400,
                  boxShadow: selDate === d.v ? `0 4px 12px rgba(29,158,117,0.3)` : "none",
                  transform: selDate === d.v ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.15s",
                }}>{d.lbl}</button>
              ))}
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "#1a3a2a" }}>🕐 Choose a slot</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {SLOTS.map(s => {
                const taken = bookedSlots.includes(s);
                const isSel = selSlot === s;
                const price = getSlotPrice(selDate, s);
                return (
                  <div key={s} onClick={() => {
                    if (!taken) { setSelSlot(s); setForm(f => ({ ...f, totalPrice: String(price) })); }
                  }} style={{
                    border: `2px solid ${isSel ? C.green : taken ? "#f0f0f0" : "#e8e8e8"}`,
                    borderRadius: 12, padding: "10px 12px", cursor: taken ? "not-allowed" : "pointer",
                    background: isSel ? C.lightGreen : taken ? "#f9f9f7" : "#fff",
                    opacity: taken ? 0.5 : 1,
                    boxShadow: isSel ? `0 4px 12px rgba(29,158,117,0.25)` : "0 1px 4px rgba(0,0,0,0.05)",
                    transform: isSel ? "scale(1.02)" : "scale(1)",
                    transition: "all 0.15s",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: isSel ? C.darkGreen : "#333" }}>🕐 {s}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                        background: taken ? "#f0f0ee" : isSel ? C.darkGreen : C.lightGreen,
                        color: taken ? "#aaa" : isSel ? "#fff" : C.darkGreen,
                      }}>{taken ? "Booked" : "Available"}</span>
                      {!taken && <span style={{ fontSize: 12, fontWeight: 700, color: isSel ? C.darkGreen : C.amber }}>৳{price.toLocaleString()}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => selSlot && setStep(2)} style={{
              background: selSlot ? C.grad : "#ccc", color: "#fff", border: "none", borderRadius: 12,
              padding: "13px 18px", fontSize: 15, fontWeight: 700, cursor: selSlot ? "pointer" : "not-allowed",
              width: "100%", boxShadow: selSlot ? "0 4px 16px rgba(29,158,117,0.4)" : "none",
            }}>
              Continue → {selSlot ? `(${fmt(parseInt(form.totalPrice))})` : ""}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#1a3a2a" }}>👤 Your details</div>
            {[
              { key: "name", label: "Your name *", ph: "e.g. Jubayer Vai", type: "text", icon: "👤" },
              { key: "phone", label: "Mobile number *", ph: "01XXXXXXXXX", type: "tel", icon: "📞" },
              { key: "area", label: "Area / reference", ph: "e.g. Amtola, Silogate", type: "text", icon: "📍" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: "#555", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  {f.icon} {f.label}
                </label>
                <input type={f.type} placeholder={f.ph} value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={inp} />
              </div>
            ))}

            {/* Payment */}
            <div style={{ background: "linear-gradient(135deg, #fff8e1, #fff3e0)", border: "1.5px solid #FFB74D", borderRadius: 14, padding: "1rem 1.25rem", marginTop: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#E65100" }}>💳 Advance Payment (Optional)</div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
                Slot price: <strong style={{ color: C.green, fontSize: 16 }}>{fmt(parseInt(form.totalPrice))}</strong> — Pay remaining at venue
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={() => setPayOpt("skip")} style={{
                  flex: 1, padding: "10px", borderRadius: 10, fontSize: 13, cursor: "pointer",
                  border: `2px solid ${payOpt === "skip" ? "#ccc" : "#e0e0e0"}`,
                  background: payOpt === "skip" ? "#fff" : "transparent",
                  fontWeight: payOpt === "skip" ? 700 : 400, color: "#555",
                }}>🏃 Pay at venue</button>
                <button onClick={() => setPayOpt("pay")} style={{
                  flex: 1, padding: "10px", borderRadius: 10, fontSize: 13, cursor: "pointer",
                  border: `2px solid ${payOpt === "pay" ? "#E2136E" : "#e0e0e0"}`,
                  background: payOpt === "pay" ? "#FCE4EC" : "transparent",
                  color: payOpt === "pay" ? "#880E4F" : "#555",
                  fontWeight: payOpt === "pay" ? 700 : 400,
                }}>📱 Pay via bKash</button>
              </div>
              {payOpt === "pay" && (
                <div style={{ background: "#fff", border: "1.5px solid #F48FB1", borderRadius: 12, padding: "1rem" }}>
                  <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
                    Send bKash to: <strong style={{ fontSize: 18, color: "#E2136E" }}>📱 {BKASH_NUMBER}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Enter the amount you sent:</div>
                  <input type="number" placeholder="e.g. 500" value={form.advancePaid}
                    onChange={e => setForm({ ...form, advancePaid: e.target.value })} style={inp} />
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setStep(1)} style={{
                background: "#fff", color: "#555", border: "1.5px solid #ddd", borderRadius: 10,
                padding: "11px 18px", fontSize: 14, cursor: "pointer", fontWeight: 600,
              }}>← Back</button>
              <button onClick={() => {
                if (!form.name.trim()) { setToast("Please enter your name"); return; }
                if (!form.phone.trim()) { setToast("Please enter your phone"); return; }
                setStep(3);
              }} style={{
                flex: 1, background: C.grad, color: "#fff", border: "none", borderRadius: 10,
                padding: "11px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(29,158,117,0.35)",
              }}>Review Booking →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#1a3a2a" }}>✅ Confirm your booking</div>
            <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <div style={{ background: C.grad, padding: "10px 16px", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                📋 Booking Summary
              </div>
              {[
                ["👤 Name", form.name],
                ["📆 Date", getDateOptions().find(d => d.v === selDate)?.lbl || selDate],
                ["🕐 Slot", selSlot],
                ["📞 Phone", form.phone],
                ["📍 Area", form.area || "—"],
                ["💰 Slot price", fmt(parseInt(form.totalPrice) || 1800)],
                ["💳 Advance paid", payOpt === "pay" && form.advancePaid ? fmt(form.advancePaid) : "Pay at venue"],
              ].map(([l, v], i, arr) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", padding: "10px 16px",
                  borderBottom: i < arr.length - 1 ? "0.5px solid #f0f0f0" : "none",
                  background: i % 2 === 0 ? "#fff" : "#fafff8",
                }}>
                  <span style={{ fontSize: 13, color: "#777" }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#222" }}>{v}</span>
                </div>
              ))}
            </div>

            {payOpt === "pay" && (
              <div style={{ background: "#E8F5E9", border: "1.5px solid #66BB6A", borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "#2E7D32", fontWeight: 500 }}>
                ✅ Please confirm you have sent <strong>{fmt(form.advancePaid)}</strong> to bKash <strong>{BKASH_NUMBER}</strong>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{
                background: "#fff", color: "#555", border: "1.5px solid #ddd", borderRadius: 10,
                padding: "11px 18px", fontSize: 14, cursor: "pointer", fontWeight: 600,
              }}>← Back</button>
              <button onClick={handleConfirm} disabled={loading} style={{
                flex: 1, background: loading ? "#ccc" : C.grad, color: "#fff", border: "none", borderRadius: 10,
                padding: "11px 18px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 16px rgba(29,158,117,0.4)",
              }}>{loading ? "Saving..." : "✓ Confirm Booking"}</button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: C.green, color: "#fff", padding: "12px 24px", borderRadius: 25,
          fontSize: 14, fontWeight: 600, zIndex: 999,
          boxShadow: "0 4px 20px rgba(29,158,117,0.4)", whiteSpace: "nowrap",
        }}>{toast}</div>
      )}
    </div>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────
function AdminApp({ bookings, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [editBooking, setEditBooking] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchDate, setSearchDate] = useState("");

  useEffect(() => {
    if (toast) { const id = setTimeout(() => setToast(null), 2500); return () => clearTimeout(id); }
  }, [toast]);

  function openEdit(b) {
    setEditBooking(b);
    setEditForm({
      name: b.name || "",
      phone: b.phone || "",
      area: b.area || "",
      date: b.date || "",
      slot: b.slot || "",
      totalPrice: b.totalPrice || 1800,
      advancePaid: b.advancePaid || 0,
    });
  }

  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvESu4fkGy_z2OxNGyonBZozy5ob6SdZD3CrSc6XfiRsBxkjcva3bakUgY_OqXu28/exec";

  async function saveEdit() {
    if (!editForm.name.trim()) { setToast("Name is required"); return; }
    
    const updatedData = {
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      area: editForm.area.trim(),
      date: editForm.date,
      slot: editForm.slot,
      totalPrice: parseInt(editForm.totalPrice) || 1800,
      advancePaid: parseInt(editForm.advancePaid) || 0,
      updatedAt: new Date().toISOString(),
    };

    // Update Firebase
    await update(ref(db, `bookings/${editBooking.id}`), updatedData);

    // Sync to Google Sheet and Calendar via Apps Script
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "editBooking",
          id: editBooking.id,
          oldDate: editBooking.date,
          oldSlot: editBooking.slot,
          ...updatedData,
        }),
      });
    } catch (e) { console.log("Sheets sync error:", e); }

    setEditBooking(null);
    setToast("✓ Booking updated!");
  }

  async function markPaid(id) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    await update(ref(db, `bookings/${id}`), { advancePaid: b.totalPrice });
    setToast("✓ Marked as fully paid");
  }

  async function cancelBooking(id) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;
    if (!window.confirm(`Cancel booking for ${b.name} on ${b.date} (${b.slot})?`)) return;
    await update(ref(db, `bookings/${id}`), {
      status: "cancelled",
      cancelledBy: "admin",
      cancelledAt: new Date().toISOString(),
    });
    setToast("✓ Booking cancelled");
  }

  const todayBks = bookings.filter(b => b.date === todayStr() && b.status !== "cancelled");
  const totalDue = bookings.reduce((s, b) => s + ((b.totalPrice || 0) - (b.advancePaid || 0)), 0);
  const totalColl = bookings.reduce((s, b) => s + (b.advancePaid || 0), 0);

  let filtered = bookings.filter(b => b.status !== "cancelled");
  if (searchDate) {
    filtered = filtered.filter(b => b.date === searchDate);
  } else if (filter === "today") {
    filtered = filtered.filter(b => b.date === todayStr());
  } else if (filter === "upcoming") {
    filtered = filtered.filter(b => b.date > todayStr());
  } else if (filter === "due") {
    filtered = filtered.filter(b => statusOf(b) !== "paid");
  }

  function BRow({ b }) {
    const isCancelled = b.status === "cancelled";
    const s = statusOf(b);
    const due = (b.totalPrice || 0) - (b.advancePaid || 0);
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid #f0f0f0", opacity: isCancelled ? 0.6 : 1 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, textDecoration: isCancelled ? "line-through" : "none", color: isCancelled ? "#aaa" : "#222" }}>
            {isCancelled ? "❌ " : ""}{b.name}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            {getDateLabel(b.date)} · {b.slot}{b.area ? ` · ${b.area}` : ""}
            {b.phone ? <span> · <a href={`tel:${b.phone}`} style={{ color: C.green }}>{b.phone}</a></span> : ""}
          </div>
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 1 }}>
            Total: {fmt(b.totalPrice||0)} | Paid: {fmt(b.advancePaid||0)}
            {isCancelled && <span style={{ color: C.red, marginLeft: 6 }}>Cancelled by {b.cancelledBy}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
          {!isCancelled && (
            <div style={{ fontSize: 13, fontWeight: 700, color: s === "paid" ? C.green : C.amber }}>
              {s === "paid" ? "Fully paid" : `${fmt(due)} due`}
            </div>
          )}
          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center", marginTop: 4 }}>
            {!isCancelled && (
              <>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 600,
                  background: s === "paid" ? C.lightGreen : s === "partial" ? C.lightAmber : C.lightRed,
                  color: s === "paid" ? C.darkGreen : s === "partial" ? C.amber : C.red,
                }}>{s === "paid" ? "Paid" : s === "partial" ? "Partial" : "Due"}</span>
                {s !== "paid" && (
                  <button onClick={() => markPaid(b.id)} style={{
                    fontSize: 11, padding: "3px 8px", borderRadius: 8, background: C.lightGreen,
                    color: C.darkGreen, border: `1px solid ${C.green}`, cursor: "pointer", fontWeight: 600,
                  }}>Mark paid</button>
                )}
                <button onClick={() => cancelBooking(b.id)} style={{
                  fontSize: 11, padding: "3px 8px", borderRadius: 8, background: C.lightRed,
                  color: C.red, border: `1px solid ${C.red}`, cursor: "pointer", fontWeight: 600,
                }}>✕ Cancel</button>
                <button onClick={() => openEdit(b)} style={{
                  fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "#E3F2FD",
                  color: "#1565C0", border: "1px solid #90CAF9", cursor: "pointer", fontWeight: 600,
                }}>✎ Edit</button>
              </>
            )}
            {isCancelled && (
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: C.lightRed, color: C.red, fontWeight: 600 }}>Cancelled</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const card = { background: "#fff", borderRadius: 16, padding: "1rem 1.25rem", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#f0f4f0", minHeight: "100vh" }}>
      <div style={{ background: C.gradHeader, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 40, height: 40, objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Game O'Clock</div>
            <div style={{ fontSize: 11, color: "#a8d5bf" }}>Football & Cricket Academy</div>
          </div>
          <span style={{ fontSize: 11, background: "#FFD54F", color: "#5D4037", padding: "3px 9px", borderRadius: 10, fontWeight: 700 }}>Admin</span>
        </div>
        <button onClick={onLogout} style={{ fontSize: 13, color: "#fff", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "6px 14px", cursor: "pointer", backdropFilter: "blur(4px)" }}>
          Logout
        </button>
      </div>

      <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #f0f0f0", padding: "0 16px" }}>
        {[["dashboard", "📊 Dashboard"], ["bookings", "📋 Bookings"], ["payments", "💳 Payments"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "12px 14px", border: "none", borderBottom: `3px solid ${tab === t ? C.green : "transparent"}`,
            background: "transparent", color: tab === t ? C.green : "#888",
            fontWeight: tab === t ? 700 : 400, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: "16px" }}>
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Today's bookings", val: todayBks.length, color: "#3F51B5", bg: "#E8EAF6" },
                { label: "Total collected", val: fmt(totalColl), color: C.darkGreen, bg: C.lightGreen },
                { label: "Total due", val: fmt(totalDue), color: C.amber, bg: C.lightAmber },
              ].map((s, i) => (
                <div key={i} style={{ background: s.bg, borderRadius: 14, padding: "0.875rem 1rem" }}>
                  <div style={{ fontSize: 12, color: s.color, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>📅 Today's bookings</div>
              {todayBks.length === 0 ? <p style={{ fontSize: 13, color: "#aaa" }}>No bookings today</p> : todayBks.map(b => <BRow key={b.id} b={b} />)}
            </div>
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>🕐 Recent bookings</div>
              {bookings.slice(-5).reverse().map(b => <BRow key={b.id} b={b} />)}
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>All bookings</div>
            
            {/* Date search */}
            <div style={{ background: "#fff", borderRadius: 12, padding: "0.875rem 1rem", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 8 }}>🔍 Search by date</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)}
                  style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #ccc", borderRadius: 8, fontSize: 14, fontFamily: "inherit", color: "#222", background: "#fff", colorScheme: "light" }} />
                {searchDate && (
                  <button onClick={() => setSearchDate("")} style={{
                    padding: "9px 14px", background: "#f0f0ee", border: "1px solid #ddd",
                    borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600, color: "#333",
                  }}>✕ Clear</button>
                )}
              </div>
            </div>

            {searchDate && (
              <div style={{ background: C.lightGreen, border: `1px solid ${C.green}`, borderRadius: 10, padding: "8px 14px", marginBottom: 12, fontSize: 13, color: C.darkGreen, fontWeight: 600 }}>
                📅 Showing bookings for {searchDate} — {filtered.filter(b => b.date === searchDate).length} booking(s) found
              </div>
            )}

            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {[["all","All"],["today","Today"],["upcoming","Upcoming"],["due","Has due"]].map(([f,l]) => (
                <button key={f} onClick={() => { setFilter(f); setSearchDate(""); }} style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  border: `1.5px solid ${filter === f && !searchDate ? C.green : "#e0e0e0"}`,
                  background: filter === f && !searchDate ? C.lightGreen : "#fff",
                  color: filter === f && !searchDate ? C.darkGreen : "#888",
                  fontWeight: filter === f && !searchDate ? 700 : 400,
                }}>{l}</button>
              ))}
            </div>
            <div style={card}>
              {filtered.length === 0
                ? <p style={{ fontSize: 13, color: "#aaa" }}>No bookings found</p>
                : filtered.map(b => <BRow key={b.id} b={b} />)
              }
            </div>
          </div>
        )}

        {tab === "payments" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: C.lightGreen, borderRadius: 14, padding: "0.875rem 1rem" }}>
                <div style={{ fontSize: 12, color: C.darkGreen, fontWeight: 600, marginBottom: 4 }}>Collected</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>{fmt(totalColl)}</div>
              </div>
              <div style={{ background: C.lightAmber, borderRadius: 14, padding: "0.875rem 1rem" }}>
                <div style={{ fontSize: 12, color: C.amber, fontWeight: 600, marginBottom: 4 }}>Pending dues</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.amber }}>{fmt(totalDue)}</div>
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>⏳ Pending dues</div>
              {bookings.filter(b => statusOf(b) !== "paid").length === 0
                ? <p style={{ fontSize: 13, color: "#aaa" }}>No pending dues 🎉</p>
                : bookings.filter(b => statusOf(b) !== "paid").map(b => <BRow key={b.id} b={b} />)}
            </div>
            <div style={card}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>✅ Fully paid</div>
              {bookings.filter(b => statusOf(b) === "paid").length === 0
                ? <p style={{ fontSize: 13, color: "#aaa" }}>No fully paid bookings yet</p>
                : bookings.filter(b => statusOf(b) === "paid").map(b => <BRow key={b.id} b={b} />)}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editBooking && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 16,
        }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "1.5rem", width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#1a3a2a" }}>✎ Edit Booking</div>
            {[
              { key: "name", label: "Name", type: "text" },
              { key: "phone", label: "Phone", type: "tel" },
              { key: "area", label: "Area", type: "text" },
              { key: "date", label: "Date", type: "date" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: "#555", fontWeight: 600, display: "block", marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} value={editForm[f.key]} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 10, fontSize: 14, fontFamily: "inherit" }} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "#555", fontWeight: 600, display: "block", marginBottom: 4 }}>Slot</label>
              <select value={editForm.slot} onChange={e => setEditForm({ ...editForm, slot: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 10, fontSize: 14, fontFamily: "inherit" }}>
                {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: "#555", fontWeight: 600, display: "block", marginBottom: 4 }}>Total price (৳)</label>
                <input type="number" value={editForm.totalPrice} onChange={e => setEditForm({ ...editForm, totalPrice: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 10, fontSize: 14, fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#555", fontWeight: 600, display: "block", marginBottom: 4 }}>Advance paid (৳)</label>
                <input type="number" value={editForm.advancePaid} onChange={e => setEditForm({ ...editForm, advancePaid: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e0e0e0", borderRadius: 10, fontSize: 14, fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditBooking(null)} style={{
                flex: 1, padding: "11px", background: "#f5f5f5", border: "1.5px solid #e0e0e0",
                borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={saveEdit} style={{
                flex: 1, padding: "11px", background: C.grad, color: "#fff",
                border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(29,158,117,0.35)",
              }}>✓ Save changes</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#fff", padding: "12px 24px", borderRadius: 25, fontSize: 14, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 20px rgba(29,158,117,0.4)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────
function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError("Please enter email and password"); return; }
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) { setError("Invalid email or password"); }
    setLoading(false);
  }

  const inp = { width: "100%", padding: "11px 12px", border: "1.5px solid #e0e0e0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", marginTop: 6, background: "#fafafa", color: "#222" };

  return (
    <div style={{ minHeight: "100vh", background: C.gradHeader, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',system-ui,sans-serif", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "2rem 1.75rem", width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 90, height: 90, objectFit: "contain", marginBottom: 10 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1a3a2a" }}>Game O'Clock</div>
          <div style={{ fontSize: 12, color: "#888" }}>Football & Cricket Academy</div>
          <div style={{ display: "inline-block", background: C.lightGreen, color: C.darkGreen, fontSize: 12, fontWeight: 600, padding: "4px 14px", borderRadius: 20, marginTop: 8 }}>🔐 Admin Login</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>📧 Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" style={inp} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>🔑 Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inp}
            onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        {error && <div style={{ fontSize: 13, color: C.red, marginBottom: 12, background: C.lightRed, padding: "8px 12px", borderRadius: 8 }}>⚠️ {error}</div>}
        <button onClick={handleLogin} disabled={loading} style={{
          background: loading ? "#ccc" : C.grad, color: "#fff", border: "none", borderRadius: 12,
          padding: "13px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          width: "100%", boxShadow: loading ? "none" : "0 4px 16px rgba(29,158,117,0.4)",
        }}>{loading ? "Logging in..." : "Login →"}</button>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (window.location.pathname === "/admin" || window.location.hash === "#admin") setIsAdmin(true);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthReady(true); });
    return unsub;
  }, []);

  useEffect(() => {
    const bRef = ref(db, "bookings");
    const unsub = onValue(bRef, (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        list.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
        setBookings(list);
      } else setBookings([]);
    });
    return unsub;
  }, []);

  if (!authReady) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui,sans-serif", background: C.gradHeader }}>
      <div style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>⚽ Loading...</div>
    </div>
  );

  if (isAdmin) {
    if (!user) return <AdminLogin />;
    return <AdminApp bookings={bookings} onLogout={() => signOut(auth)} />;
  }

  const publicBookings = bookings
    .filter(b => b.status !== "cancelled")
    .map(b => ({ date: b.date, slot: b.slot }));
  const allBookingsForCancel = bookings.filter(b => b.status !== "cancelled");
  return <CustomerApp bookings={publicBookings} allBookings={allBookingsForCancel} />;
}
