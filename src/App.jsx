import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ──────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://mxpdzsnpvwxllqxrugwd.supabase.co";
const SUPABASE_KEY = "sb_publishable_fUFq0vKDYQ5KkJ2Op2Oxog_kOMfRMjT";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Constants ─────────────────────────────────────────────────────────────
const STATUSES = {
  lead:      { label: "Event Lead",      dot: "#F59E0B", bg: "#FFFBEB", text: "#92400E", border: "#FCD34D" },
  booked:    { label: "Booked",          dot: "#3B82F6", bg: "#EFF6FF", text: "#1E40AF", border: "#93C5FD" },
  preshow:   { label: "Pre-Show",        dot: "#F97316", bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74" },
  countdown: { label: "Final Countdown", dot: "#EF4444", bg: "#FFF1F2", text: "#991B1B", border: "#FCA5A5" },
  complete:  { label: "Complete",        dot: "#10B981", bg: "#ECFDF5", text: "#065F46", border: "#6EE7B7" },
};
const STATUS_ORDER = ["lead","booked","preshow","countdown","complete"];
const CATEGORIES = ["Home & Garden Show","County Fair","Trade Show","Home Expo","Community Event","Festival","Other"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

// ─── Hooks ─────────────────────────────────────────────────────────────────
function useMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

// ─── Utility functions ─────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return MONTHS[+m - 1] + " " + +day + ", " + y;
}
function fmtDateRange(startDate, endDate) {
  if (!startDate) return "—";
  if (!endDate || endDate === startDate) return fmtDate(startDate);
  const [sy, sm, sd] = startDate.split("-");
  const [ey, em, ed] = endDate.split("-");
  if (sy === ey && sm === em) return MONTHS[+sm - 1] + " " + +sd + "–" + +ed + ", " + sy;
  if (sy === ey) return MONTHS[+sm - 1] + " " + +sd + " – " + MONTHS[+em - 1] + " " + +ed + ", " + sy;
  return fmtDate(startDate) + " – " + fmtDate(endDate);
}
function fmtMoney(n) {
  return (n != null && n !== "") ? "$" + Number(n).toLocaleString() : "—";
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) +
    " at " + d.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" });
}
function genId() { return Date.now() + Math.floor(Math.random() * 10000); }

function DEFAULT_CHECKLIST() {
  return [
    { id:1,  label:"Confirm booth number & location with show coordinator", checked:false },
    { id:2,  label:"Confirm load-in time and parking / trailer access", checked:false },
    { id:3,  label:"Verify all assigned employees have confirmed their shift", checked:false },
    { id:4,  label:"Pack product samples and display materials", checked:false },
    { id:5,  label:"Load trailer with all booth supplies", checked:false },
    { id:6,  label:"Bring payment if a balance is still due at the show", checked:false },
    { id:7,  label:"Print show schedule and employee assignments", checked:false },
    { id:8,  label:"Pack marketing materials and brochures", checked:false },
    { id:9,  label:"Save the day-of coordinator contact in your phone", checked:false },
    { id:10, label:"Review show hours and confirm start & end times", checked:false },
  ];
}

function DEFAULT_INVENTORY() {
  return [
    { id:1,  label:"Banner stands",             qty:2,   packed:false },
    { id:2,  label:"Tablecloth",                qty:1,   packed:false },
    { id:3,  label:"Table skirt",               qty:1,   packed:false },
    { id:4,  label:"iPad / tablet",             qty:1,   packed:false },
    { id:5,  label:"Brochures",                 qty:100, packed:false },
    { id:6,  label:"Product samples",           qty:1,   packed:false },
    { id:7,  label:"Business cards",            qty:50,  packed:false },
    { id:8,  label:"Extension cord",            qty:1,   packed:false },
    { id:9,  label:"Power strip",               qty:1,   packed:false },
    { id:10, label:"Tape & velcro strips",      qty:1,   packed:false },
    { id:11, label:"Folding chairs",            qty:2,   packed:false },
    { id:12, label:"Branded signage / display", qty:1,   packed:false },
    { id:13, label:"Lead forms & clipboard",    qty:1,   packed:false },
    { id:14, label:"Pens",                      qty:10,  packed:false },
    { id:15, label:"Water & snacks for staff",  qty:1,   packed:false },
  ];
}

function applyAutoStatus(show) {
  if (show.status === "complete") return show;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const showDate = show.date ? new Date(show.date) : null;
  const daysUntil = showDate ? Math.ceil((showDate - today) / (1000 * 60 * 60 * 24)) : 999;
  let s = { ...show };
  if (s.status === "lead" && (+s.depositPaid || 0) > 0) s.status = "booked";
  if (s.status === "booked" && (s.assignedEmployees || []).length > 0) s.status = "preshow";
  if (s.status === "preshow" && daysUntil <= 7 && daysUntil >= 0) {
    s.status = "countdown";
    if (!s.checklist || s.checklist.length === 0) s.checklist = DEFAULT_CHECKLIST();
  }
  if (s.status === "countdown" && (!s.checklist || s.checklist.length === 0)) {
    s.checklist = DEFAULT_CHECKLIST();
  }
  return s;
}

// ─── Sample Data ───────────────────────────────────────────────────────────
const SAMPLE_SHOWS = [
  { id:1, name:"Metro Home & Garden Expo", date:"2026-05-20", startTime:"09:00", endTime:"17:00",
    category:"Home & Garden Show", status:"countdown", street:"1 Washington Blvd", city:"Detroit", state:"MI", zip:"48226",
    contactName:"Sarah Mitchell", contactEmail:"sarah@metrohomeexpo.com", contactPhone:"(313) 555-0142",
    boothSize:"10x10", expectedParticipation:2000, isIndoor:true, hasElectrical:true, needsTrailer:false,
    employeesNeeded:2, totalDue:1200, depositDue:600, depositDueDate:"2026-04-20",
    depositPaid:600, depositPaidDate:"2026-04-18", totalPaid:0, finalPaymentDueDate:"2026-05-13", totalPaidDate:"",
    assignedEmployees:[1,2], checklist:DEFAULT_CHECKLIST(), inventory:DEFAULT_INVENTORY(),
    communications:[], employeeReports:[], rating:null, ratingNotes:"", needToKnow:"", contactsCollected:"" },
  { id:2, name:"Macomb County Fair", date:"2026-06-12", startTime:"10:00", endTime:"18:00",
    category:"County Fair", status:"booked", street:"700 N Main St", city:"Armada", state:"MI", zip:"48005",
    contactName:"Tom Henderson", contactEmail:"tom@macomcofair.org", contactPhone:"(586) 555-0288",
    boothSize:"10x20", expectedParticipation:5000, isIndoor:false, hasElectrical:false, needsTrailer:false,
    employeesNeeded:3, totalDue:850, depositDue:425, depositDueDate:"2026-05-01",
    depositPaid:425, depositPaidDate:"2026-04-29", totalPaid:0, finalPaymentDueDate:"2026-06-05", totalPaidDate:"",
    assignedEmployees:[1], inventory:[], checklist:[], communications:[], employeeReports:[], rating:null, ratingNotes:"", needToKnow:"", contactsCollected:"" },
  { id:3, name:"Detroit Remodeling Show", date:"2026-07-08", startTime:"11:00", endTime:"19:00",
    category:"Trade Show", status:"lead", street:"1 Washington Blvd", city:"Detroit", state:"MI", zip:"48226",
    contactName:"Linda Garvey", contactEmail:"lgarvey@detroitremodel.com", contactPhone:"(248) 555-0377",
    boothSize:"20x20", expectedParticipation:3500, isIndoor:true, hasElectrical:true, needsTrailer:false,
    employeesNeeded:4, totalDue:2100, depositDue:1050, depositDueDate:"2026-06-01",
    depositPaid:0, depositPaidDate:"", totalPaid:0, finalPaymentDueDate:"2026-07-01", totalPaidDate:"",
    assignedEmployees:[], inventory:[], checklist:[], communications:[], employeeReports:[], rating:null, ratingNotes:"", needToKnow:"", contactsCollected:"" },
  { id:4, name:"Sterling Heights Home Expo", date:"2026-04-15", startTime:"09:00", endTime:"16:00",
    category:"Home Expo", status:"complete", street:"40700 Utica Rd", city:"Sterling Heights", state:"MI", zip:"48313",
    contactName:"Mike Torres", contactEmail:"mike@shhomeexpo.com", contactPhone:"(586) 555-0511",
    boothSize:"10x10", expectedParticipation:1200, isIndoor:true, hasElectrical:true, needsTrailer:true,
    employeesNeeded:2, totalDue:750, depositDue:375, depositDueDate:"2026-03-15",
    depositPaid:375, depositPaidDate:"2026-03-12", totalPaid:375, finalPaymentDueDate:"2026-04-08", totalPaidDate:"2026-04-07",
    contactsCollected:62, assignedEmployees:[2,3], rating:4,
    ratingNotes:"Strong show — great foot traffic. Request a booth near the south entrance next year.",
    needToKnow:"Load-in is at the SOUTH entrance on Utica Rd — NOT the main front doors. Parking is free in Lot C.",
    inventory:DEFAULT_INVENTORY().map(i => ({ ...i, packed:true })),
    checklist:DEFAULT_CHECKLIST().map(c => ({ ...c, checked:true })),
    communications:[],
    employeeReports:[
      { employeeId:2, employeeName:"Marcus Davis", leadsAcquired:38, appointmentsBooked:5,
        futureNotes:"Booth 14 near the entrance had great foot traffic. 10 AM–noon was the busiest window.", submittedAt:"2026-04-15T18:42:00.000Z" },
      { employeeId:3, employeeName:"Amy Chen", leadsAcquired:24, appointmentsBooked:3,
        futureNotes:"Parking filled up fast — recommend arriving 30 min early.", submittedAt:"2026-04-15T19:05:00.000Z" },
    ] },
  { id:5, name:"Oakland County Spring Festival", date:"2026-05-30", startTime:"10:00", endTime:"16:00",
    category:"Festival", status:"preshow", street:"2800 Watkins Lake Rd", city:"Pontiac", state:"MI", zip:"48328",
    contactName:"Diane Watson", contactEmail:"diane@oakfest.org", contactPhone:"(248) 555-0622",
    boothSize:"10x10", expectedParticipation:800, isIndoor:false, hasElectrical:false, needsTrailer:false,
    employeesNeeded:2, totalDue:500, depositDue:250, depositDueDate:"2026-05-10",
    depositPaid:250, depositPaidDate:"2026-05-08", totalPaid:0, finalPaymentDueDate:"2026-05-23", totalPaidDate:"",
    assignedEmployees:[3], inventory:[], checklist:[], communications:[], employeeReports:[], rating:null, ratingNotes:"", needToKnow:"", contactsCollected:"" },
];

const SAMPLE_EMPLOYEES = [
  { id:1, firstName:"Jessica", lastName:"Kowalski", email:"jessica@bathremodel.com", phone:"(586) 555-0101", canViewSchedule:true, canEditShows:false, isAdmin:false },
  { id:2, firstName:"Marcus",  lastName:"Davis",    email:"marcus@bathremodel.com",  phone:"(586) 555-0202", canViewSchedule:true, canEditShows:true,  isAdmin:false },
  { id:3, firstName:"Amy",     lastName:"Chen",     email:"amy@bathremodel.com",     phone:"(248) 555-0303", canViewSchedule:true, canEditShows:false, isAdmin:false },
];

// ─── Small reusable components ─────────────────────────────────────────────
function StatusBadge({ status, large }) {
  const s = STATUSES[status];
  if (!s) return null;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6,
      padding: large ? "6px 14px" : "4px 11px",
      borderRadius:20, background:s.bg, border:"1px solid " + s.border,
      color:s.text, fontWeight:700, fontSize: large ? 14 : 12, whiteSpace:"nowrap" }}>
      <span style={{ width: large ? 10 : 8, height: large ? 10 : 8, borderRadius:"50%", background:s.dot, display:"inline-block", flexShrink:0 }} />
      {s.label}
    </span>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", userSelect:"none" }}>
      <div onClick={() => onChange(!value)} style={{
        width:50, height:27, borderRadius:14, position:"relative",
        background: value ? "#1B3A5C" : "#D1D5DB", transition:"background 0.2s", cursor:"pointer", flexShrink:0 }}>
        <div style={{
          position:"absolute", top:3, left: value ? 26 : 3,
          width:21, height:21, borderRadius:"50%", background:"#fff",
          transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.25)" }} />
      </div>
      <span style={{ fontSize:15, color:"#374151", fontWeight:500 }}>{label}</span>
    </label>
  );
}

function SectionHead({ title }) {
  return (
    <div style={{ gridColumn:"1/-1", marginTop:8, paddingBottom:8, borderBottom:"2px solid #F0E8DF" }}>
      <h3 style={{ margin:0, fontSize:16, color:"#1B3A5C", fontFamily:"'Playfair Display',serif", fontWeight:700 }}>{title}</h3>
    </div>
  );
}

function StarRating({ value, onChange, size }) {
  size = size || 28;
  const [hover, setHover] = useState(null);
  const labels = { 1:"Poor", 2:"Below Average", 3:"Average", 4:"Good", 5:"Excellent" };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      {[1,2,3,4,5].map(star => (
        <span key={star}
          onClick={() => onChange && onChange(star === value ? null : star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(null)}
          style={{ fontSize:size, cursor:onChange?"pointer":"default", lineHeight:1,
            color:(hover != null ? hover : value) >= star ? "#F59E0B" : "#E5E7EB", transition:"color 0.1s" }}>★</span>
      ))}
      {(hover || value) && <span style={{ fontSize:13, color:"#6B7280", fontWeight:600, marginLeft:6 }}>{labels[hover || value]}</span>}
    </div>
  );
}

function BottomNav({ view, setView, onAddShow }) {
  const items = [
    { id:"dashboard", icon:"🏠", label:"Home" },
    { id:"calendar",  icon:"📅", label:"Calendar" },
    { id:"shows",     icon:"🎪", label:"Shows" },
    { id:"pipeline",  icon:"📋", label:"Pipeline" },
    { id:"portal",    icon:"👤", label:"My Shows" },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#1B3A5C",
      borderTop:"2px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"stretch",
      zIndex:500, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
      {items.map(item => {
        const active = view === item.id;
        return (
          <button key={item.id} onClick={() => setView(item.id)} style={{
            flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            padding:"8px 4px", border:"none", background:"transparent", cursor:"pointer",
            borderTop: active ? "3px solid #C4944A" : "3px solid transparent" }}>
            <span style={{ fontSize:20, lineHeight:1, marginBottom:2 }}>{item.icon}</span>
            <span style={{ fontSize:10, fontWeight: active?700:500, color: active?"#C4944A":"rgba(255,255,255,0.6)", fontFamily:"'Nunito',sans-serif" }}>{item.label}</span>
          </button>
        );
      })}
      <button onClick={onAddShow} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        padding:"8px 4px", border:"none", background:"transparent", cursor:"pointer", borderTop:"3px solid transparent" }}>
        <span style={{ fontSize:22, lineHeight:1, marginBottom:2, color:"#C4944A" }}>+</span>
        <span style={{ fontSize:10, fontWeight:500, color:"rgba(255,255,255,0.6)", fontFamily:"'Nunito',sans-serif" }}>Add Show</span>
      </button>
    </div>
  );
}

// ─── Login Screen ──────────────────────────────────────────────────────────
function LoginScreen() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [magicSent, setMagicSent] = useState(false);

  async function handleSignIn(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    if (!email) { setError("Please enter your email address first."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithOtp({ email });
    if (err) setError(err.message);
    else setMagicSent(true);
    setLoading(false);
  }

  const inputStyle = { width:"100%", padding:"14px 16px", borderRadius:10, border:"2px solid #EDE6DC",
    fontSize:16, outline:"none", boxSizing:"border-box", color:"#1F2937", fontFamily:"'Nunito',sans-serif" };

  return (
    <div style={{ minHeight:"100vh", background:"#F7F2EB", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Nunito:wght@400;500;600;700&display=swap');"}</style>
      <div style={{ background:"#fff", borderRadius:24, padding:"44px 40px", width:"100%", maxWidth:440, boxShadow:"0 8px 40px rgba(27,58,92,0.12)" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:12 }}>⭐</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", color:"#1B3A5C", fontSize:30, margin:"0 0 8px" }}>Show Manager</h1>
          <p style={{ color:"#6B7280", fontSize:16, margin:0 }}>Five Star Bath Solutions</p>
        </div>

        {magicSent ? (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
            <h2 style={{ color:"#1B3A5C", fontSize:22, marginBottom:10, fontFamily:"'Playfair Display',serif" }}>Check your email!</h2>
            <p style={{ color:"#6B7280", fontSize:15, lineHeight:1.6 }}>
              We sent a sign-in link to <strong>{email}</strong>.<br />Click the link in the email to log in.
            </p>
            <button onClick={() => setMagicSent(false)}
              style={{ marginTop:24, background:"none", border:"none", color:"#1B3A5C", fontSize:14, cursor:"pointer", textDecoration:"underline" }}>
              Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignIn}>
            {error && (
              <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"12px 16px", marginBottom:20, color:"#DC2626", fontSize:14, fontWeight:600 }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:"block", fontSize:15, fontWeight:700, color:"#374151", marginBottom:7 }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@fivestar.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:"block", fontSize:15, fontWeight:700, color:"#374151", marginBottom:7 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", padding:"16px", borderRadius:12, border:"none", background:"#1B3A5C", color:"#fff", fontSize:17, fontWeight:700, cursor:loading?"wait":"pointer", marginBottom:14, opacity:loading?0.7:1, fontFamily:"'Nunito',sans-serif" }}>
              {loading ? "Signing In…" : "Sign In"}
            </button>
            <button type="button" onClick={handleMagicLink} disabled={loading}
              style={{ width:"100%", padding:"14px", borderRadius:12, border:"2px solid #1B3A5C", background:"transparent", color:"#1B3A5C", fontSize:15, fontWeight:700, cursor:loading?"wait":"pointer", opacity:loading?0.7:1, fontFamily:"'Nunito',sans-serif" }}>
              Send Magic Link Instead
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Employees View ────────────────────────────────────────────────────────
function EmployeesView({ employees, shows, onUpdateEmployee, onAddEmployee, onDeleteEmployee, notifTiming, onChangeNotifTiming }) {
  const [showForm, setShowForm] = useState(false);
  const blank = { firstName:"", lastName:"", email:"", phone:"", canViewSchedule:true, canEditShows:false, isAdmin:false };
  const [newEmp, setNewEmp] = useState({ ...blank });

  function handleAdd() {
    if (!newEmp.firstName || !newEmp.lastName || !newEmp.email) { alert("Please fill in First Name, Last Name, and Email."); return; }
    onAddEmployee({ ...newEmp, id:genId() });
    setNewEmp({ ...blank }); setShowForm(false);
  }
  const inp = (label, key, type) => (
    <div>
      <label style={{ fontSize:15, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>{label}</label>
      <input type={type || "text"} value={newEmp[key]} onChange={e => setNewEmp(p => ({ ...p, [key]:e.target.value }))}
        style={{ width:"100%", padding:"12px 14px", borderRadius:9, border:"2px solid #EDE6DC", fontSize:15, boxSizing:"border-box", outline:"none" }} />
    </div>
  );
  return (
    <div style={{ padding:"36px 44px" }}>
      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #EDE6DC", padding:"20px 24px", marginBottom:28 }}>
        <h3 style={{ margin:"0 0 6px", fontSize:17, color:"#1B3A5C", fontFamily:"'Playfair Display',serif" }}>🔔 Employee Notification Timing</h3>
        <p style={{ margin:"0 0 16px", fontSize:14, color:"#6B7280" }}>When should employees be notified about their assigned shows?</p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {[
            { value:"assigned",  label:"As Soon as Assigned",           desc:"Employees notified immediately when added to a show" },
            { value:"countdown", label:"Final Countdown (7 Days Prior)", desc:"Notification fires when the show enters Final Countdown" },
          ].map(opt => {
            const active = notifTiming === opt.value;
            return (
              <div key={opt.value} onClick={() => onChangeNotifTiming(opt.value)} style={{
                flex:"1 1 240px", padding:"14px 18px", borderRadius:12, border:"2px solid",
                borderColor: active ? "#1B3A5C" : "#EDE6DC", background: active ? "#EBF1F7" : "#F9F7F4", cursor:"pointer" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid " + (active ? "#1B3A5C" : "#D1C8BB"),
                    background: active ? "#1B3A5C" : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {active && <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff" }} />}
                  </div>
                  <span style={{ fontWeight:700, fontSize:15, color: active ? "#1B3A5C" : "#374151" }}>{opt.label}</span>
                </div>
                <p style={{ margin:0, fontSize:13, color:"#6B7280", paddingLeft:28 }}>{opt.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:34, fontFamily:"'Playfair Display',serif", color:"#1B3A5C", margin:0 }}>Team Members</h1>
          <p style={{ color:"#6B7280", marginTop:6, fontSize:17 }}>{employees.length} employee{employees.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background:"#1B3A5C", color:"#fff", border:"none", borderRadius:12, padding:"14px 26px", fontSize:16, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:22, lineHeight:1 }}>+</span> Add Employee
        </button>
      </div>
      {showForm && (
        <div style={{ background:"#fff", borderRadius:18, border:"2px solid #1B3A5C", padding:28, marginBottom:28 }}>
          <h3 style={{ margin:"0 0 20px", color:"#1B3A5C", fontFamily:"'Playfair Display',serif", fontSize:22 }}>New Employee</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            {inp("First Name","firstName")} {inp("Last Name","lastName")}
            {inp("Email Address","email","email")} {inp("Phone Number","phone","tel")}
          </div>
          <div style={{ display:"flex", gap:28, marginBottom:22, flexWrap:"wrap" }}>
            <Toggle value={newEmp.canViewSchedule} onChange={v => setNewEmp(p => ({ ...p, canViewSchedule:v }))} label="Can View Schedule" />
            <Toggle value={newEmp.canEditShows}    onChange={v => setNewEmp(p => ({ ...p, canEditShows:v }))}    label="Can Edit Shows" />
            <Toggle value={newEmp.isAdmin}         onChange={v => setNewEmp(p => ({ ...p, isAdmin:v }))}         label="Administrator" />
          </div>
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={handleAdd} style={{ background:"#1B3A5C", color:"#fff", border:"none", borderRadius:10, padding:"13px 28px", fontSize:15, fontWeight:700, cursor:"pointer" }}>Save Employee</button>
            <button onClick={() => setShowForm(false)} style={{ background:"#F3F4F6", color:"#6B7280", border:"none", borderRadius:10, padding:"13px 24px", fontSize:15, cursor:"pointer", fontWeight:600 }}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))", gap:22 }}>
        {employees.map(emp => {
          const assigned = shows.filter(s => (s.assignedEmployees || []).includes(emp.id));
          return (
            <div key={emp.id} style={{ background:"#fff", borderRadius:18, border:"1px solid #EDE6DC", overflow:"hidden" }}>
              <div style={{ padding:"20px 24px", borderBottom:"1px solid #F5EDE3", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:52, height:52, borderRadius:"50%", background:"#1B3A5C", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:18, flexShrink:0 }}>
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:18, color:"#1F2937" }}>
                      {emp.firstName} {emp.lastName}
                      {emp.isAdmin && <span style={{ marginLeft:8, fontSize:13, background:"#C4944A", color:"#fff", borderRadius:10, padding:"2px 9px", verticalAlign:"middle" }}>Admin</span>}
                    </div>
                    <div style={{ color:"#6B7280", fontSize:14, marginTop:2 }}>{emp.email}</div>
                    <div style={{ color:"#6B7280", fontSize:14 }}>{emp.phone}</div>
                  </div>
                </div>
                <button onClick={() => { if (window.confirm("Remove " + emp.firstName + " " + emp.lastName + "?")) onDeleteEmployee(emp.id); }}
                  style={{ background:"none", border:"none", color:"#D1D5DB", fontSize:24, cursor:"pointer", lineHeight:1, padding:4 }}
                  onMouseEnter={e => e.currentTarget.style.color="#EF4444"}
                  onMouseLeave={e => e.currentTarget.style.color="#D1D5DB"}>×</button>
              </div>
              <div style={{ padding:"18px 24px" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>App Permissions</div>
                <div style={{ display:"flex", flexDirection:"column", gap:11, marginBottom:18 }}>
                  <Toggle value={emp.canViewSchedule} onChange={v => onUpdateEmployee({ ...emp, canViewSchedule:v })} label="Can View Their Schedule" />
                  <Toggle value={emp.canEditShows}    onChange={v => onUpdateEmployee({ ...emp, canEditShows:v })}    label="Can Edit Shows" />
                  <Toggle value={emp.isAdmin}         onChange={v => onUpdateEmployee({ ...emp, isAdmin:v })}         label="Administrator Access" />
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Assigned Shows ({assigned.length})</div>
                {assigned.length === 0
                  ? <span style={{ fontSize:14, color:"#9CA3AF" }}>No shows assigned yet</span>
                  : assigned.map(s => (
                    <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                      <div style={{ width:9, height:9, borderRadius:"50%", background:STATUSES[s.status].dot, flexShrink:0 }} />
                      <span style={{ fontSize:14, color:"#4B5563" }}>{s.name} · {fmtDateRange(s.date, s.endDate)}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Show Form Modal ────────────────────────────────────────────────────────
const EMPTY_SHOW = { name:"", date:"", endDate:"", startTime:"", endTime:"", category:"", status:"lead",
  street:"", city:"", state:"", zip:"", contactName:"", contactEmail:"", contactPhone:"",
  boothSize:"", expectedParticipation:"", isIndoor:true, hasElectrical:false, needsTrailer:false,
  employeesNeeded:"", contactsCollected:"", depositDue:"", depositDueDate:"",
  depositPaid:"", depositPaidDate:"", totalDue:"", finalPaymentDueDate:"",
  totalPaid:"", totalPaidDate:"", assignedEmployees:[], employeeReports:[], needToKnow:"",
  inventory:[], checklist:[], communications:[], documents:[], shifts:[], rating:null, ratingNotes:"" };

function CalendarPicker({ value, onChange, label, required }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const parsed = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();
  const [viewYear, setViewYear]  = useState(parsed ? parsed.getFullYear()  : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth()     : today.getMonth());
  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const daysInMonth   = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday  = new Date(viewYear, viewMonth, 1).getDay();
  const selectDay = day => {
    const d  = new Date(viewYear, viewMonth, day);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    onChange(`${d.getFullYear()}-${mm}-${dd}`);
    setOpen(false);
  };
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0);  setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
  const display = parsed ? parsed.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : "";
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <label style={{ fontSize:15, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>
        {label}{required && <span style={{ color:"#DC2626" }}> *</span>}
      </label>
      <div onClick={() => setOpen(o => !o)} style={{
        width:"100%", padding:"12px 14px", borderRadius:9, border:"2px solid #EDE6DC",
        fontSize:15, color: display ? "#1F2937" : "#9CA3AF", background:"#fff",
        cursor:"pointer", boxSizing:"border-box", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span>{display || "Select a date…"}</span>
        <span style={{ fontSize:18 }}>📅</span>
      </div>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:3000,
          background:"#fff", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
          padding:"16px", minWidth:290, border:"1px solid #EDE6DC" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <button onClick={prevMonth} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#1B3A5C", fontWeight:700, padding:"4px 10px" }}>‹</button>
            <span style={{ fontWeight:700, color:"#1B3A5C", fontSize:15 }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#1B3A5C", fontWeight:700, padding:"4px 10px" }}>›</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, textAlign:"center" }}>
            {DAYS.map(d => <div key={d} style={{ fontSize:13, fontWeight:700, color:"#9CA3AF", padding:"4px 0" }}>{d}</div>)}
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const sel = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day;
              const tod = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
              return (
                <button key={day} onClick={() => selectDay(day)} style={{
                  padding:"7px 2px", borderRadius:7, border:"none", cursor:"pointer",
                  background: sel ? "#1B3A5C" : tod ? "#F0EBE3" : "transparent",
                  color: sel ? "#fff" : "#1F2937",
                  fontWeight: sel || tod ? 700 : 400, fontSize:14 }}>{day}</button>
              );
            })}
          </div>
          {value && (
            <div style={{ borderTop:"1px solid #EDE6DC", marginTop:10, paddingTop:8, textAlign:"right" }}>
              <button onClick={() => { onChange(""); setOpen(false); }}
                style={{ background:"none", border:"none", color:"#9CA3AF", fontSize:13, cursor:"pointer" }}>Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddressAutocomplete({ value, onChange, onPlaceSelected }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  useEffect(() => {
    if (!window.google || !inputRef.current) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
    });
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      if (!place.address_components) return;
      let street = "", city = "", state = "", zip = "";
      const get = type => (place.address_components.find(c => c.types.includes(type)) || {}).long_name || "";
      const getShort = type => (place.address_components.find(c => c.types.includes(type)) || {}).short_name || "";
      const num   = get("street_number");
      const road  = get("route");
      street = num && road ? `${num} ${road}` : road || num;
      city   = get("locality") || get("sublocality") || get("neighborhood");
      state  = getShort("administrative_area_level_1");
      zip    = get("postal_code");
      onPlaceSelected({ street, city, state, zip });
    });
    return () => { if (autocompleteRef.current) window.google.maps.event.clearInstanceListeners(autocompleteRef.current); };
  }, []);
  return (
    <div>
      <label style={{ fontSize:15, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>Street Address</label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Start typing an address…"
        style={{ width:"100%", padding:"12px 14px", borderRadius:9, border:"2px solid #EDE6DC", fontSize:15, color:"#1F2937", background:"#fff", outline:"none", boxSizing:"border-box" }}
      />
    </div>
  );
}

function ShowFormModal({ show, employees, onSave, onClose }) {
  const [form, setForm] = useState(show ? { ...show } : { ...EMPTY_SHOW });
  function set(k, v) { setForm(p => ({ ...p, [k]:v })); }
  function toggleEmp(id) {
    setForm(p => ({ ...p, assignedEmployees: p.assignedEmployees.includes(id)
      ? p.assignedEmployees.filter(e => e !== id)
      : [...p.assignedEmployees, id] }));
  }
  function save() {
    if (!form.name || !form.date) { alert("Show Name and Date are required."); return; }
    onSave({ ...form, id: form.id || genId() });
  }
  const inp = (label, key, type, req) => (
    <div>
      <label style={{ fontSize:15, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>
        {label}{req && <span style={{ color:"#DC2626" }}> *</span>}
      </label>
      <input type={type || "text"} value={form[key] || ""} onChange={e => set(key, e.target.value)}
        style={{ width:"100%", padding:"12px 14px", borderRadius:9, border:"2px solid #EDE6DC", fontSize:15, color:"#1F2937", background:"#fff", outline:"none", boxSizing:"border-box" }} />
    </div>
  );
  const money = (label, key) => (
    <div>
      <label style={{ fontSize:15, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>{label}</label>
      <div style={{ position:"relative" }}>
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#9CA3AF", fontSize:16, fontWeight:700 }}>$</span>
        <input type="number" min="0" value={form[key] || ""} onChange={e => set(key, e.target.value)}
          style={{ width:"100%", padding:"12px 14px 12px 26px", borderRadius:9, border:"2px solid #EDE6DC", fontSize:15, color:"#1F2937", background:"#fff", outline:"none", boxSizing:"border-box" }} />
      </div>
    </div>
  );
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#F7F2EB", borderRadius:"22px 22px 0 0", width:"100%", maxWidth:800, maxHeight:"95vh", display:"flex", flexDirection:"column", boxShadow:"0 -8px 40px rgba(0,0,0,0.2)", overflow:"hidden" }}>
        <div style={{ background:"#1B3A5C", padding:"24px 32px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ margin:0, color:"#fff", fontFamily:"'Playfair Display',serif", fontSize:26 }}>{show ? "Edit Show" : "Add New Show"}</h2>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", fontSize:24, cursor:"pointer", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:"20px 24px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, overflowY:"auto", flex:1 }}>
          <SectionHead title="Show Information" />
          {inp("Show Name","name","text",true)}
          <CalendarPicker value={form.date} onChange={v => set("date",v)} label="Start Date" required />
          <CalendarPicker value={form.endDate} onChange={v => set("endDate",v)} label="End Date (optional)" />
          <div>
            <label style={{ fontSize:15, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>Event Category</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              style={{ width:"100%", padding:"12px 14px", borderRadius:9, border:"2px solid #EDE6DC", fontSize:15, color:"#1F2937", background:"#fff", outline:"none" }}>
              <option value="">Select a category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:15, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)}
              style={{ width:"100%", padding:"12px 14px", borderRadius:9, border:"2px solid #EDE6DC", fontSize:15, color:"#1F2937", background:"#fff", outline:"none" }}>
              {STATUS_ORDER.map(k => <option key={k} value={k}>{STATUSES[k].label}</option>)}
            </select>
          </div>
          {inp("Start Time","startTime","time")}
          {inp("End Time","endTime","time")}
          <div style={{ gridColumn:"1/-1" }}>
            <AddressAutocomplete
              value={form.street || ""}
              onChange={v => set("street", v)}
              onPlaceSelected={({ street, city, state, zip }) =>
                setForm(p => ({ ...p, street, city, state, zip }))
              }
            />
          </div>
          {inp("City","city")}
          <div>
            <label style={{ fontSize:15, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>State</label>
            <select value={form.state || ""} onChange={e => set("state", e.target.value)}
              style={{ width:"100%", padding:"12px 14px", borderRadius:9, border:"2px solid #EDE6DC", fontSize:15, color:"#1F2937", background:"#fff", outline:"none" }}>
              <option value="">Select state…</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {inp("Zip Code","zip")}
          <SectionHead title="Contact Information" />
          {inp("Contact Name","contactName")}
          {inp("Contact Email","contactEmail","email")}
          {inp("Contact Phone","contactPhone","tel")}
          <SectionHead title="Booth Details" />
          {inp("Booth Size (e.g. 10x10)","boothSize")}
          {inp("Expected Attendance","expectedParticipation","number")}
          <div style={{ gridColumn:"1/-1", display:"flex", gap:30, flexWrap:"wrap", alignItems:"center" }}>
            <div>
              <label style={{ fontSize:15, fontWeight:700, color:"#374151", display:"block", marginBottom:8 }}>Location Type</label>
              <div style={{ display:"flex", gap:10 }}>
                {["Indoor","Outdoor"].map(opt => (
                  <button key={opt} onClick={() => set("isIndoor", opt === "Indoor")} style={{
                    padding:"10px 20px", borderRadius:10, border:"2px solid",
                    borderColor: (opt === "Indoor" ? form.isIndoor : !form.isIndoor) ? "#1B3A5C" : "#EDE6DC",
                    background: (opt === "Indoor" ? form.isIndoor : !form.isIndoor) ? "#1B3A5C" : "#fff",
                    color: (opt === "Indoor" ? form.isIndoor : !form.isIndoor) ? "#fff" : "#6B7280",
                    fontSize:15, fontWeight:700, cursor:"pointer" }}>{opt === "Indoor" ? "🏛 Indoor" : "☀️ Outdoor"}</button>
                ))}
              </div>
            </div>
            <div style={{ paddingTop:6, display:"flex", flexDirection:"column", gap:12 }}>
              <Toggle value={form.hasElectrical} onChange={v => set("hasElectrical", v)} label="Electrical Available" />
              <Toggle value={form.needsTrailer}  onChange={v => set("needsTrailer", v)}  label="Trailer Needed" />
            </div>
          </div>
          <SectionHead title="Staffing" />
          {inp("Number of Employees Needed","employeesNeeded","number")}
          {inp("Contacts Collected (after show)","contactsCollected","number")}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={{ fontSize:15, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>📌 Need to Know</label>
            <textarea value={form.needToKnow || ""} onChange={e => set("needToKnow", e.target.value)} rows={4}
              placeholder="Day-of info employees need to know — parking, load-in, dress code, on-site contact, etc."
              style={{ width:"100%", padding:"13px 14px", borderRadius:9, border:"2px solid #EDE6DC", fontSize:15, color:"#1F2937", background:"#fff", outline:"none", boxSizing:"border-box", resize:"vertical", fontFamily:"'Nunito',sans-serif", lineHeight:1.55 }} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={{ fontSize:15, fontWeight:700, color:"#374151", display:"block", marginBottom:10 }}>Assign Employees</label>
            {employees.length === 0
              ? <p style={{ color:"#9CA3AF", margin:0, fontSize:14 }}>No employees added yet. Go to the Employees tab first.</p>
              : <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                  {employees.map(emp => {
                    const on = (form.assignedEmployees || []).includes(emp.id);
                    return (
                      <button key={emp.id} onClick={() => toggleEmp(emp.id)} style={{
                        padding:"10px 18px", borderRadius:20, border:"2px solid",
                        borderColor: on ? "#1B3A5C" : "#EDE6DC", background: on ? "#1B3A5C" : "#fff",
                        color: on ? "#fff" : "#4B5563", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                        {on ? "✓ " : ""}{emp.firstName} {emp.lastName}
                      </button>
                    );
                  })}
                </div>
            }
          </div>
          <SectionHead title="Financials" />
          {money("Total Show Cost","totalDue")}
          <CalendarPicker value={form.finalPaymentDueDate} onChange={v => set("finalPaymentDueDate",v)} label="Final Payment Due Date" />
          {money("Deposit Due","depositDue")}
          <CalendarPicker value={form.depositDueDate} onChange={v => set("depositDueDate",v)} label="Deposit Due Date" />
          {money("Deposit Paid","depositPaid")}
          <CalendarPicker value={form.depositPaidDate} onChange={v => set("depositPaidDate",v)} label="Date Deposit Paid" />
          {money("Balance / Final Payment","totalPaid")}
          <CalendarPicker value={form.totalPaidDate} onChange={v => set("totalPaidDate",v)} label="Date Balance Paid" />
        </div>
        <div style={{ padding:"20px 32px", borderTop:"1px solid #EDE6DC", display:"flex", gap:12, justifyContent:"flex-end", background:"#fff" }}>
          <button onClick={onClose} style={{ padding:"13px 24px", borderRadius:10, border:"2px solid #EDE6DC", background:"#fff", color:"#6B7280", fontSize:15, cursor:"pointer", fontWeight:600 }}>Cancel</button>
          <button onClick={save} style={{ padding:"13px 32px", borderRadius:10, border:"none", background:"#1B3A5C", color:"#fff", fontSize:15, cursor:"pointer", fontWeight:700 }}>{show ? "Save Changes" : "Add Show"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Section ─────────────────────────────────────────────────────
function InventorySection({ show, onUpdateShow }) {
  const items = show.inventory || [];
  const packedCount = items.filter(i => i.packed).length;
  const [addingItem, setAddingItem] = useState(false);
  const [newLabel,   setNewLabel]   = useState("");
  const [newQty,     setNewQty]     = useState("1");
  function togglePacked(id) { onUpdateShow({ ...show, inventory:items.map(i => i.id===id ? { ...i, packed:!i.packed } : i) }); }
  function removeItem(id)   { onUpdateShow({ ...show, inventory:items.filter(i => i.id !== id) }); }
  function initInventory()  { onUpdateShow({ ...show, inventory:DEFAULT_INVENTORY() }); }
  function addItem() {
    if (!newLabel.trim()) return;
    onUpdateShow({ ...show, inventory:[...items, { id:genId(), label:newLabel.trim(), qty:+newQty||1, packed:false }] });
    setNewLabel(""); setNewQty("1"); setAddingItem(false);
  }
  const pct = items.length ? Math.round((packedCount / items.length) * 100) : 0;
  return (
    <div style={{ marginTop:20, paddingTop:20, borderTop:"2px solid #F0E8DF" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>
          📦 Packing List{items.length > 0 ? " (" + packedCount + "/" + items.length + " packed)" : ""}
        </p>
        <div style={{ display:"flex", gap:8 }}>
          {items.length === 0 && (
            <button onClick={initInventory} style={{ fontSize:12, fontWeight:700, color:"#1B3A5C", background:"#EBF1F7", border:"1px solid #93C5FD", borderRadius:7, padding:"4px 10px", cursor:"pointer" }}>Load Defaults</button>
          )}
          <button onClick={() => setAddingItem(v => !v)} style={{ fontSize:12, fontWeight:700, color:"#fff", background:"#1B3A5C", border:"none", borderRadius:7, padding:"5px 11px", cursor:"pointer" }}>+ Add Item</button>
        </div>
      </div>
      {items.length > 0 && (
        <div style={{ height:8, background:"#F3EDE6", borderRadius:4, marginBottom:12, overflow:"hidden" }}>
          <div style={{ height:"100%", width:pct + "%", background:packedCount===items.length ? "#10B981" : "#1B3A5C", borderRadius:4, transition:"width 0.3s" }} />
        </div>
      )}
      {addingItem && (
        <div style={{ display:"flex", gap:8, marginBottom:10, alignItems:"center" }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Item name…"
            onKeyDown={e => e.key === "Enter" && addItem()}
            style={{ flex:1, padding:"9px 12px", borderRadius:8, border:"2px solid #1B3A5C", fontSize:14, outline:"none" }} />
          <input type="number" value={newQty} onChange={e => setNewQty(e.target.value)} min="1"
            style={{ width:60, padding:"9px 8px", borderRadius:8, border:"2px solid #EDE6DC", fontSize:14, outline:"none", textAlign:"center" }} />
          <button onClick={addItem} style={{ padding:"9px 14px", borderRadius:8, background:"#1B3A5C", color:"#fff", border:"none", fontWeight:700, fontSize:14, cursor:"pointer" }}>Add</button>
          <button onClick={() => setAddingItem(false)} style={{ padding:"9px 10px", borderRadius:8, background:"#F3F4F6", color:"#6B7280", border:"none", cursor:"pointer" }}>✕</button>
        </div>
      )}
      {items.length === 0 && !addingItem
        ? <p style={{ color:"#9CA3AF", fontSize:14, margin:0 }}>No items yet — click "Load Defaults" or add custom items.</p>
        : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            {items.map(item => (
              <div key={item.id} onClick={() => togglePacked(item.id)}
                style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px", borderRadius:9, cursor:"pointer",
                  background:item.packed ? "#ECFDF5" : "#fff", border:"1px solid " + (item.packed ? "#6EE7B7" : "#EDE6DC"), transition:"all 0.15s" }}>
                <div style={{ width:20, height:20, borderRadius:5, border:"2px solid " + (item.packed ? "#10B981" : "#D1C8BB"),
                  background:item.packed ? "#10B981" : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {item.packed && <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>}
                </div>
                <span style={{ flex:1, fontSize:13, color:item.packed ? "#9CA3AF" : "#1F2937", textDecoration:item.packed ? "line-through" : "none" }}>
                  {item.label}{item.qty > 1 && <span style={{ color:"#9CA3AF", fontWeight:700 }}> ×{item.qty}</span>}
                </span>
                <button onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                  style={{ background:"none", border:"none", color:"#E5E7EB", fontSize:15, cursor:"pointer", padding:2, lineHeight:1 }}
                  onMouseEnter={e => e.currentTarget.style.color="#EF4444"}
                  onMouseLeave={e => e.currentTarget.style.color="#E5E7EB"}>×</button>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ─── Show Detail Modal ─────────────────────────────────────────────────────
const COMM_TYPES  = [{ value:"call",label:"📞  Phone Call"},{value:"text",label:"💬  Text Message"},{value:"email",label:"📧  Email"},{value:"other",label:"📝  Other"}];
const COMM_ICONS  = { call:"📞", text:"💬", email:"📧", other:"📝" };
const COMM_COLORS = {
  call:  { bg:"#EFF6FF", border:"#93C5FD", text:"#1E40AF" },
  text:  { bg:"#ECFDF5", border:"#6EE7B7", text:"#065F46" },
  email: { bg:"#FFF7ED", border:"#FDBA74", text:"#9A3412" },
  other: { bg:"#F7F2EB", border:"#D1C8BB", text:"#4B5563" },
};

function ShowDetailModal({ show, employees, onEdit, onClose, onUpdateShow, onDuplicate, userId }) {
  const assigned = employees.filter(e => (show.assignedEmployees || []).includes(e.id));
  const totalPaidCalc = (+show.depositPaid||0) + (+show.totalPaid||0);
  const balance = (+show.totalDue||0) - totalPaidCalc;
  const comms = show.communications || [];
  const [addingComm, setAddingComm] = useState(false);
  const [commType,   setCommType]   = useState("call");
  const [commNote,   setCommNote]   = useState("");

  function saveComm() {
    if (!commNote.trim()) { alert("Please add a note about what was covered."); return; }
    const entry = { id:genId(), datetime:new Date().toISOString(), type:commType, notes:commNote.trim() };
    onUpdateShow({ ...show, communications:[entry, ...comms] });
    setCommNote(""); setCommType("call"); setAddingComm(false);
  }
  function deleteComm(id) {
    if (!window.confirm("Remove this communication entry?")) return;
    onUpdateShow({ ...show, communications:comms.filter(c => c.id !== id) });
  }

  const Row = ({ label, value, accent }) => (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"11px 0", borderBottom:"1px solid #F5EDE3" }}>
      <span style={{ fontSize:15, color:"#6B7280", fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:15, color:accent||"#1F2937", fontWeight:700, textAlign:"right", maxWidth:"60%" }}>{value || "—"}</span>
    </div>
  );
  const FinRow = ({ label, amount, date, accent }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:"1px solid #F5EDE3" }}>
      <span style={{ fontSize:15, color:"#6B7280", fontWeight:500 }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {date && <span style={{ fontSize:13, fontWeight:600, color:"#6B7280", background:"#F3F4F6", borderRadius:6, padding:"3px 8px", whiteSpace:"nowrap" }}>📅 {fmtDate(date)}</span>}
        <span style={{ fontSize:15, color:accent||"#1F2937", fontWeight:700 }}>{amount || "—"}</span>
      </div>
    </div>
  );

  const today = new Date(); today.setHours(0,0,0,0);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:"22px 22px 0 0", width:"100%", maxWidth:660, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 -8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ background:"#1B3A5C", padding:"24px 28px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h2 style={{ margin:0, color:"#fff", fontFamily:"'Playfair Display',serif", fontSize:26, lineHeight:1.2 }}>{show.name}</h2>
            <div style={{ marginTop:10 }}><StatusBadge status={show.status} large /></div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", fontSize:22, cursor:"pointer", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>×</button>
        </div>
        <div style={{ padding:28 }}>
          <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>Show Details</p>
          <Row label="Date" value={fmtDateRange(show.date, show.endDate)} />
          <Row label="Time" value={show.startTime && show.endTime ? show.startTime + " – " + show.endTime : null} />
          <Row label="Category" value={show.category} />
          {(show.street || show.city) && (() => {
            const full = [show.street, show.city, show.state, show.zip].filter(Boolean).join(", ");
            const mapsUrl = "https://maps.google.com/?q=" + encodeURIComponent(full);
            return (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"11px 0", borderBottom:"1px solid #F5EDE3" }}>
                <span style={{ fontSize:15, color:"#6B7280", fontWeight:500 }}>Address</span>
                <div style={{ textAlign:"right", maxWidth:"65%" }}>
                  <div style={{ fontSize:15, color:"#1F2937", fontWeight:700, lineHeight:1.4 }}>
                    {show.street && <div>{show.street}</div>}
                    <div>{[show.city, show.state, show.zip].filter(Boolean).join(", ")}</div>
                  </div>
                  <a href={mapsUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:6, fontSize:13, color:"#2563EB", fontWeight:700, textDecoration:"none", background:"#EFF6FF", border:"1px solid #93C5FD", borderRadius:7, padding:"4px 10px" }}>
                    📍 Get Directions
                  </a>
                </div>
              </div>
            );
          })()}
          <Row label="Booth Size" value={show.boothSize} />
          <Row label="Expected Attendance" value={show.expectedParticipation ? Number(show.expectedParticipation).toLocaleString() : null} />
          <Row label="Location" value={show.isIndoor ? "Indoor" : "Outdoor"} />
          <Row label="Electrical" value={show.hasElectrical ? "Yes" : "No"} />
          <Row label="Trailer" value={show.needsTrailer ? "Yes" : "No"} />

          <p style={{ margin:"20px 0 4px", fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>Contact</p>
          <Row label="Name" value={show.contactName} />
          <Row label="Email" value={show.contactEmail} />
          <Row label="Phone" value={show.contactPhone} />

          <p style={{ margin:"20px 0 4px", fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>Financials</p>
          <FinRow label="Total Show Cost"       amount={fmtMoney(show.totalDue)}   date={show.finalPaymentDueDate} />
          <FinRow label="Deposit Due"           amount={fmtMoney(show.depositDue)} date={show.depositDueDate} />
          <FinRow label="Deposit Paid"          amount={fmtMoney(show.depositPaid)} date={show.depositPaidDate} accent="#059669" />
          <FinRow label="Balance / Final"       amount={fmtMoney(show.totalPaid)}  date={show.totalPaidDate} accent={(+show.totalPaid||0)>0?"#059669":undefined} />
          <div style={{ borderTop:"2px dashed #EDE6DC", margin:"6px 0 2px" }} />
          <FinRow label="Total Paid"            amount={fmtMoney(totalPaidCalc)} accent="#059669" />
          <FinRow label="Remaining Balance"     amount={fmtMoney(balance)} accent={balance > 0 ? "#DC2626" : "#059669"} />

          <InventorySection show={show} onUpdateShow={onUpdateShow} />

          {(+show.contactsCollected || 0) > 0 && <>
            <p style={{ margin:"20px 0 4px", fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>Show Results</p>
            <Row label="Contacts Collected" value={(+show.contactsCollected).toLocaleString()} accent="#1B3A5C" />
          </>}

          <p style={{ margin:"20px 0 12px", fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Staff Assigned ({assigned.length} of {show.employeesNeeded || 0} needed)
          </p>
          {assigned.length === 0
            ? <p style={{ color:"#9CA3AF", margin:0 }}>No employees assigned yet.</p>
            : assigned.map(e => (
              <div key={e.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:"#1B3A5C", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14, flexShrink:0 }}>{e.firstName[0]}{e.lastName[0]}</div>
                <div>
                  <div style={{ fontWeight:700, color:"#1F2937", fontSize:15 }}>{e.firstName} {e.lastName}</div>
                  <div style={{ color:"#6B7280", fontSize:13 }}>{e.phone} · {e.email}</div>
                </div>
              </div>
            ))
          }

          {show.needToKnow && (
            <div style={{ marginTop:20, paddingTop:20, borderTop:"2px solid #F0E8DF" }}>
              <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>📌 Need to Know</p>
              <div style={{ background:"#FFFBEB", border:"1px solid #FCD34D", borderLeft:"4px solid #F59E0B", borderRadius:10, padding:"14px 16px" }}>
                <p style={{ margin:0, fontSize:15, color:"#1F2937", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{show.needToKnow}</p>
              </div>
            </div>
          )}

          {(show.employeeReports || []).length > 0 && (() => {
            const reports = show.employeeReports;
            const totalLeads = reports.reduce((a,r) => a + (+r.leadsAcquired||0), 0);
            const totalAppts = reports.reduce((a,r) => a + (+r.appointmentsBooked||0), 0);
            return (
              <div style={{ marginTop:20, paddingTop:20, borderTop:"2px solid #F0E8DF" }}>
                <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>Employee Reports ({reports.length})</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                  <div style={{ background:"#EFF6FF", borderRadius:10, padding:"12px 16px" }}>
                    <div style={{ fontSize:22, fontWeight:700, color:"#1E40AF", fontFamily:"'Playfair Display',serif" }}>{totalLeads}</div>
                    <div style={{ fontSize:14, color:"#6B7280", marginTop:2 }}>Total Contacts</div>
                  </div>
                  <div style={{ background:"#ECFDF5", borderRadius:10, padding:"12px 16px" }}>
                    <div style={{ fontSize:22, fontWeight:700, color:"#059669", fontFamily:"'Playfair Display',serif" }}>{totalAppts}</div>
                    <div style={{ fontSize:14, color:"#6B7280", marginTop:2 }}>Appointments Booked</div>
                  </div>
                </div>
                {reports.map(r => (
                  <div key={r.employeeId} style={{ background:"#F7F2EB", borderRadius:10, padding:"12px 14px", marginBottom:8 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1F2937", marginBottom:4 }}>{r.employeeName}</div>
                    <div style={{ fontSize:13, color:"#4B5563" }}>Contacts: <b>{r.leadsAcquired}</b> · Appointments: <b>{r.appointmentsBooked}</b></div>
                    {r.futureNotes && <div style={{ fontSize:13, color:"#6B7280", marginTop:6, fontStyle:"italic" }}>"{r.futureNotes}"</div>}
                  </div>
                ))}
              </div>
            );
          })()}

          {(show.status === "countdown" || show.status === "complete") && (show.checklist||[]).length > 0 && (() => {
            const items = show.checklist;
            const done = items.filter(c => c.checked).length;
            const pct = Math.round((done / items.length) * 100);
            const daysUntil = show.date ? Math.ceil((new Date(show.date) - today) / (1000*60*60*24)) : null;
            function toggleItem(id) { onUpdateShow({ ...show, checklist:items.map(c => c.id===id ? { ...c, checked:!c.checked } : c) }); }
            return (
              <div style={{ marginTop:24, borderTop:"2px solid #F0E8DF", paddingTop:20 }}>
                <div style={{ background:done===items.length?"#ECFDF5":"#FFF1F2", border:"1px solid " + (done===items.length?"#6EE7B7":"#FCA5A5"), borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:22 }}>{done===items.length ? "🎉" : "🚨"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:done===items.length?"#065F46":"#991B1B" }}>
                      {done===items.length ? "All set — you're ready for showtime!" : daysUntil != null && daysUntil >= 0 ? "Final Countdown — " + (daysUntil===0?"Today is showtime!":daysUntil===1?"Tomorrow is showtime!":daysUntil+" days to showtime!") : "Pre-Show Checklist"}
                    </div>
                    <div style={{ fontSize:13, color:"#6B7280", marginTop:2 }}>{done} of {items.length} items completed</div>
                  </div>
                  <div style={{ fontSize:20, fontWeight:700, color:done===items.length?"#059669":"#DC2626" }}>{pct}%</div>
                </div>
                <div style={{ height:8, background:"#F3EDE6", borderRadius:4, marginBottom:16, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:pct+"%", background:done===items.length?"#10B981":"#EF4444", borderRadius:4, transition:"width 0.3s" }} />
                </div>
                {items.map(item => (
                  <div key={item.id} onClick={() => toggleItem(item.id)}
                    style={{ display:"flex", alignItems:"center", gap:14, padding:"11px 14px", borderRadius:10, marginBottom:6, cursor:"pointer",
                      background:item.checked?"#ECFDF5":"#fff", border:"1px solid " + (item.checked?"#6EE7B7":"#EDE6DC"), transition:"all 0.15s" }}>
                    <div style={{ width:24, height:24, borderRadius:6, border:"2px solid " + (item.checked?"#10B981":"#D1C8BB"),
                      background:item.checked?"#10B981":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {item.checked && <span style={{ color:"#fff", fontSize:14, fontWeight:700, lineHeight:1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:15, color:item.checked?"#6B7280":"#1F2937", fontWeight:item.checked?400:500, textDecoration:item.checked?"line-through":"none", lineHeight:1.4 }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          {show.status === "complete" && (
            <div style={{ marginTop:20, paddingTop:20, borderTop:"2px solid #F0E8DF" }}>
              <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>⭐ Show Rating</p>
              <StarRating value={show.rating} onChange={r => onUpdateShow({ ...show, rating:r })} size={34} />
              {show.rating && (
                <textarea value={show.ratingNotes || ""} rows={2} onChange={e => onUpdateShow({ ...show, ratingNotes:e.target.value })}
                  placeholder="Worth returning? Notes on the organizer, location, or overall experience…"
                  style={{ width:"100%", marginTop:10, padding:"11px 13px", borderRadius:9, border:"2px solid #EDE6DC", fontSize:14, color:"#1F2937", outline:"none", boxSizing:"border-box", resize:"vertical", fontFamily:"'Nunito',sans-serif", lineHeight:1.5 }} />
              )}
            </div>
          )}

          <ShiftScheduler show={show} employees={employees} onUpdateShow={onUpdateShow} />

          <DocumentsSection show={show} onUpdateShow={onUpdateShow} userId={userId} />

          <div style={{ marginTop:20, paddingTop:22, borderTop:"2px solid #F0E8DF" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>Communication Log ({comms.length})</p>
              {!addingComm && (
                <button onClick={() => setAddingComm(true)} style={{ background:"#1B3A5C", color:"#fff", border:"none", borderRadius:20, padding:"8px 18px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                  + Log Communication
                </button>
              )}
            </div>
            {addingComm && (
              <div style={{ background:"#F7F2EB", borderRadius:14, border:"2px solid #1B3A5C", padding:20, marginBottom:18 }}>
                <p style={{ margin:"0 0 14px", fontWeight:700, fontSize:15, color:"#1B3A5C" }}>Log New Communication</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
                  {COMM_TYPES.map(t => {
                    const active = commType === t.value;
                    const c = COMM_COLORS[t.value];
                    return (
                      <button key={t.value} onClick={() => setCommType(t.value)} style={{
                        padding:"10px 16px", borderRadius:20, border:"2px solid",
                        borderColor: active ? c.text : "#D1C8BB", background: active ? c.bg : "#fff",
                        color: active ? c.text : "#6B7280", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <textarea value={commNote} onChange={e => setCommNote(e.target.value)}
                  placeholder="What was covered? e.g. Confirmed booth location, asked about load-in time…" rows={3}
                  style={{ width:"100%", padding:"12px 14px", borderRadius:9, border:"2px solid #EDE6DC", fontSize:15, color:"#1F2937", background:"#fff", outline:"none", boxSizing:"border-box", resize:"vertical", fontFamily:"'Nunito',sans-serif", lineHeight:1.5, marginBottom:16 }} />
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={saveComm} style={{ background:"#1B3A5C", color:"#fff", border:"none", borderRadius:10, padding:"12px 24px", fontSize:15, fontWeight:700, cursor:"pointer" }}>Save Entry</button>
                  <button onClick={() => { setAddingComm(false); setCommNote(""); setCommType("call"); }}
                    style={{ background:"#fff", color:"#6B7280", border:"2px solid #EDE6DC", borderRadius:10, padding:"12px 20px", fontSize:15, cursor:"pointer", fontWeight:600 }}>Cancel</button>
                </div>
              </div>
            )}
            {comms.length === 0 && !addingComm
              ? <div style={{ textAlign:"center", padding:"28px 0", color:"#9CA3AF" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>💬</div>
                  <p style={{ margin:0, fontSize:15 }}>No communications logged yet.</p>
                </div>
              : comms.map(c => {
                  const col = COMM_COLORS[c.type] || COMM_COLORS.other;
                  return (
                    <div key={c.id} style={{ background:col.bg, border:"1px solid " + col.border, borderLeft:"4px solid " + col.border, borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:18 }}>{COMM_ICONS[c.type]||"📝"}</span>
                          <span style={{ fontSize:14, fontWeight:700, color:col.text }}>{COMM_TYPES.find(t => t.value===c.type)?.label.replace(/.*  /,"") || "Other"}</span>
                          <span style={{ fontSize:13, color:"#9CA3AF" }}>· {fmtDateTime(c.datetime)}</span>
                        </div>
                        <button onClick={() => deleteComm(c.id)}
                          style={{ background:"none", border:"none", color:"#D1D5DB", fontSize:17, cursor:"pointer", lineHeight:1, padding:2, flexShrink:0 }}
                          onMouseEnter={e => e.currentTarget.style.color="#EF4444"}
                          onMouseLeave={e => e.currentTarget.style.color="#D1D5DB"}>×</button>
                      </div>
                      <p style={{ margin:0, fontSize:15, color:"#1F2937", lineHeight:1.55 }}>{c.notes}</p>
                    </div>
                  );
                })
            }
          </div>

          <div style={{ display:"flex", gap:10, marginTop:20 }}>
            <button onClick={onEdit} style={{ flex:1, padding:"14px", borderRadius:12, border:"none", background:"#1B3A5C", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer" }}>✏️ Edit</button>
            <button onClick={onDuplicate}
              style={{ padding:"14px 18px", borderRadius:12, border:"2px solid #EDE6DC", background:"#fff", color:"#6B7280", fontSize:15, fontWeight:700, cursor:"pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="#1B3A5C"; e.currentTarget.style.color="#1B3A5C"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="#EDE6DC"; e.currentTarget.style.color="#6B7280"; }}>
              ⧉ Duplicate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shift Scheduler ──────────────────────────────────────────────────────────
function ShiftScheduler({ show, employees, onUpdateShow }) {
  const shifts = show.shifts || [];
  const [shiftHours, setShiftHours] = useState(4);
  const [peoplePerShift, setPeoplePerShift] = useState(2);
  const [assigningId, setAssigningId] = useState(null);

  function getShowDates() {
    if (!show.date) return [];
    const dates = [];
    const end = show.endDate ? new Date(show.endDate + "T00:00:00") : new Date(show.date + "T00:00:00");
    for (let d = new Date(show.date + "T00:00:00"); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }

  function fmt12(t) {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h % 12 || 12;
    return m ? `${h12}:${String(m).padStart(2,"0")}${ampm}` : `${h12}${ampm}`;
  }

  function generateShifts() {
    if (!show.startTime || !show.endTime) {
      alert("Please set a Start Time and End Time on the show first (Edit Show).");
      return;
    }
    const dates = getShowDates();
    const toMins = t => { const [h,m] = t.split(":").map(Number); return h*60+m; };
    const toTime = m => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
    const startMins = toMins(show.startTime);
    const endMins   = toMins(show.endTime);
    const shiftMins = shiftHours * 60;
    if (shiftMins <= 0 || startMins >= endMins) { alert("Invalid shift length or show times."); return; }
    const newShifts = [];
    for (const date of dates) {
      let cursor = startMins;
      while (cursor + shiftMins <= endMins) {
        newShifts.push({ id: genId(), date, startTime: toTime(cursor), endTime: toTime(cursor + shiftMins), assignedEmployees: [], peopleNeeded: peoplePerShift });
        cursor += shiftMins;
      }
    }
    if (shifts.length > 0 && !window.confirm(`Replace the existing ${shifts.length} shift(s) with ${newShifts.length} new shift(s)?`)) return;
    onUpdateShow({ ...show, shifts: newShifts });
    setAssigningId(null);
  }

  function toggleEmp(shiftId, empId) {
    onUpdateShow({ ...show, shifts: shifts.map(s => {
      if (s.id !== shiftId) return s;
      const a = s.assignedEmployees || [];
      return { ...s, assignedEmployees: a.includes(empId) ? a.filter(id => id !== empId) : [...a, empId] };
    })});
  }

  function deleteShifts() {
    if (!window.confirm("Remove all shifts for this show?")) return;
    onUpdateShow({ ...show, shifts: [] });
    setAssigningId(null);
  }

  const dates = getShowDates();
  const byDate = Object.fromEntries(dates.map(d => [d, shifts.filter(s => s.date === d).sort((a,b) => a.startTime.localeCompare(b.startTime))]));
  const assigningShift = shifts.find(s => s.id === assigningId);

  const dayLabel = d => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
  };

  return (
    <div style={{ marginTop:20, paddingTop:20, borderTop:"2px solid #F0E8DF" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>
          Shift Schedule {shifts.length > 0 && `(${shifts.length} shifts)`}
        </p>
        {shifts.length > 0 && (
          <button onClick={deleteShifts} style={{ background:"none", border:"none", color:"#9CA3AF", fontSize:13, cursor:"pointer", fontWeight:600 }}>
            Clear All
          </button>
        )}
      </div>

      {/* Setup panel */}
      <div style={{ background:"#F7F2EB", borderRadius:12, padding:"16px 18px", marginBottom: shifts.length > 0 ? 18 : 0, display:"flex", flexWrap:"wrap", gap:14, alignItems:"flex-end" }}>
        <div>
          <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>Shift Length (hours)</label>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setShiftHours(h => Math.max(1, h - 0.5))}
              style={{ width:32, height:32, borderRadius:8, border:"2px solid #EDE6DC", background:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#1B3A5C" }}>−</button>
            <span style={{ fontSize:18, fontWeight:700, color:"#1B3A5C", minWidth:40, textAlign:"center" }}>{shiftHours}h</span>
            <button onClick={() => setShiftHours(h => Math.min(12, h + 0.5))}
              style={{ width:32, height:32, borderRadius:8, border:"2px solid #EDE6DC", background:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#1B3A5C" }}>+</button>
          </div>
        </div>
        <div>
          <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>People Per Shift</label>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setPeoplePerShift(p => Math.max(1, p - 1))}
              style={{ width:32, height:32, borderRadius:8, border:"2px solid #EDE6DC", background:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#1B3A5C" }}>−</button>
            <span style={{ fontSize:18, fontWeight:700, color:"#1B3A5C", minWidth:40, textAlign:"center" }}>{peoplePerShift}</span>
            <button onClick={() => setPeoplePerShift(p => Math.min(20, p + 1))}
              style={{ width:32, height:32, borderRadius:8, border:"2px solid #EDE6DC", background:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#1B3A5C" }}>+</button>
          </div>
        </div>
        <div style={{ flex:1 }}>
          {show.startTime && show.endTime
            ? <p style={{ margin:0, fontSize:13, color:"#6B7280" }}>
                Show hours: <b>{fmt12(show.startTime)} – {fmt12(show.endTime)}</b> · will create <b>{Math.floor(((() => { const [sh,sm]=show.startTime.split(":").map(Number); const [eh,em]=show.endTime.split(":").map(Number); return (eh*60+em)-(sh*60+sm); })()) / (shiftHours*60))}</b> shift{Math.floor(((() => { const [sh,sm]=show.startTime.split(":").map(Number); const [eh,em]=show.endTime.split(":").map(Number); return (eh*60+em)-(sh*60+sm); })()) / (shiftHours*60)) !== 1 ? "s":""}  per day
              </p>
            : <p style={{ margin:0, fontSize:13, color:"#F59E0B", fontWeight:600 }}>⚠️ Set Start & End Time on the show to generate shifts.</p>
          }
        </div>
        <button onClick={generateShifts}
          style={{ padding:"10px 22px", borderRadius:10, border:"none", background:"#1B3A5C", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
          {shifts.length > 0 ? "↺ Regenerate" : "⚡ Generate Shifts"}
        </button>
      </div>

      {/* Schedule grid */}
      {shifts.length > 0 && (
        <div style={{ overflowX:"auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${dates.length}, minmax(130px, 1fr))`, gap:10, minWidth: dates.length > 1 ? dates.length * 140 : "auto" }}>
            {dates.map(date => (
              <div key={date}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1B3A5C", textAlign:"center", marginBottom:8, padding:"6px 0", borderBottom:"2px solid #EDE6DC" }}>
                  {dayLabel(date)}
                </div>
                {(byDate[date] || []).map(shift => {
                  const empNames = (shift.assignedEmployees || []).map(id => employees.find(e => e.id === id)).filter(Boolean);
                  const needed = shift.peopleNeeded || 1;
                  const filled = empNames.length;
                  const full = filled >= needed;
                  const isSel = assigningId === shift.id;
                  const borderColor = isSel ? "#1B3A5C" : full ? "#6EE7B7" : filled > 0 ? "#FCD34D" : "#EDE6DC";
                  const bgColor    = isSel ? "#1B3A5C" : full ? "#ECFDF5" : filled > 0 ? "#FFFBEB" : "#fff";
                  return (
                    <div key={shift.id} onClick={() => setAssigningId(isSel ? null : shift.id)}
                      style={{ borderRadius:10, border:"2px solid", borderColor, background: bgColor,
                        padding:"10px 12px", marginBottom:8, cursor:"pointer", transition:"all 0.15s" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                        <span style={{ fontSize:13, fontWeight:700, color: isSel ? "#fff" : "#1B3A5C" }}>
                          {fmt12(shift.startTime)} – {fmt12(shift.endTime)}
                        </span>
                        <span style={{ fontSize:13, fontWeight:700, borderRadius:20, padding:"2px 8px",
                          background: isSel?"rgba(255,255,255,0.2)": full?"#D1FAE5": filled>0?"#FEF3C7":"#F3F4F6",
                          color: isSel?"#fff": full?"#065F46": filled>0?"#92400E":"#6B7280" }}>
                          {filled}/{needed}
                        </span>
                      </div>
                      {empNames.length === 0
                        ? <div style={{ fontSize:12, color: isSel ? "rgba(255,255,255,0.6)" : "#9CA3AF", fontStyle:"italic" }}>Tap to assign</div>
                        : empNames.map(e => (
                          <div key={e.id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                            <div style={{ width:20, height:20, borderRadius:"50%", background: isSel?"rgba(255,255,255,0.3)":"#1B3A5C", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:9, fontWeight:700, flexShrink:0 }}>
                              {e.firstName[0]}{e.lastName[0]}
                            </div>
                            <span style={{ fontSize:12, color: isSel?"#fff":"#374151", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {e.firstName} {e.lastName}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Employee assignment panel */}
          {assigningShift && (
            <div style={{ marginTop:14, background:"#F7F2EB", borderRadius:12, padding:"16px 18px", border:"2px solid #1B3A5C" }}>
              <p style={{ margin:"0 0 12px", fontWeight:700, fontSize:14, color:"#1B3A5C" }}>
                Assign employees — {fmt12(assigningShift.startTime)} – {fmt12(assigningShift.endTime)} · {dayLabel(assigningShift.date)}
              </p>
              {employees.length === 0
                ? <p style={{ color:"#9CA3AF", margin:0, fontSize:13 }}>No employees added yet.</p>
                : <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {employees.map(emp => {
                      const on = (assigningShift.assignedEmployees || []).includes(emp.id);
                      return (
                        <button key={emp.id} onClick={() => toggleEmp(assigningShift.id, emp.id)} style={{
                          padding:"8px 16px", borderRadius:20, border:"2px solid",
                          borderColor: on ? "#10B981" : "#EDE6DC",
                          background: on ? "#ECFDF5" : "#fff",
                          color: on ? "#065F46" : "#4B5563",
                          fontWeight:700, fontSize:13, cursor:"pointer" }}>
                          {on ? "✓ " : ""}{emp.firstName} {emp.lastName}
                        </button>
                      );
                    })}
                  </div>
              }
              <button onClick={() => setAssigningId(null)}
                style={{ marginTop:12, background:"none", border:"none", color:"#6B7280", fontSize:13, cursor:"pointer", fontWeight:600 }}>
                Done ✓
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Documents Section ────────────────────────────────────────────────────────
function DocumentsSection({ show, onUpdateShow, userId }) {
  const docs = show.documents || [];
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${show.id}/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from("show-documents").upload(path, file);
      if (error) throw error;
      const doc = { id: genId(), name: file.name, size: file.size, type: file.type, path, uploadedAt: new Date().toISOString() };
      onUpdateShow({ ...show, documents: [...docs, doc] });
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function openDoc(doc) {
    const { data, error } = await supabase.storage.from("show-documents").createSignedUrl(doc.path, 3600);
    if (error) { alert("Could not open file: " + error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    await supabase.storage.from("show-documents").remove([doc.path]);
    onUpdateShow({ ...show, documents: docs.filter(d => d.id !== doc.id) });
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  function fileIcon(type) {
    if (!type) return "📎";
    if (type.includes("pdf"))   return "📄";
    if (type.includes("image")) return "🖼️";
    if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return "📊";
    if (type.includes("word")  || type.includes("document")) return "📝";
    return "📎";
  }

  return (
    <div style={{ marginTop:20, paddingTop:20, borderTop:"2px solid #F0E8DF" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>
          Documents ({docs.length})
        </p>
        <button onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading}
          style={{ background:"#1B3A5C", color:"#fff", border:"none", borderRadius:20, padding:"8px 18px", fontSize:14, fontWeight:700, cursor:uploading?"not-allowed":"pointer", opacity:uploading?0.6:1 }}>
          {uploading ? "Uploading…" : "📎 Upload File"}
        </button>
        <input ref={fileRef} type="file" style={{ display:"none" }} onChange={handleUpload}
          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt" />
      </div>
      {docs.length === 0
        ? <p style={{ color:"#9CA3AF", margin:0, fontSize:14 }}>No documents yet. Upload registration forms, maps, invoices, receipts, and more.</p>
        : docs.map(doc => (
          <div key={doc.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, border:"1px solid #EDE6DC", background:"#FAFAF9", marginBottom:8 }}>
            <span style={{ fontSize:24, flexShrink:0 }}>{fileIcon(doc.type)}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:14, color:"#1F2937", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.name}</div>
              <div style={{ fontSize:14, color:"#6B7280", marginTop:2 }}>{formatSize(doc.size)} · {fmtDate(doc.uploadedAt?.slice(0,10))}</div>
            </div>
            <button onClick={() => openDoc(doc)}
              style={{ padding:"6px 14px", borderRadius:8, background:"#EFF6FF", border:"1px solid #93C5FD", color:"#1D4ED8", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
              ⬇ Open
            </button>
            <button onClick={() => handleDelete(doc)}
              style={{ background:"none", border:"none", color:"#D1D5DB", fontSize:18, cursor:"pointer", padding:"2px 4px", flexShrink:0, lineHeight:1 }}
              onMouseEnter={e => e.currentTarget.style.color="#EF4444"}
              onMouseLeave={e => e.currentTarget.style.color="#D1D5DB"}>×</button>
          </div>
        ))
      }
    </div>
  );
}

// ─── Import Modal ──────────────────────────────────────────────────────────
const IMPORT_FIELDS = [
  { key:"name",         label:"Show Name",       aliases:["name","show name","event name","show","event","title"] },
  { key:"date",         label:"Start Date",      aliases:["date","start date","show date","event date","start","begin"] },
  { key:"endDate",      label:"End Date",        aliases:["end date","end","thru","through","finish"] },
  { key:"startTime",    label:"Start Time",      aliases:["start time","open time","time","opens"] },
  { key:"endTime",      label:"End Time",        aliases:["end time","close time","closes"] },
  { key:"category",     label:"Category",        aliases:["category","type","event type","show type"] },
  { key:"status",       label:"Status",          aliases:["status","stage"] },
  { key:"street",       label:"Street Address",  aliases:["street","address","street address","addr"] },
  { key:"city",         label:"City",            aliases:["city","town"] },
  { key:"state",        label:"State",           aliases:["state","st","province"] },
  { key:"zip",          label:"Zip Code",        aliases:["zip","zip code","postal","postal code"] },
  { key:"contactName",  label:"Contact Name",    aliases:["contact","contact name","organizer","rep"] },
  { key:"contactEmail", label:"Contact Email",   aliases:["email","contact email","e-mail"] },
  { key:"contactPhone", label:"Contact Phone",   aliases:["phone","contact phone","telephone","cell"] },
  { key:"totalDue",     label:"Total Show Cost", aliases:["cost","total cost","show cost","total due","price","fee","amount","total"] },
  { key:"depositDue",   label:"Deposit Due",     aliases:["deposit","deposit due","deposit amount"] },
  { key:"boothSize",    label:"Booth Size",      aliases:["booth","booth size","space size"] },
  { key:"needToKnow",   label:"Notes",           aliases:["notes","need to know","comments","description","details","info"] },
];

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return { headers:[], rows:[] };
  function parseRow(line) {
    const result = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === "," && !inQ) { result.push(cur.trim()); cur = ""; }
      else { cur += line[i]; }
    }
    result.push(cur.trim());
    return result;
  }
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow).filter(r => r.some(c => c));
  return { headers, rows };
}

function parseImportDate(raw) {
  if (!raw || !raw.trim()) return "";
  const s = raw.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // M/D/YYYY or MM/DD/YYYY or M/D/YY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const y = mdy[3].length === 2 ? "20" + mdy[3] : mdy[3];
    return `${y}-${mdy[1].padStart(2,"0")}-${mdy[2].padStart(2,"0")}`;
  }
  // Try native parse as fallback
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0,10);
  return "";
}

function normalizeStatus(raw) {
  if (!raw) return "lead";
  const s = raw.toLowerCase().trim();
  if (s.includes("complete") || s.includes("done") || s.includes("finished")) return "complete";
  if (s.includes("countdown") || s.includes("final")) return "countdown";
  if (s.includes("pre") || s.includes("preshow")) return "preshow";
  if (s.includes("book")) return "booked";
  return "lead";
}

function autoMap(headers) {
  const map = {};
  headers.forEach((h, i) => {
    const norm = h.toLowerCase().trim();
    const field = IMPORT_FIELDS.find(f => f.aliases.includes(norm));
    if (field && !Object.values(map).includes(i)) map[field.key] = i;
  });
  return map;
}

function ImportModal({ onImport, onClose }) {
  const [step, setStep]       = useState("upload");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows]       = useState([]);
  const [mapping, setMapping] = useState({});
  const [error, setError]     = useState("");
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const { headers: h, rows: r } = parseCSV(ev.target.result);
      if (h.length === 0 || r.length === 0) { setError("Could not read this file. Make sure it's a valid CSV with a header row."); return; }
      setHeaders(h); setRows(r); setMapping(autoMap(h)); setError(""); setStep("map");
    };
    reader.readAsText(file);
  }

  function doImport() {
    const imported = rows.map(row => {
      const get = key => { const i = mapping[key]; return i !== undefined && i !== "" ? (row[i] || "").trim() : ""; };
      return {
        ...{ name:"", date:"", endDate:"", startTime:"", endTime:"", category:"", status:"lead",
             street:"", city:"", state:"", zip:"", contactName:"", contactEmail:"", contactPhone:"",
             boothSize:"", totalDue:"", depositDue:"", needToKnow:"",
             assignedEmployees:[], employeeReports:[], inventory:[], checklist:[], communications:[], documents:[], shifts:[], rating:null, ratingNotes:"" },
        id: genId(),
        name:         get("name"),
        date:         parseImportDate(get("date")),
        endDate:      parseImportDate(get("endDate")),
        startTime:    get("startTime"),
        endTime:      get("endTime"),
        category:     get("category"),
        status:       normalizeStatus(get("status")),
        street:       get("street"),
        city:         get("city"),
        state:        get("state"),
        zip:          get("zip"),
        contactName:  get("contactName"),
        contactEmail: get("contactEmail"),
        contactPhone: get("contactPhone"),
        boothSize:    get("boothSize"),
        totalDue:     get("totalDue").replace(/[$,]/g,""),
        depositDue:   get("depositDue").replace(/[$,]/g,""),
        needToKnow:   get("needToKnow"),
      };
    }).filter(s => s.name);
    if (imported.length === 0) { setError("No valid shows found. Make sure the Show Name column is mapped."); return; }
    onImport(imported);
    onClose();
  }

  const mappedCount = Object.keys(mapping).length;
  const nameIsMapped = "name" in mapping;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:700, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.25)", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ background:"#1B3A5C", padding:"22px 28px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h2 style={{ margin:0, color:"#fff", fontFamily:"'Playfair Display',serif", fontSize:22 }}>📥 Import Shows</h2>
            <p style={{ margin:"4px 0 0", color:"rgba(255,255,255,0.7)", fontSize:14 }}>From Google Sheets, Excel, or any CSV file</p>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", fontSize:22, cursor:"pointer", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        <div style={{ padding:"24px 28px", overflowY:"auto", flex:1 }}>
          {step === "upload" && (
            <div>
              <div style={{ background:"#F7F2EB", border:"2px dashed #C4944A", borderRadius:16, padding:"40px 24px", textAlign:"center", marginBottom:20, cursor:"pointer" }}
                onClick={() => fileRef.current && fileRef.current.click()}>
                <div style={{ fontSize:48, marginBottom:12 }}>📂</div>
                <p style={{ fontSize:18, fontWeight:700, color:"#1B3A5C", margin:"0 0 8px" }}>Click to choose your file</p>
                <p style={{ fontSize:15, color:"#6B7280", margin:0 }}>Accepts .csv files (export from Google Sheets or Excel)</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display:"none" }} onChange={handleFile} />

              <div style={{ background:"#EFF6FF", border:"1px solid #93C5FD", borderRadius:12, padding:"16px 20px" }}>
                <p style={{ margin:"0 0 10px", fontWeight:700, fontSize:15, color:"#1E40AF" }}>💡 How to export from Google Sheets or Excel:</p>
                <ul style={{ margin:0, paddingLeft:20, color:"#374151", fontSize:15, lineHeight:2 }}>
                  <li><b>Google Sheets:</b> File → Download → Comma Separated Values (.csv)</li>
                  <li><b>Excel:</b> File → Save As → CSV (Comma delimited) (.csv)</li>
                </ul>
                <p style={{ margin:"10px 0 0", fontSize:14, color:"#6B7280" }}>
                  The app will automatically detect your column headers — no exact naming required.
                </p>
              </div>
              {error && <p style={{ color:"#DC2626", marginTop:16, fontWeight:600, fontSize:15 }}>{error}</p>}
            </div>
          )}

          {step === "map" && (
            <div>
              <p style={{ margin:"0 0 6px", fontSize:15, color:"#374151" }}>
                Found <b>{rows.length} rows</b> with <b>{headers.length} columns</b>. We auto-matched <b>{mappedCount} of {IMPORT_FIELDS.length}</b> fields — check and adjust below.
              </p>
              <p style={{ margin:"0 0 18px", fontSize:14, color:"#6B7280" }}>
                Only <b>Show Name</b> is required. Leave others as "— Skip —" if not in your file.
              </p>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
                {IMPORT_FIELDS.map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:4 }}>
                      {field.label}{field.key === "name" ? <span style={{ color:"#DC2626" }}> *</span> : ""}
                    </label>
                    <select
                      value={mapping[field.key] !== undefined ? mapping[field.key] : ""}
                      onChange={e => {
                        const val = e.target.value;
                        setMapping(m => { const n = {...m}; if (val === "") delete n[field.key]; else n[field.key] = +val; return n; });
                      }}
                      style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"2px solid " + (field.key === "name" && !nameIsMapped ? "#FCA5A5" : "#EDE6DC"), fontSize:14, color:"#1F2937", background:"#fff", outline:"none" }}>
                      <option value="">— Skip —</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h} {rows[0]?.[i] ? `(e.g. "${rows[0][i]}")` : ""}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div style={{ background:"#F7F2EB", borderRadius:12, padding:"16px 18px", marginBottom:4 }}>
                <p style={{ margin:"0 0 10px", fontWeight:700, fontSize:14, color:"#1B3A5C" }}>Preview (first 3 rows)</p>
                {rows.slice(0,3).map((row, ri) => {
                  const name  = mapping.name  !== undefined ? row[mapping.name]  : "—";
                  const date  = mapping.date  !== undefined ? parseImportDate(row[mapping.date])  : "";
                  const city  = mapping.city  !== undefined ? row[mapping.city]  : "";
                  const state = mapping.state !== undefined ? row[mapping.state] : "";
                  return (
                    <div key={ri} style={{ background:"#fff", borderRadius:8, padding:"10px 14px", marginBottom:6, fontSize:14, color:"#374151" }}>
                      <b style={{ color:"#1B3A5C" }}>{name || "—"}</b>
                      {date && <span style={{ color:"#6B7280", marginLeft:10 }}>📅 {fmtDate(date)}</span>}
                      {(city || state) && <span style={{ color:"#6B7280", marginLeft:10 }}>📍 {[city, state].filter(Boolean).join(", ")}</span>}
                    </div>
                  );
                })}
              </div>
              {error && <p style={{ color:"#DC2626", marginTop:12, fontWeight:600, fontSize:15 }}>{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"18px 28px", borderTop:"1px solid #EDE6DC", display:"flex", gap:12, justifyContent:"flex-end", background:"#FAFAF9" }}>
          {step === "upload" && (
            <button onClick={onClose} style={{ padding:"12px 24px", borderRadius:10, border:"2px solid #EDE6DC", background:"#fff", color:"#6B7280", fontSize:15, cursor:"pointer", fontWeight:600 }}>Cancel</button>
          )}
          {step === "map" && (<>
            <button onClick={() => { setStep("upload"); setError(""); }} style={{ padding:"12px 24px", borderRadius:10, border:"2px solid #EDE6DC", background:"#fff", color:"#6B7280", fontSize:15, cursor:"pointer", fontWeight:600 }}>← Back</button>
            <button onClick={doImport} disabled={!nameIsMapped}
              style={{ padding:"12px 28px", borderRadius:10, border:"none", background: nameIsMapped ? "#1B3A5C" : "#9CA3AF", color:"#fff", fontSize:15, cursor: nameIsMapped ? "pointer" : "not-allowed", fontWeight:700 }}>
              Import {rows.length} Show{rows.length !== 1 ? "s" : ""} →
            </button>
          </>)}
        </div>
      </div>
    </div>
  );
}

// ─── Shows List (isMobile is now properly included in props) ───────────────
function ShowsListView({ shows, onAddShow, onViewShow, onDeleteShow, onImportShows, isMobile }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const filtered = shows.filter(s => {
    const ms = filterStatus === "all" || s.status === filterStatus;
    const mt = s.name.toLowerCase().includes(search.toLowerCase()) ||
               (s.contactName || "").toLowerCase().includes(search.toLowerCase());
    return ms && mt;
  });
  return (
    <div style={{ padding: isMobile ? "20px 16px" : "36px 44px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:34, fontFamily:"'Playfair Display',serif", color:"#1B3A5C", margin:0 }}>All Shows</h1>
          <p style={{ color:"#6B7280", marginTop:6, fontSize:17 }}>{shows.length} show{shows.length !== 1 ? "s" : ""} in your program</p>
        </div>
        {!isMobile && (
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setShowImport(true)} style={{ background:"#fff", color:"#1B3A5C", border:"2px solid #1B3A5C", borderRadius:12, padding:"14px 22px", fontSize:16, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
              📥 Import
            </button>
            <button onClick={onAddShow} style={{ background:"#1B3A5C", color:"#fff", border:"none", borderRadius:12, padding:"14px 26px", fontSize:16, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:22, lineHeight:1 }}>+</span> Add New Show
            </button>
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:12, marginBottom:22, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Search shows or contacts…"
          style={{ flex:"1 1 240px", padding:"12px 16px", borderRadius:10, border:"2px solid #EDE6DC", fontSize:15, outline:"none", background:"#fff", color:"#1F2937" }} />
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {["all", ...STATUS_ORDER].map(k => {
            const active = filterStatus === k;
            const s = k !== "all" ? STATUSES[k] : null;
            return (
              <button key={k} onClick={() => setFilterStatus(k)} style={{
                padding:"9px 15px", borderRadius:20, border:"2px solid",
                borderColor: active ? (s ? s.dot : "#1B3A5C") : "#EDE6DC",
                background: active ? (s ? s.bg : "#EBF1F7") : "#fff",
                color: active ? (s ? s.text : "#1B3A5C") : "#6B7280",
                fontWeight:700, fontSize:13, cursor:"pointer" }}>
                {k === "all" ? "All" : STATUSES[k].label}
              </button>
            );
          })}
        </div>
      </div>
      {isMobile ? (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.length === 0
            ? <p style={{ textAlign:"center", color:"#9CA3AF", padding:40 }}>No shows match your search.</p>
            : filtered.map(show => {
                const balance = Math.max(0, (+show.totalDue||0) - (+show.depositPaid||0) - (+show.totalPaid||0));
                const st = STATUSES[show.status];
                return (
                  <div key={show.id} onClick={() => onViewShow(show)}
                    style={{ background:"#fff", borderRadius:14, border:"1px solid #EDE6DC", borderLeft:"4px solid " + st.dot, padding:"14px 16px", cursor:"pointer" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                      <div style={{ fontWeight:700, fontSize:16, color:"#1F2937", flex:1, paddingRight:8, lineHeight:1.2 }}>{show.name}</div>
                      <StatusBadge status={show.status} />
                    </div>
                    <div style={{ fontSize:13, color:"#6B7280", marginBottom:8 }}>{fmtDateRange(show.date, show.endDate)}{show.category ? " · " + show.category : ""}</div>
                    <div style={{ display:"flex", gap:12, fontSize:13 }}>
                      <span style={{ color:"#059669", fontWeight:700 }}>Dep: {fmtMoney(show.depositPaid)}</span>
                      <span style={{ color:balance > 0 ? "#DC2626" : "#059669", fontWeight:700 }}>Bal: {fmtMoney(balance)}</span>
                    </div>
                  </div>
                );
              })
          }
        </div>
      ) : (
        <div style={{ background:"#fff", borderRadius:18, border:"1px solid #EDE6DC", overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#F7F2EB", borderBottom:"2px solid #EDE6DC" }}>
                  {["Show Name","Date","Category","Status","Booth","Staff","Deposit Paid","Balance",""].map((h, i) => (
                    <th key={i} style={{ padding:"14px 18px", textAlign:"left", fontSize:14, fontWeight:700, color:"#4B5563", textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={9} style={{ padding:40, textAlign:"center", color:"#9CA3AF", fontSize:16 }}>No shows match your search or filter.</td></tr>
                  : filtered.map(show => {
                      const balance = (+show.totalDue||0) - (+show.depositPaid||0) - (+show.totalPaid||0);
                      return (
                        <tr key={show.id} onClick={() => onViewShow(show)}
                          style={{ borderBottom:"1px solid #F5EDE3", cursor:"pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background="#FAF6F0"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <td style={{ padding:"15px 18px", fontWeight:700, color:"#1F2937", fontSize:15 }}>{show.name}</td>
                          <td style={{ padding:"15px 18px", color:"#4B5563", fontSize:14, whiteSpace:"nowrap" }}>{fmtDateRange(show.date, show.endDate)}</td>
                          <td style={{ padding:"15px 18px", color:"#4B5563", fontSize:14 }}>{show.category}</td>
                          <td style={{ padding:"15px 18px" }}><StatusBadge status={show.status} /></td>
                          <td style={{ padding:"15px 18px", color:"#4B5563", fontSize:14 }}>{show.boothSize || "—"}</td>
                          <td style={{ padding:"15px 18px", color:"#4B5563", fontSize:14 }}>{(show.assignedEmployees||[]).length}/{show.employeesNeeded||0}</td>
                          <td style={{ padding:"15px 18px", color:"#059669", fontWeight:700, fontSize:14 }}>{fmtMoney(show.depositPaid)}</td>
                          <td style={{ padding:"15px 18px", fontWeight:700, fontSize:14, color: balance > 0 ? "#DC2626" : "#059669" }}>{fmtMoney(balance)}</td>
                          <td style={{ padding:"15px 12px" }}>
                            <button onClick={e => { e.stopPropagation(); if (window.confirm("Delete \"" + show.name + "\"? This cannot be undone.")) onDeleteShow(show.id); }}
                              style={{ background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA", borderRadius:8, padding:"6px 12px", fontSize:13, cursor:"pointer", fontWeight:600 }}>Delete</button>
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showImport && (
        <ImportModal
          onImport={imported => { onImportShows(imported); setShowImport(false); }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

// ─── Calendar ──────────────────────────────────────────────────────────────
function CalendarView({ shows, onViewShow }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const showsByDate = useMemo(() => {
    const m = {};
    shows.forEach(s => { if (!m[s.date]) m[s.date] = []; m[s.date].push(s); });
    return m;
  }, [shows]);
  const pad = n => String(n).padStart(2, "0");
  const todayStr = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <div style={{ padding:"36px 44px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <h1 style={{ fontSize:34, fontFamily:"'Playfair Display',serif", color:"#1B3A5C", margin:0 }}>Show Calendar</h1>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <button onClick={prev} style={{ width:46, height:46, borderRadius:10, border:"2px solid #EDE6DC", background:"#fff", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>‹</button>
          <span style={{ fontSize:24, fontWeight:700, color:"#1B3A5C", minWidth:220, textAlign:"center", fontFamily:"'Playfair Display',serif" }}>{MONTHS[month]} {year}</span>
          <button onClick={next} style={{ width:46, height:46, borderRadius:10, border:"2px solid #EDE6DC", background:"#fff", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>›</button>
        </div>
      </div>
      <div style={{ display:"flex", gap:14, marginBottom:18, flexWrap:"wrap" }}>
        {STATUS_ORDER.map(k => {
          const s = STATUSES[k];
          return <div key={k} style={{ display:"flex", alignItems:"center", gap:6, fontSize:14, color:"#374151", fontWeight:500 }}>
            <div style={{ width:14, height:14, borderRadius:4, background:s.dot }} />{s.label}
          </div>;
        })}
      </div>
      <div style={{ background:"#fff", borderRadius:20, border:"1px solid #EDE6DC", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"2px solid #EDE6DC" }}>
          {DAYS.map(d => <div key={d} style={{ padding:"14px 8px", textAlign:"center", fontSize:14, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em", background:"#F7F2EB" }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
          {cells.map((day, idx) => {
            const dateStr = day ? (year + "-" + pad(month + 1) + "-" + pad(day)) : null;
            const dayShows = dateStr ? (showsByDate[dateStr] || []) : [];
            const isToday = dateStr === todayStr;
            return (
              <div key={idx} style={{ minHeight:130, padding:"8px 7px",
                borderRight:(idx+1)%7===0 ? "none" : "1px solid #F5EDE3", borderBottom:"1px solid #F5EDE3",
                background: !day ? "#FAFAF9" : isToday ? "#FBF7F0" : "#fff" }}>
                {day && <>
                  <div style={{ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:5,
                    background: isToday ? "#1B3A5C" : "transparent", color: isToday ? "#fff" : "#374151",
                    fontWeight: isToday ? 700 : 500, fontSize:16 }}>{day}</div>
                  {dayShows.map(s => {
                    const st = STATUSES[s.status];
                    return <div key={s.id} onClick={() => onViewShow(s)} title={s.name} style={{
                      background:st.bg, border:"1px solid " + st.border, borderLeft:"3px solid " + st.dot,
                      color:st.text, borderRadius:6, padding:"3px 6px", fontSize:12, fontWeight:700,
                      marginBottom:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", cursor:"pointer" }}>{s.name}</div>;
                  })}
                </>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline (Kanban) ─────────────────────────────────────────────────────
function PipelineView({ shows, onUpdateShow, onViewShow }) {
  const [dragId,   setDragId]   = useState(null);
  const [dragOver, setDragOver] = useState(null);
  function handleDrop(statusKey) {
    if (!dragId) return;
    const show = shows.find(s => s.id === dragId);
    if (!show || show.status === statusKey) { setDragId(null); setDragOver(null); return; }
    let updated = { ...show, status:statusKey };
    if (statusKey === "countdown" && (!updated.checklist || updated.checklist.length === 0)) updated.checklist = DEFAULT_CHECKLIST();
    onUpdateShow(updated);
    setDragId(null); setDragOver(null);
  }
  return (
    <div style={{ padding:"36px 44px 36px", height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ marginBottom:24, flexShrink:0 }}>
        <h1 style={{ fontSize:34, fontFamily:"'Playfair Display',serif", color:"#1B3A5C", margin:0 }}>Pipeline</h1>
        <p style={{ color:"#6B7280", marginTop:6, fontSize:16 }}>Drag shows between stages — or they'll move automatically as you update them.</p>
      </div>
      <div style={{ display:"flex", gap:0, marginBottom:24, background:"#fff", borderRadius:14, border:"1px solid #EDE6DC", overflow:"hidden", flexShrink:0 }}>
        {[
          { icon:"💰", text:"Deposit entered → Booked",              color:"#EFF6FF", border:"#93C5FD", textColor:"#1E40AF" },
          { icon:"👥", text:"Staff assigned → Pre-Show",             color:"#FFF7ED", border:"#FDBA74", textColor:"#9A3412" },
          { icon:"📅", text:"7 days out → Final Countdown + Checklist", color:"#FFF1F2", border:"#FCA5A5", textColor:"#991B1B" },
        ].map((t, i) => (
          <div key={i} style={{ flex:1, display:"flex", alignItems:"center", gap:10, padding:"12px 18px", background:t.color, borderRight:i<2?"1px solid "+t.border:"none" }}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ fontSize:13, fontWeight:600, color:t.textColor }}>{t.text}</span>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:14, overflowX:"auto", flex:1, paddingBottom:16 }}>
        {STATUS_ORDER.map(statusKey => {
          const st = STATUSES[statusKey];
          const col = shows.filter(s => s.status === statusKey);
          const isOver = dragOver === statusKey;
          return (
            <div key={statusKey}
              onDragOver={e => { e.preventDefault(); setDragOver(statusKey); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(statusKey)}
              style={{ minWidth:230, flex:"0 0 230px", display:"flex", flexDirection:"column",
                background:isOver ? st.bg : "#F0EBE3", borderRadius:16, padding:14,
                border:isOver ? "2px dashed " + st.dot : "2px solid transparent", transition:"background 0.15s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                <div style={{ width:11, height:11, borderRadius:"50%", background:st.dot, flexShrink:0 }} />
                <span style={{ fontWeight:700, fontSize:14, color:st.text, flex:1 }}>{st.label}</span>
                <span style={{ background:st.bg, color:st.text, border:"1px solid "+st.border, borderRadius:10, padding:"2px 9px", fontSize:12, fontWeight:700 }}>{col.length}</span>
              </div>
              <div style={{ flex:1, minHeight:80 }}>
                {col.length === 0 && (
                  <div style={{ border:"2px dashed "+st.border, borderRadius:12, padding:"20px 14px", textAlign:"center", color:st.text, opacity:0.5, fontSize:13 }}>Drop here</div>
                )}
                {col.map(show => {
                  const showDate = new Date(show.date);
                  const daysUntil = Math.ceil((showDate - new Date()) / (1000*60*60*24));
                  const checkDone  = (show.checklist||[]).filter(c => c.checked).length;
                  const checkTotal = (show.checklist||[]).length;
                  return (
                    <div key={show.id}
                      draggable
                      onDragStart={() => setDragId(show.id)}
                      onDragEnd={() => { setDragId(null); setDragOver(null); }}
                      onClick={() => onViewShow(show)}
                      style={{ background:"#fff", borderRadius:12, padding:"13px 14px", marginBottom:10, cursor:"grab",
                        border:"1px solid #EDE6DC", borderLeft:"3px solid "+st.dot, boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
                        opacity:dragId===show.id?0.45:1, transition:"opacity 0.15s", userSelect:"none" }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.1)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)"}>
                      <div style={{ fontWeight:700, fontSize:14, color:"#1F2937", marginBottom:5, lineHeight:1.3 }}>{show.name}</div>
                      <div style={{ fontSize:12, color:"#6B7280", marginBottom:4 }}>📅 {fmtDateRange(show.date, show.endDate)}</div>
                      {show.date && daysUntil >= 0 && daysUntil <= 30 && (
                        <div style={{ fontSize:12, fontWeight:700, color:daysUntil<=7?"#DC2626":daysUntil<=14?"#D97706":"#059669" }}>
                          {daysUntil===0?"🚨 TODAY":daysUntil===1?"⚠️ Tomorrow":daysUntil+" days away"}
                        </div>
                      )}
                      <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                        {show.boothSize && <span style={{ fontSize:13, background:"#F3F4F6", color:"#6B7280", borderRadius:6, padding:"2px 7px", fontWeight:600 }}>{show.boothSize}</span>}
                        {(show.assignedEmployees||[]).length > 0 && <span style={{ fontSize:13, background:"#EFF6FF", color:"#1E40AF", borderRadius:6, padding:"2px 7px", fontWeight:600 }}>👥 {show.assignedEmployees.length}</span>}
                        {checkTotal > 0 && <span style={{ fontSize:13, background:checkDone===checkTotal?"#ECFDF5":"#FFF1F2", color:checkDone===checkTotal?"#065F46":"#991B1B", borderRadius:6, padding:"2px 7px", fontWeight:600 }}>✓ {checkDone}/{checkTotal}</span>}
                        {show.rating && <span style={{ fontSize:13, background:"#FFFBEB", color:"#B45309", borderRadius:6, padding:"2px 7px", fontWeight:700 }}>{"★".repeat(show.rating)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reports (duplicate KPI removed, currentYear removed) ─────────────────
function ReportsView({ shows, isMobile }) {
  const years      = [...new Set(shows.map(s => s.date ? s.date.split("-")[0] : null).filter(Boolean))].sort((a,b) => b-a);
  const cities     = [...new Set(shows.map(s => s.city).filter(Boolean))].sort();
  const states     = [...new Set(shows.map(s => s.state).filter(Boolean))].sort();
  const categories = [...new Set(shows.map(s => s.category).filter(Boolean))].sort();

  const [filterYear,     setFilterYear]     = useState("all");
  const [filterCity,     setFilterCity]     = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterState,    setFilterState]    = useState("all");
  const [sortBy,         setSortBy]         = useState("date");

  const filtered = shows.filter(s => {
    if (filterYear     !== "all" && (!s.date || !s.date.startsWith(filterYear))) return false;
    if (filterCity     !== "all" && s.city     !== filterCity)     return false;
    if (filterCategory !== "all" && s.category !== filterCategory) return false;
    if (filterStatus   !== "all" && s.status   !== filterStatus)   return false;
    if (filterState    !== "all" && s.state    !== filterState)    return false;
    return true;
  });

  const completed      = filtered.filter(s => s.status === "complete");
  const totalContacts  = filtered.reduce((a,s) => a + (+s.contactsCollected||0), 0);
  const totalSpend     = filtered.reduce((a,s) => a + (+s.depositPaid||0) + (+s.totalPaid||0), 0);
  const avgContacts    = filtered.length ? (totalContacts / filtered.length).toFixed(1) : 0;
  const costPerContact = totalContacts > 0 ? (totalSpend / totalContacts).toFixed(2) : null;
  const rated          = filtered.filter(s => s.rating);
  const avgRating      = rated.length ? (rated.reduce((a,s) => a + (s.rating||0), 0) / rated.length).toFixed(1) : null;
  const outstanding    = filtered.reduce((a,s) => a + Math.max(0, (+s.totalDue||0) - (+s.depositPaid||0) - (+s.totalPaid||0)), 0);
  const maxContacts    = Math.max(...filtered.map(s => +s.contactsCollected||0), 1);

  const sorted = [...filtered].sort((a,b) => {
    if (sortBy === "contacts") return (+b.contactsCollected||0) - (+a.contactsCollected||0);
    if (sortBy === "cost")     return ((+b.depositPaid||0)+(+b.totalPaid||0)) - ((+a.depositPaid||0)+(+a.totalPaid||0));
    if (sortBy === "cpc") {
      const cA = (+a.contactsCollected||0)>0 ? ((+a.depositPaid||0)+(+a.totalPaid||0))/(+a.contactsCollected) : 9999;
      const cB = (+b.contactsCollected||0)>0 ? ((+b.depositPaid||0)+(+b.totalPaid||0))/(+b.contactsCollected) : 9999;
      return cA - cB;
    }
    return (a.date||"").localeCompare(b.date||"");
  });

  const Sel = ({ value, onChange, children }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ padding:"10px 14px", borderRadius:9, border:"2px solid #EDE6DC", fontSize:14, color:"#1F2937", background:"#fff", outline:"none", cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
      {children}
    </select>
  );

  // 6 KPI cards — no duplicates
  const kpis = [
    { label:"Shows",             value:filtered.length,              icon:"🎪", color:"#1B3A5C", sub:completed.length+" completed" },
    { label:"Contacts Collected",value:totalContacts.toLocaleString(),icon:"🤝", color:"#2563EB", sub:avgContacts+" avg per show" },
    { label:"Cost Per Contact",  value:costPerContact?"$"+costPerContact:"—",icon:"🎯",color:"#059669",sub:costPerContact?"lower is better":"enter contacts to calculate" },
    { label:"Total Show Spend",  value:fmtMoney(totalSpend),         icon:"💸", color:"#B45309", sub:fmtMoney(outstanding)+" outstanding" },
    { label:"Revenue Collected", value:fmtMoney(filtered.reduce((a,s)=>a+(+s.depositPaid||0)+(+s.totalPaid||0),0)), icon:"💰", color:"#7C3AED", sub:"across "+filtered.length+" show"+(filtered.length!==1?"s":"") },
    { label:"Avg Show Rating",   value:avgRating?"★".repeat(Math.round(avgRating))+" "+avgRating:"—", icon:"⭐", color:"#B45309", sub:avgRating?rated.length+" rated show"+(rated.length!==1?"s":""):"rate completed shows" },
  ];

  return (
    <div style={{ padding:isMobile?"16px":"36px 44px", maxWidth:1100 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:isMobile?24:34, fontFamily:"'Playfair Display',serif", color:"#1B3A5C", margin:0 }}>Reports</h1>
        <p style={{ color:"#6B7280", marginTop:6, fontSize:16 }}>Filter and analyze your show program performance.</p>
      </div>
      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #EDE6DC", padding:"18px 22px", marginBottom:28, display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.06em", marginRight:4 }}>Filter by</span>
        <Sel value={filterYear}     onChange={setFilterYear}>     <option value="all">All Years</option>      {years.map(y=><option key={y} value={y}>{y}</option>)}</Sel>
        <Sel value={filterState}    onChange={setFilterState}>    <option value="all">All States</option>     {states.map(s=><option key={s} value={s}>{s}</option>)}</Sel>
        <Sel value={filterCity}     onChange={setFilterCity}>     <option value="all">All Cities</option>     {cities.map(c=><option key={c} value={c}>{c}</option>)}</Sel>
        <Sel value={filterCategory} onChange={setFilterCategory}> <option value="all">All Categories</option> {categories.map(c=><option key={c} value={c}>{c}</option>)}</Sel>
        <Sel value={filterStatus}   onChange={setFilterStatus}>   <option value="all">All Statuses</option>   {STATUS_ORDER.map(k=><option key={k} value={k}>{STATUSES[k].label}</option>)}</Sel>
        {(filterYear!=="all"||filterState!=="all"||filterCity!=="all"||filterCategory!=="all"||filterStatus!=="all") && (
          <button onClick={()=>{setFilterYear("all");setFilterState("all");setFilterCity("all");setFilterCategory("all");setFilterStatus("all");}}
            style={{ padding:"10px 16px", borderRadius:9, border:"2px solid #EDE6DC", background:"#F7F2EB", color:"#6B7280", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Clear Filters
          </button>
        )}
        <span style={{ marginLeft:"auto", fontSize:13, color:"#9CA3AF", fontWeight:600 }}>{filtered.length} show{filtered.length!==1?"s":""} match</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(3,1fr)", gap:12, marginBottom:24 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background:"#fff", borderRadius:16, padding:"20px 18px", border:"2px solid #EDE6DC", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:30, marginBottom:8 }}>{k.icon}</div>
            <div style={{ fontSize:24, fontWeight:700, color:k.color, fontFamily:"'Playfair Display',serif", lineHeight:1.1, marginBottom:4 }}>{k.value}</div>
            <div style={{ fontSize:15, fontWeight:700, color:"#1F2937", marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:13, color:"#6B7280", fontWeight:500 }}>{k.sub}</div>
          </div>
        ))}
      </div>
      {totalContacts > 0 && (
        <div style={{ background:"#fff", borderRadius:16, border:"1px solid #EDE6DC", padding:"22px 24px", marginBottom:24 }}>
          <h3 style={{ margin:"0 0 18px", fontSize:17, color:"#1B3A5C", fontFamily:"'Playfair Display',serif" }}>Contacts Collected by Show</h3>
          {filtered.filter(s=>(+s.contactsCollected||0)>0).sort((a,b)=>(+b.contactsCollected||0)-(+a.contactsCollected||0)).map(show=>{
            const pct = Math.round(((+show.contactsCollected||0)/maxContacts)*100);
            return (
              <div key={show.id} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{show.name}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1B3A5C" }}>{(+show.contactsCollected).toLocaleString()}</span>
                </div>
                <div style={{ height:10, background:"#F3EDE6", borderRadius:5, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:pct+"%", background:STATUSES[show.status].dot, borderRadius:5, transition:"width 0.4s" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ background:"#fff", borderRadius:16, border:"1px solid #EDE6DC", overflow:"hidden" }}>
        <div style={{ padding:"16px 22px", borderBottom:"1px solid #F5EDE3", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ margin:0, fontSize:17, color:"#1B3A5C", fontFamily:"'Playfair Display',serif" }}>Show Breakdown</h3>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13, color:"#9CA3AF", fontWeight:600 }}>Sort by</span>
            <Sel value={sortBy} onChange={setSortBy}>
              <option value="date">Date</option>
              <option value="contacts">Most Contacts</option>
              <option value="cost">Highest Spend</option>
              <option value="cpc">Best Cost/Contact</option>
            </Sel>
          </div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#F7F2EB", borderBottom:"2px solid #EDE6DC" }}>
                {["Show","City","Date","Category","Status","Contacts","Show Cost","Cost / Contact"].map((h,i)=>(
                  <th key={i} style={{ padding:"12px 18px", textAlign:"left", fontSize:14, fontWeight:700, color:"#4B5563", textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(show=>{
                const spend    = (+show.depositPaid||0)+(+show.totalPaid||0);
                const contacts = +show.contactsCollected||0;
                const cpc      = contacts>0 ? (spend/contacts).toFixed(2) : null;
                return (
                  <tr key={show.id} style={{ borderBottom:"1px solid #F5EDE3" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#FAF6F0"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"13px 18px", fontWeight:700, color:"#1F2937", fontSize:14 }}>{show.name}</td>
                    <td style={{ padding:"13px 18px", color:"#4B5563", fontSize:14 }}>{show.city||"—"}</td>
                    <td style={{ padding:"13px 18px", color:"#4B5563", fontSize:13, whiteSpace:"nowrap" }}>{fmtDateRange(show.date, show.endDate)}</td>
                    <td style={{ padding:"13px 18px", color:"#4B5563", fontSize:13 }}>{show.category||"—"}</td>
                    <td style={{ padding:"13px 18px" }}><StatusBadge status={show.status} /></td>
                    <td style={{ padding:"13px 18px", fontWeight:700, color:"#1B3A5C", fontSize:14 }}>{contacts>0?contacts.toLocaleString():<span style={{color:"#D1D5DB"}}>—</span>}</td>
                    <td style={{ padding:"13px 18px", color:"#4B5563", fontSize:14 }}>{spend>0?fmtMoney(spend):<span style={{color:"#D1D5DB"}}>—</span>}</td>
                    <td style={{ padding:"13px 18px", fontWeight:700, fontSize:14, color:cpc?(parseFloat(cpc)<10?"#059669":parseFloat(cpc)<25?"#D97706":"#DC2626"):"#D1D5DB" }}>
                      {cpc?"$"+cpc:"—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Post-Show Survey ──────────────────────────────────────────────────────
function PostShowSurvey({ show, employee, onSubmit, onClose }) {
  const existing = (show.employeeReports||[]).find(r => r.employeeId === employee.id);
  const [leads,        setLeads]        = useState(existing ? String(existing.leadsAcquired) : "");
  const [appointments, setAppointments] = useState(existing ? String(existing.appointmentsBooked) : "");
  const [notes,        setNotes]        = useState(existing ? existing.futureNotes : "");
  function submit() {
    if (leads === "") { alert("Please enter the number of contacts collected (enter 0 if none)."); return; }
    const report = { employeeId:employee.id, employeeName:employee.firstName+" "+employee.lastName,
      leadsAcquired:+leads||0, appointmentsBooked:+appointments||0, futureNotes:notes.trim(), submittedAt:new Date().toISOString() };
    onSubmit({ ...show, employeeReports:[...(show.employeeReports||[]).filter(r=>r.employeeId!==employee.id), report] });
  }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", zIndex:2000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff", borderRadius:"22px 22px 0 0", width:"100%", maxWidth:500, maxHeight:"92vh", overflow:"auto", boxShadow:"0 -8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ background:"#1B3A5C", padding:"22px 26px" }}>
          <h2 style={{ margin:0, color:"#fff", fontFamily:"'Playfair Display',serif", fontSize:22 }}>Post-Show Report</h2>
          <p style={{ margin:"6px 0 0", color:"rgba(255,255,255,0.7)", fontSize:14 }}>{show.name} · {fmtDateRange(show.date, show.endDate)}</p>
        </div>
        <div style={{ padding:"26px 28px" }}>
          {[
            { num:1, q:"How many contacts / leads did you collect?", val:leads,        set:setLeads,        ph:"e.g. 24" },
            { num:2, q:"How many appointments did you book?",        val:appointments, set:setAppointments, ph:"e.g. 3"  },
          ].map(item => (
            <div key={item.num} style={{ marginBottom:22 }}>
              <label style={{ fontSize:16, fontWeight:700, color:"#1B3A5C", display:"flex", alignItems:"center", gap:10, marginBottom:10, lineHeight:1.3 }}>
                <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:28, height:28, borderRadius:"50%", background:"#1B3A5C", color:"#fff", fontSize:13, fontWeight:700, flexShrink:0 }}>{item.num}</span>
                {item.q}
              </label>
              <input type="number" min="0" value={item.val} onChange={e => item.set(e.target.value)} placeholder={item.ph}
                style={{ width:"100%", padding:"14px 16px", borderRadius:10, border:"2px solid #EDE6DC", fontSize:22, fontWeight:700, color:"#1F2937", outline:"none", boxSizing:"border-box", textAlign:"center" }} />
            </div>
          ))}
          <div style={{ marginBottom:26 }}>
            <label style={{ fontSize:16, fontWeight:700, color:"#1B3A5C", display:"flex", alignItems:"center", gap:10, marginBottom:10, lineHeight:1.3 }}>
              <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:28, height:28, borderRadius:"50%", background:"#1B3A5C", color:"#fff", fontSize:13, fontWeight:700, flexShrink:0 }}>3</span>
              Anything we should know for future shows?
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="e.g. Great traffic near the north entrance. Parking is tight — arrive early."
              style={{ width:"100%", padding:"13px 14px", borderRadius:10, border:"2px solid #EDE6DC", fontSize:15, color:"#1F2937", outline:"none", boxSizing:"border-box", resize:"vertical", fontFamily:"'Nunito',sans-serif", lineHeight:1.5 }} />
          </div>
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={submit} style={{ flex:1, padding:"16px", borderRadius:12, border:"none", background:"#1B3A5C", color:"#fff", fontSize:17, fontWeight:700, cursor:"pointer" }}>Submit Report ✓</button>
            <button onClick={onClose} style={{ padding:"16px 20px", borderRadius:12, border:"2px solid #EDE6DC", background:"#fff", color:"#6B7280", fontSize:15, cursor:"pointer", fontWeight:600 }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Employee Portal ───────────────────────────────────────────────────────
function EmployeePortalView({ employees, shows, onUpdateShow, notifTiming }) {
  const [selectedId, setSelectedId] = useState(null);
  const [surveyShow, setSurveyShow] = useState(null);
  const today = new Date(); today.setHours(0,0,0,0);
  const emp = employees.find(e => e.id === selectedId);

  if (!emp) {
    return (
      <div style={{ padding:"60px 20px", display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{ fontSize:52, marginBottom:16 }}>👋</div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", color:"#1B3A5C", fontSize:30, margin:"0 0 8px", textAlign:"center" }}>Employee Portal</h2>
        <p style={{ color:"#6B7280", fontSize:16, marginBottom:36, textAlign:"center" }}>Select your name to view your shows.</p>
        {employees.length === 0
          ? <p style={{ color:"#9CA3AF" }}>No employees added yet.</p>
          : <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:400 }}>
              {employees.map(e => (
                <button key={e.id} onClick={() => setSelectedId(e.id)}
                  style={{ padding:"18px 22px", borderRadius:14, border:"2px solid #EDE6DC", background:"#fff", display:"flex", alignItems:"center", gap:14, cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
                  onMouseEnter={e2 => { e2.currentTarget.style.borderColor="#1B3A5C"; e2.currentTarget.style.background="#F7F2EB"; }}
                  onMouseLeave={e2 => { e2.currentTarget.style.borderColor="#EDE6DC"; e2.currentTarget.style.background="#fff"; }}>
                  <div style={{ width:48, height:48, borderRadius:"50%", background:"#1B3A5C", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:17, flexShrink:0 }}>{e.firstName[0]}{e.lastName[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:17, color:"#1F2937" }}>{e.firstName} {e.lastName}</div>
                    <div style={{ fontSize:13, color:"#6B7280", marginTop:2 }}>{e.phone}</div>
                  </div>
                  <span style={{ fontSize:22, color:"#C4944A" }}>→</span>
                </button>
              ))}
            </div>
        }
      </div>
    );
  }

  const todayStr  = new Date().toISOString().split("T")[0];
  const myShows   = shows.filter(s => (s.assignedEmployees||[]).includes(emp.id));
  const upcoming  = myShows.filter(s => s.status !== "complete" && s.date >= todayStr).sort((a,b) => a.date.localeCompare(b.date));
  const completed = myShows.filter(s => s.status === "complete").sort((a,b) => b.date.localeCompare(a.date));
  const notifications = myShows.filter(s => notifTiming==="assigned" ? s.status!=="complete" : s.status==="countdown");

  return (
    <div style={{ padding:"32px 28px", maxWidth:680, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:30, fontFamily:"'Playfair Display',serif", color:"#1B3A5C", margin:0 }}>Hi, {emp.firstName}! 👋</h1>
          <p style={{ color:"#6B7280", marginTop:5, fontSize:15 }}>Here are your show assignments.</p>
        </div>
        <button onClick={() => setSelectedId(null)} style={{ background:"#F7F2EB", border:"1px solid #EDE6DC", borderRadius:9, padding:"9px 16px", fontSize:13, color:"#6B7280", cursor:"pointer", fontWeight:600 }}>← Switch</button>
      </div>
      {notifications.length > 0 && (
        <div style={{ background:"#FFF1F2", border:"1px solid #FCA5A5", borderRadius:14, padding:"14px 18px", marginBottom:22, display:"flex", gap:12 }}>
          <span style={{ fontSize:22 }}>🔔</span>
          <div>
            <div style={{ fontWeight:700, color:"#991B1B", fontSize:15 }}>
              {notifTiming==="countdown" ? "Final Countdown — Showtime is almost here!" : "You have upcoming show assignments!"}
            </div>
            <div style={{ color:"#6B7280", fontSize:13, marginTop:3 }}>{notifications.map(s=>s.name).join(" · ")}</div>
          </div>
        </div>
      )}
      <h2 style={{ fontSize:19, fontFamily:"'Playfair Display',serif", color:"#1B3A5C", margin:"0 0 14px", display:"flex", alignItems:"center", gap:8 }}>
        📅 Upcoming Shows
        <span style={{ fontSize:13, fontWeight:700, background:"#EFF6FF", color:"#1E40AF", borderRadius:10, padding:"2px 9px" }}>{upcoming.length}</span>
      </h2>
      {upcoming.length === 0
        ? <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EDE6DC", padding:28, textAlign:"center", color:"#9CA3AF", marginBottom:32 }}>No upcoming shows assigned yet.</div>
        : upcoming.map(show => {
            const st = STATUSES[show.status];
            const daysUntil = Math.ceil((new Date(show.date) - today) / (1000*60*60*24));
            const mapsAddr = [show.street, show.city, show.state, show.zip].filter(Boolean).join(", ");
            const mapsUrl  = mapsAddr ? "https://maps.google.com/?q=" + encodeURIComponent(mapsAddr) : null;
            const teammates = (show.assignedEmployees||[]).filter(id=>id!==emp.id).map(id=>employees.find(e=>e.id===id)).filter(Boolean);
            return (
              <div key={show.id} style={{ background:"#fff", borderRadius:14, border:"1px solid #EDE6DC", borderLeft:"4px solid "+st.dot, padding:"18px 20px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:17, color:"#1F2937" }}>{show.name}</div>
                    {show.category && <div style={{ fontSize:13, color:"#9CA3AF", marginTop:3 }}>{show.category}</div>}
                  </div>
                  <StatusBadge status={show.status} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                  <div style={{ background:"#F7F2EB", borderRadius:9, padding:"10px 14px" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>Date</div>
                    <div style={{ fontSize:15, fontWeight:700, color:"#1F2937" }}>{fmtDateRange(show.date, show.endDate)}</div>
                    {daysUntil >= 0 && daysUntil <= 30 && (
                      <div style={{ fontSize:12, fontWeight:700, marginTop:3, color:daysUntil<=3?"#DC2626":daysUntil<=7?"#D97706":"#059669" }}>
                        {daysUntil===0?"🚨 TODAY":daysUntil===1?"⚠️ Tomorrow":daysUntil+" days away"}
                      </div>
                    )}
                  </div>
                  <div style={{ background:"#F7F2EB", borderRadius:9, padding:"10px 14px" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>Time</div>
                    <div style={{ fontSize:15, fontWeight:700, color:"#1F2937" }}>{show.startTime||"TBD"} – {show.endTime||"TBD"}</div>
                  </div>
                </div>
                {mapsAddr && (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#EFF6FF", borderRadius:9, padding:"10px 14px", marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", marginBottom:2 }}>Location</div>
                      <div style={{ fontSize:13, color:"#374151", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{mapsAddr}</div>
                    </div>
                    {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer"
                      style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:13, color:"#2563EB", fontWeight:700, textDecoration:"none", background:"#fff", border:"1px solid #93C5FD", borderRadius:7, padding:"7px 13px", whiteSpace:"nowrap", flexShrink:0, marginLeft:12 }}>
                      📍 Directions
                    </a>}
                  </div>
                )}
                {show.needToKnow && (
                  <div style={{ background:"#FFFBEB", border:"1px solid #FCD34D", borderLeft:"4px solid #F59E0B", borderRadius:9, padding:"11px 14px", marginBottom:10 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#B45309", textTransform:"uppercase", marginBottom:5 }}>📌 Need to Know</div>
                    <p style={{ margin:0, fontSize:14, color:"#1F2937", lineHeight:1.55, whiteSpace:"pre-wrap" }}>{show.needToKnow}</p>
                  </div>
                )}
                {teammates.length > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:12, color:"#9CA3AF", fontWeight:600 }}>Team:</span>
                    {teammates.map(t => <span key={t.id} style={{ fontSize:12, background:"#F3F4F6", color:"#374151", borderRadius:10, padding:"3px 10px", fontWeight:600 }}>{t.firstName} {t.lastName}</span>)}
                  </div>
                )}
              </div>
            );
          })
      }
      <h2 style={{ fontSize:19, fontFamily:"'Playfair Display',serif", color:"#1B3A5C", margin:"24px 0 14px", display:"flex", alignItems:"center", gap:8 }}>
        ✅ Completed Shows
        <span style={{ fontSize:13, fontWeight:700, background:"#ECFDF5", color:"#065F46", borderRadius:10, padding:"2px 9px" }}>{completed.length}</span>
      </h2>
      {completed.length === 0
        ? <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EDE6DC", padding:28, textAlign:"center", color:"#9CA3AF" }}>No completed shows yet.</div>
        : completed.map(show => {
            const report = (show.employeeReports||[]).find(r => r.employeeId===emp.id);
            return (
              <div key={show.id} style={{ background:"#fff", borderRadius:14, border:"1px solid #EDE6DC", padding:"15px 20px", marginBottom:10, display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"#1F2937" }}>{show.name}</div>
                  <div style={{ fontSize:13, color:"#6B7280", marginTop:2 }}>{fmtDateRange(show.date, show.endDate)}</div>
                  {report && <div style={{ fontSize:12, color:"#059669", marginTop:4, fontWeight:700 }}>{report.leadsAcquired} contacts · {report.appointmentsBooked} appointments booked</div>}
                </div>
                {report
                  ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <span style={{ fontSize:22 }}>✅</span>
                      <span style={{ fontSize:13, color:"#059669", fontWeight:700 }}>Submitted</span>
                      <button onClick={() => setSurveyShow(show)} style={{ fontSize:13, color:"#9CA3AF", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Edit</button>
                    </div>
                  : <button onClick={() => setSurveyShow(show)} style={{ background:"#1B3A5C", color:"#fff", border:"none", borderRadius:10, padding:"11px 16px", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                      📋 File Report
                    </button>
                }
              </div>
            );
          })
      }
      {surveyShow && <PostShowSurvey show={surveyShow} employee={emp} onSubmit={s=>{onUpdateShow(s);setSurveyShow(null);}} onClose={()=>setSurveyShow(null)} />}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard", label:"Dashboard",       icon:"🏠" },
  { id:"calendar",  label:"Calendar",        icon:"📅" },
  { id:"shows",     label:"All Shows",       icon:"🎪" },
  { id:"pipeline",  label:"Pipeline",        icon:"📋" },
  { id:"reports",   label:"Reports",         icon:"📊" },
  { id:"portal",    label:"Employee Portal", icon:"👤" },
  { id:"employees", label:"Employees",       icon:"👥" },
];

export default function App() {
  const isMobile = useMobile();
  const [user,        setUser]        = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view,        setView]        = useState("dashboard");
  const [shows,       setShows]       = useState(SAMPLE_SHOWS);
  const [employees,   setEmployees]   = useState(SAMPLE_EMPLOYEES);
  const [showForm,    setShowForm]    = useState(false);
  const [editingShow, setEditing]     = useState(null);
  const [viewingShow, setViewing]     = useState(null);
  const [loaded,      setLoaded]      = useState(false);
  const [locationName,  setLocationName]  = useState("Five Star Bath Solutions");
  const [notifTiming,   setNotifTiming]   = useState("countdown");
  const [editingName,   setEditingName]   = useState(false);
  const [nameInput,     setNameInput]     = useState("");

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load data when user logs in ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from("user_data")
          .select("shows, employees, location_name, notif_timing")
          .single();
        if (!error && data) {
          if (data.shows)         setShows(data.shows.map(applyAutoStatus));
          if (data.employees)     setEmployees(data.employees);
          if (data.location_name) setLocationName(data.location_name);
          if (data.notif_timing)  setNotifTiming(data.notif_timing);
          setLoaded(true);
          return;
        }
      } catch (e) {}
      // Fallback: localStorage
      try {
        const ver = localStorage.getItem("schema_version");
        if (!ver || ver !== "10") {
          localStorage.removeItem("shows_data");
          localStorage.setItem("schema_version", "10");
        } else {
          const sr = localStorage.getItem("shows_data");
          if (sr) setShows(JSON.parse(sr).map(applyAutoStatus));
        }
        const er = localStorage.getItem("employees_data");
        if (er) setEmployees(JSON.parse(er));
        const lr = localStorage.getItem("location_name");
        if (lr) setLocationName(lr);
        const nr = localStorage.getItem("notif_timing");
        if (nr) setNotifTiming(nr);
      } catch (e) {}
      setLoaded(true);
    }
    loadData();
  }, [user]);

  // ── Save data (debounced) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded || !user) return;
    const timer = setTimeout(() => {
      localStorage.setItem("shows_data",      JSON.stringify(shows));
      localStorage.setItem("employees_data",  JSON.stringify(employees));
      localStorage.setItem("location_name",   locationName);
      localStorage.setItem("notif_timing",    notifTiming);
      supabase.from("user_data").upsert(
        { id:user.id, shows, employees, location_name:locationName, notif_timing:notifTiming },
        { onConflict:"id" }
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [shows, employees, locationName, notifTiming, loaded, user]);

  // ── Show actions ──────────────────────────────────────────────────────────
  function saveShow(show) {
    const s = applyAutoStatus(show);
    setShows(prev => { const ex = prev.find(sh => sh.id === s.id); return ex ? prev.map(sh => sh.id===s.id?s:sh) : [...prev, s]; });
    setShowForm(false); setEditing(null);
  }
  function duplicateShow(show) {
    const copy = { ...show, id:genId(), name:show.name+" (Copy)", status:"lead",
      date:"", depositPaid:0, depositPaidDate:"", depositDueDate:"",
      totalPaid:0, totalPaidDate:"", finalPaymentDueDate:"",
      assignedEmployees:[], employeeReports:[], communications:[], checklist:[], contactsCollected:"",
      rating:null, ratingNotes:"", inventory:(show.inventory||[]).map(i=>({...i,packed:false})) };
    setEditing(copy); setViewing(null); setShowForm(true);
  }
  function updateShow(show) {
    const s = applyAutoStatus(show);
    setShows(prev => prev.map(sh => sh.id===s.id?s:sh));
    setViewing(s);
  }
  function openAdd()        { setEditing(null);  setShowForm(true); }
  function openEdit(show)   { setEditing(show);  setViewing(null);  setShowForm(true); }

  // ── Loading / Login guards ────────────────────────────────────────────────
  if (authLoading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#F7F2EB" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:52, marginBottom:16 }}>⭐</div>
        <p style={{ color:"#1B3A5C", fontSize:18, fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>Loading…</p>
      </div>
    </div>
  );

  if (!user) return <LoginScreen />;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Nunito:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; font-family:'Nunito',sans-serif; }
        input:focus, select:focus { border-color:#1B3A5C !important; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#CFC6BB; border-radius:3px; }
        @media (max-width:767px) { input, select, textarea { font-size:16px !important; } }
      `}</style>
      <div style={{ display:"flex", height:"100vh", background:"#F7F2EB", overflow:"hidden" }}>

        {/* ── Sidebar (desktop only) ── */}
        {!isMobile && (
          <div style={{ width:238, background:"#1B3A5C", color:"#fff", display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto" }}>
            <div style={{ padding:"26px 22px 18px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#C4944A", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:5 }}>Show Manager</div>
              {editingName ? (
                <div>
                  <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const n = nameInput.trim() || "Five Star Bath Solutions";
                        setLocationName(n);
                        localStorage.setItem("location_name", n);
                        setEditingName(false);
                      }
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    style={{ width:"100%", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:6, padding:"6px 8px", color:"#fff", fontSize:14, fontFamily:"'Nunito',sans-serif", outline:"none", boxSizing:"border-box" }} />
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)", marginTop:4 }}>Enter to save · Esc to cancel</div>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"flex-start", gap:6, cursor:"pointer" }}
                  onClick={() => { setNameInput(locationName); setEditingName(true); }} title="Click to edit">
                  <div style={{ fontSize:18, fontWeight:700, fontFamily:"'Playfair Display',serif", lineHeight:1.25, flex:1 }}>{locationName}</div>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,0.35)", marginTop:2, flexShrink:0 }}>✏️</span>
                </div>
              )}
            </div>
            <nav style={{ padding:"14px 10px", flex:1 }}>
              {NAV.map(item => {
                const active = view === item.id;
                return (
                  <button key={item.id} onClick={() => setView(item.id)} style={{
                    width:"100%", display:"flex", alignItems:"center", gap:12, padding:"14px 16px",
                    borderRadius:10, border:"none", marginBottom:3,
                    background: active ? "rgba(196,148,74,0.18)" : "transparent",
                    color: active ? "#C4944A" : "rgba(255,255,255,0.72)",
                    fontWeight: active ? 700 : 500, fontSize:16, cursor:"pointer",
                    borderLeft: active ? "3px solid #C4944A" : "3px solid transparent",
                    textAlign:"left", transition:"all 0.15s" }}>
                    <span style={{ fontSize:20 }}>{item.icon}</span>{item.label}
                  </button>
                );
              })}
            </nav>
            <div style={{ padding:"16px 14px 26px", display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={openAdd}
                style={{ width:"100%", padding:"15px", borderRadius:12, border:"2px solid #C4944A", background:"transparent", color:"#C4944A", fontSize:15, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background="#C4944A"; e.currentTarget.style.color="#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#C4944A"; }}>
                <span style={{ fontSize:22, lineHeight:1 }}>+</span> New Show
              </button>
              <button onClick={() => supabase.auth.signOut()}
                style={{ width:"100%", padding:"11px", borderRadius:12, border:"1px solid rgba(255,255,255,0.2)", background:"transparent", color:"rgba(255,255,255,0.5)", fontSize:14, cursor:"pointer", transition:"all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color="#fff"; e.currentTarget.style.borderColor="rgba(255,255,255,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.color="rgba(255,255,255,0.5)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.2)"; }}>
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* ── Main content ── */}
        <div style={{ flex:1, overflowY:"auto", paddingBottom:isMobile?"72px":0 }}>
          {view==="dashboard" && <DashboardView shows={shows} setView={setView} onAddShow={openAdd} onViewShow={s=>setViewing(s)} isMobile={isMobile} />}
          {view==="shows"     && <ShowsListView shows={shows} onAddShow={openAdd} onViewShow={s=>setViewing(s)} onDeleteShow={id=>setShows(p=>p.filter(s=>s.id!==id))} onImportShows={imported=>setShows(p=>[...p,...imported])} isMobile={isMobile} />}
          {view==="pipeline"  && <PipelineView shows={shows} onUpdateShow={updateShow} onViewShow={s=>setViewing(s)} />}
          {view==="reports"   && <ReportsView shows={shows} isMobile={isMobile} />}
          {view==="calendar"  && <CalendarView shows={shows} onViewShow={s=>setViewing(s)} />}
          {view==="employees" && <EmployeesView employees={employees} shows={shows}
            onUpdateEmployee={emp=>setEmployees(p=>p.map(e=>e.id===emp.id?emp:e))}
            onAddEmployee={emp=>setEmployees(p=>[...p,emp])}
            onDeleteEmployee={id=>setEmployees(p=>p.filter(e=>e.id!==id))}
            notifTiming={notifTiming} onChangeNotifTiming={t=>setNotifTiming(t)} />}
          {view==="portal"    && <EmployeePortalView employees={employees} shows={shows} onUpdateShow={updateShow} notifTiming={notifTiming} />}
        </div>
      </div>

      {showForm && <ShowFormModal show={editingShow} employees={employees} onSave={saveShow} onClose={()=>{setShowForm(false);setEditing(null);}} />}
      {isMobile && <BottomNav view={view} setView={setView} onAddShow={openAdd} />}
      {viewingShow && !showForm && (
        <ShowDetailModal
          show={viewingShow}
          employees={employees}
          onEdit={() => openEdit(viewingShow)}
          onClose={() => setViewing(null)}
          onUpdateShow={updateShow}
          onDuplicate={() => duplicateShow(viewingShow)}
          userId={user?.id}
        />
      )}
    </>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
function DashboardView({ shows, setView, onAddShow, onViewShow, isMobile }) {
  const today = new Date().toISOString().split("T")[0];
  const upcoming = shows.filter(s => s.date >= today && s.status !== "complete")
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const stats = [
    { label:"Total Shows",       value: shows.length,                                                          icon:"🎪", color:"#1B3A5C" },
    { label:"Upcoming Shows",    value: shows.filter(s => s.date >= today && s.status !== "complete").length,  icon:"📅", color:"#2563EB" },
    { label:"Completed",         value: shows.filter(s => s.status === "complete").length,                     icon:"✅", color:"#059669" },
    { label:"Revenue Collected", value: fmtMoney(shows.filter(s => s.status === "complete").reduce((a,s) => a + (+s.totalPaid||0), 0)), icon:"💰", color:"#B45309" },
  ];
  return (
    <div style={{ padding: isMobile ? "20px 16px" : "36px 44px", maxWidth:1100 }}>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:34, fontFamily:"'Playfair Display',serif", color:"#1B3A5C", margin:0 }}>Welcome Back, Kathy! 👋</h1>
        <p style={{ color:"#6B7280", marginTop:6, fontSize:17 }}>Here's your shows & events program at a glance.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap:16, marginBottom:28 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background:"#fff", borderRadius:18, padding:"26px 22px", border:"2px solid #EDE6DC", boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>{s.icon}</div>
            <div style={{ fontSize:34, fontWeight:700, color:s.color, fontFamily:"'Playfair Display',serif" }}>{s.value}</div>
            <div style={{ fontSize:16, color:"#374151", marginTop:6, fontWeight:700 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap:20 }}>
        <div style={{ background:"#fff", borderRadius:18, border:"1px solid #EDE6DC", overflow:"hidden" }}>
          <div style={{ padding:"18px 24px", borderBottom:"1px solid #F5EDE3", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h2 style={{ margin:0, fontSize:20, color:"#1B3A5C", fontFamily:"'Playfair Display',serif" }}>Upcoming Shows</h2>
            <button onClick={() => setView("shows")} style={{ background:"none", border:"none", color:"#C4944A", fontWeight:700, fontSize:14, cursor:"pointer" }}>View All →</button>
          </div>
          {upcoming.length === 0
            ? <div style={{ padding:40, textAlign:"center", color:"#9CA3AF", fontSize:16 }}>No upcoming shows yet. Add one!</div>
            : upcoming.map(show => (
              <div key={show.id} onClick={() => onViewShow(show)}
                style={{ padding:"15px 24px", borderBottom:"1px solid #F5EDE3", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background="#FAF6F0"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <div>
                  <div style={{ fontWeight:700, color:"#1F2937", fontSize:16 }}>{show.name}</div>
                  <div style={{ color:"#6B7280", fontSize:14, marginTop:2 }}>{fmtDateRange(show.date, show.endDate)} · {show.startTime}–{show.endTime}</div>
                </div>
                <StatusBadge status={show.status} />
              </div>
            ))
          }
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ background:"#fff", borderRadius:18, border:"1px solid #EDE6DC", padding:"22px 24px" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:16, color:"#1B3A5C", fontFamily:"'Playfair Display',serif" }}>Status Guide</h3>
            {STATUS_ORDER.map(k => {
              const s = STATUSES[k], count = shows.filter(sh => sh.status === k).length;
              return (
                <div key={k} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:14, height:14, borderRadius:"50%", background:s.dot, flexShrink:0 }} />
                    <span style={{ fontSize:15, color:"#1F2937", fontWeight:600 }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize:15, fontWeight:700, color:"#1B3A5C" }}>{count}</span>
                </div>
              );
            })}
          </div>
          <button onClick={onAddShow}
            style={{ background:"#1B3A5C", color:"#fff", border:"none", borderRadius:18, padding:"22px 24px", fontSize:18, fontWeight:700, cursor:"pointer", fontFamily:"'Playfair Display',serif", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}
            onMouseEnter={e => e.currentTarget.style.background="#243F66"}
            onMouseLeave={e => e.currentTarget.style.background="#1B3A5C"}>
            <span style={{ fontSize:26, lineHeight:1 }}>+</span> Add New Show
          </button>
        </div>
      </div>
    </div>
  );
}
