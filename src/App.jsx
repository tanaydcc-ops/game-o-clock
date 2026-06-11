import { useState, useEffect } from "react";

const SLOTS = [
  "6:00 AM – 7:30 AM","7:30 AM – 9:00 AM","9:00 AM – 10:30 AM",
  "10:30 AM – 12:00 PM","12:00 PM – 1:30 PM","1:30 PM – 3:00 PM",
  "3:00 PM – 4:30 PM","4:30 PM – 6:00 PM","6:00 PM – 7:30 PM",
  "7:30 PM – 9:00 PM","9:00 PM – 10:30 PM","10:30 PM – 12:00 AM",
  "12:00 AM – 1:30 AM",
];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const INIT_BOOKINGS = [
  {id:1,name:"Epic",phone:"01933698668",area:"Omorpur",date:"2026-06-11",slot:"7:30 PM – 9:00 PM",adv:1000,total:1800},
  {id:2,name:"Jubayer Munshipara",phone:"",area:"Munshipara",date:"2026-06-11",slot:"7:30 PM – 9:00 PM",adv:0,total:1800},
  {id:3,name:"Rifat (Amtola)",phone:"",area:"Amtola",date:"2026-06-11",slot:"9:00 PM – 10:30 PM",adv:1800,total:1800},
  {id:4,name:"Al Amin Progress Apparels",phone:"01716283354",area:"",date:"2026-06-10",slot:"7:30 PM – 9:00 PM",adv:500,total:1800},
  {id:5,name:"Joynal Abedin (Hujur)",phone:"01939357482",area:"Omorpur",date:"2026-06-10",slot:"10:30 PM – 12:00 AM",adv:300,total:2000},
  {id:6,name:"Hamza",phone:"",area:"",date:"2026-06-09",slot:"10:30 PM – 12:00 AM",adv:1400,total:1400},
  {id:7,name:"Rabbi (Amtola)",phone:"01624456973",area:"Amtola",date:"2026-06-12",slot:"7:30 PM – 9:00 PM",adv:0,total:2100},
  {id:8,name:"Yamin Munshipara",phone:"",area:"Munshipara",date:"2026-06-12",slot:"7:30 PM – 9:00 PM",adv:0,total:1800},
  {id:9,name:"rofiq",phone:"01909231487",area:"",date:"2026-06-13",slot:"7:30 PM – 9:00 PM",adv:1500,total:2000},
  {id:10,name:"Sadman Sailogate",phone:"01780464956",area:"Silogate",date:"2026-06-14",slot:"6:00 PM – 7:30 PM",adv:0,total:2000},
  {id:11,name:"Madrasha",phone:"01710185807",area:"",date:"2026-01-22",slot:"9:00 AM – 10:30 AM",adv:1500,total:1500},
  {id:12,name:"nafiul",phone:"01835871411",area:"",date:"2026-01-20",slot:"6:00 PM – 7:30 PM",adv:1750,total:1750},
  {id:13,name:"Rabbi (Amtola)",phone:"01624456973",area:"Amtola",date:"2026-01-24",slot:"7:30 PM – 9:00 PM",adv:2100,total:2100},
];

const green = "#1D9E75";
const lightGreen = "#E1F5EE";
const amber = "#BA7517";
const lightAmber = "#FAEEDA";

const T = {
  en: {
    appName:"Game O'clock",tagline:"Slot Booking",
    dashboard:"Dashboard",book:"Book Slot",bookings:"Bookings",payments:"Payments",
    todayBookings:"Today's bookings",thisMonth:"This month",totalDue:"Total due",slotsFilled:"Slots filled",
    weeklyEarnings:"Weekly earnings",upcomingToday:"Upcoming today",
    chooseDate:"Choose a date",availSlots:"Available slots",
    available:"Available",booked:"Booked",
    continue:"Continue →",yourDetails:"Your details",
    name:"Name",mobile:"Mobile number",area:"Area / reference",advance:"Advance (৳)",totalPrice:"Total price (৳)",
    back:"← Back",reviewBooking:"Review booking →",confirmBooking:"Confirm booking",
    confirmTitle:"Review your booking",date:"Date",slotLabel:"Slot",advancePaid:"Advance paid",dueOnArrival:"Due on arrival",
    confirm:"✓ Confirm",allBookings:"All bookings",
    all:"All",today:"Today",upcoming:"Upcoming",hasDue:"Has due",
    paid:"Paid",partial:"Partial",due:"Due",
    paymentTracker:"Payment tracker",collected:"Collected",pendingDues:"Pending dues",expenses:"Expenses",
    markPaid:"Mark paid",recentPayments:"Recent payments",
    noBookings:"No bookings found.",
  },
  bn: {
    appName:"গেম ও'ক্লক",tagline:"স্লট বুকিং",
    dashboard:"ড্যাশবোর্ড",book:"স্লট বুক",bookings:"বুকিং",payments:"পেমেন্ট",
    todayBookings:"আজকের বুকিং",thisMonth:"এই মাসে",totalDue:"মোট বাকি",slotsFilled:"স্লট পূর্ণ",
    weeklyEarnings:"সাপ্তাহিক আয়",upcomingToday:"আজকের আসন্ন",
    chooseDate:"তারিখ বেছে নিন",availSlots:"উপলব্ধ স্লট",
    available:"খালি",booked:"বুকড",
    continue:"পরবর্তী →",yourDetails:"আপনার তথ্য",
    name:"নাম",mobile:"মোবাইল নম্বর",area:"এলাকা / রেফারেন্স",advance:"অগ্রিম (৳)",totalPrice:"মোট মূল্য (৳)",
    back:"← পিছনে",reviewBooking:"বুকিং দেখুন →",confirmBooking:"বুকিং নিশ্চিত করুন",
    confirmTitle:"বুকিং পর্যালোচনা",date:"তারিখ",slotLabel:"স্লট",advancePaid:"অগ্রিম পরিশোধ",dueOnArrival:"আসার সময় বাকি",
    confirm:"✓ নিশ্চিত করুন",allBookings:"সব বুকিং",
    all:"সব",today:"আজকে",upcoming:"আসন্ন",hasDue:"বাকি আছে",
    paid:"পরিশোধিত",partial:"আংশিক",due:"বাকি",
    paymentTracker:"পেমেন্ট ট্র্যাকার",collected:"সংগ্রহিত",pendingDues:"বকেয়া",expenses:"খরচ",
    markPaid:"পরিশোধ করুন",recentPayments:"সাম্প্রতিক পেমেন্ট",
    noBookings:"কোনো বুকিং নেই।",
  }
};

const WEEKLY = [
  {w:"Jan 19",v:7050},{w:"Jan 20",v:7300},{w:"Jan 21",v:7600},
  {w:"Jan 22",v:5300},{w:"Jan 23",v:6550},{w:"Jan 24",v:12480},{w:"Jan 25",v:6000},
];

function fmt(n){return "৳ "+n.toLocaleString();}

function statusOf(b){
  if(b.adv>=b.total) return "paid";
  if(b.adv>0) return "partial";
  return "due";
}

function getDateLabel(dateStr, t){
  const today = new Date("2026-06-11");
  const d = new Date(dateStr);
  const diff = Math.round((d - today)/(1000*60*60*24));
  if(diff===0) return t.today;
  if(diff===1) return "Tomorrow";
  if(diff===-1) return "Yesterday";
  if(diff>1) return `${DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;
  return dateStr;
}

export default function App() {
  const [lang, setLang] = useState("en");
  const [page, setPage] = useState("dashboard");
  const [bookings, setBookings] = useState(INIT_BOOKINGS);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);
  // booking form
  const [step, setStep] = useState(1);
  const [selDate, setSelDate] = useState("2026-06-11");
  const [selSlot, setSelSlot] = useState(null);
  const [form, setForm] = useState({name:"",phone:"",area:"",adv:"0",total:"1800"});
  const t = T[lang];

  useEffect(()=>{
    if(toast){const id=setTimeout(()=>setToast(null),2500);return()=>clearTimeout(id);}
  },[toast]);

  function getDateOptions(){
    const base = new Date("2026-06-11");
    return Array.from({length:7},(_,i)=>{
      const d = new Date(base);d.setDate(base.getDate()+i);
      const yyyy=d.getFullYear();
      const mm=String(d.getMonth()+1).padStart(2,'0');
      const dd=String(d.getDate()).padStart(2,'0');
      return {value:`${yyyy}-${mm}-${dd}`,label:i===0?t.today:i===1?"Tomorrow":`${DAYS[d.getDay()]} ${d.getDate()}`};
    });
  }

  function getBookedSlots(date){
    return bookings.filter(b=>b.date===date).map(b=>b.slot);
  }

  function filteredBookings(){
    const today="2026-06-11";
    if(filter==="today") return bookings.filter(b=>b.date===today);
    if(filter==="upcoming") return bookings.filter(b=>b.date>today);
    if(filter==="due") return bookings.filter(b=>statusOf(b)!=="paid");
    return bookings;
  }

  function handleConfirm(){
    const adv=parseInt(form.adv)||0;
    const total=parseInt(form.total)||1800;
    const newB={
      id:bookings.length+1,name:form.name,phone:form.phone,area:form.area,
      date:selDate,slot:selSlot,adv,total
    };
    setBookings([...bookings,newB]);
    setToast(`✓ ${t.confirmBooking}!`);
    setStep(1);setSelSlot(null);setForm({name:"",phone:"",area:"",adv:"0",total:"1800"});
    setPage("bookings");setFilter("all");
  }

  function markPaid(id){
    setBookings(bookings.map(b=>b.id===id?{...b,adv:b.total}:b));
    setToast("✓ Payment recorded");
  }

  const todayBks = bookings.filter(b=>b.date==="2026-06-11");
  const totalDue = bookings.reduce((s,b)=>s+(b.total-b.adv),0);
  const totalCollected = bookings.reduce((s,b)=>s+b.adv,0);
  const maxW = Math.max(...WEEKLY.map(d=>d.v));

  const navStyle = (p) => ({
    padding:"8px 12px",background:"transparent",border:"none",
    borderBottom: page===p ? `2px solid ${green}` : "2px solid transparent",
    color: page===p ? green : "#888",fontWeight:page===p?"500":"400",
    cursor:"pointer",fontSize:"13px",display:"flex",alignItems:"center",gap:5,
    marginBottom:"-1px",whiteSpace:"nowrap",
  });

  const btnPrimary = {
    background:green,color:"#fff",border:"none",borderRadius:8,
    padding:"10px 18px",fontSize:14,fontWeight:"500",cursor:"pointer",width:"100%",
  };
  const btnOutline = {
    background:"transparent",border:"0.5px solid #ccc",borderRadius:8,
    padding:"9px 16px",fontSize:13,cursor:"pointer",color:"inherit",
  };

  const card = {
    background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,
    padding:"1rem 1.25rem",marginBottom:12,
  };

  const statCard = {
    background:"#f7f7f5",borderRadius:8,padding:"0.875rem 1rem",flex:1,
  };

  function StatusBadge({status}){
    const styles={
      paid:{background:lightGreen,color:"#0F6E56"},
      partial:{background:"#FAEEDA",color:"#854F0B"},
      due:{background:"#FCEBEB",color:"#A32D2D"},
    };
    return <span style={{...styles[status],fontSize:11,padding:"2px 7px",borderRadius:4}}>
      {t[status]}
    </span>;
  }

  function BookingRow({b,showMarkPaid}){
    const due=b.total-b.adv;
    const s=statusOf(b);
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"10px 0",borderBottom:"0.5px solid #eee"}}>
        <div>
          <div style={{fontSize:14,fontWeight:500}}>{b.name}</div>
          <div style={{fontSize:12,color:"#888",marginTop:2}}>
            {getDateLabel(b.date,t)} · {b.slot}{b.area?` · ${b.area}`:""}
            {b.phone?<span> · <a href={"tel:"+b.phone} style={{color:green}}>{b.phone}</a></span>:null}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
          {s==="paid"
            ? <div style={{fontSize:14,fontWeight:500,color:green}}>{fmt(b.total)}</div>
            : <div style={{fontSize:14,fontWeight:500,color:amber}}>{fmt(due)} {t.due}</div>
          }
          <div style={{marginTop:3,display:"flex",gap:4,justifyContent:"flex-end",alignItems:"center"}}>
            <StatusBadge status={s}/>
            {showMarkPaid && s!=="paid" &&
              <button onClick={()=>markPaid(b.id)} style={{
                ...btnOutline,padding:"2px 8px",fontSize:11,background:lightGreen,
                color:"#0F6E56",border:"none",borderRadius:4,cursor:"pointer",marginLeft:2
              }}>{t.markPaid}</button>
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{maxWidth:680,margin:"0 auto",padding:"0 0 2rem",fontFamily:"system-ui,sans-serif",fontSize:14,color:"#222"}}>

      {/* Topbar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"1rem 0 1rem",borderBottom:"0.5px solid #eee",marginBottom:"1rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{background:green,color:"#fff",borderRadius:6,padding:"3px 8px",fontSize:13,fontWeight:500}}>⚽</span>
          <span style={{fontSize:18,fontWeight:500}}>{t.appName}</span>
          <span style={{fontSize:12,color:"#aaa"}}>{t.tagline}</span>
        </div>
        <div style={{display:"flex",border:"0.5px solid #e0e0e0",borderRadius:8,overflow:"hidden"}}>
          {["en","bn"].map(l=>(
            <button key={l} onClick={()=>setLang(l)} style={{
              padding:"4px 12px",fontSize:12,cursor:"pointer",border:"none",
              background:lang===l?"#f0f0ee":"transparent",
              fontWeight:lang===l?"500":"400",color:lang===l?"#222":"#888",
            }}>{l==="en"?"EN":"বাং"}</button>
          ))}
        </div>
      </div>

      {/* Nav */}
      <div style={{display:"flex",borderBottom:"1px solid #eee",marginBottom:"1.25rem",overflowX:"auto"}}>
        {[
          {key:"dashboard",icon:"📊"},
          {key:"book",icon:"📅"},
          {key:"bookings",icon:"📋"},
          {key:"payments",icon:"💳"},
        ].map(({key,icon})=>(
          <button key={key} onClick={()=>{setPage(key);if(key==="book"){setStep(1);setSelSlot(null);}}}
            style={navStyle(key)}>
            <span>{icon}</span><span>{t[key]}</span>
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {page==="dashboard" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            <div style={statCard}><div style={{fontSize:12,color:"#888",marginBottom:4}}>{t.todayBookings}</div>
              <div style={{fontSize:22,fontWeight:500}}>{todayBks.length}</div></div>
            <div style={statCard}><div style={{fontSize:12,color:"#888",marginBottom:4}}>{t.thisMonth}</div>
              <div style={{fontSize:20,fontWeight:500,color:green}}>৳ 52,480</div></div>
            <div style={statCard}><div style={{fontSize:12,color:"#888",marginBottom:4}}>{t.totalDue}</div>
              <div style={{fontSize:20,fontWeight:500,color:amber}}>{fmt(totalDue)}</div></div>
            <div style={statCard}><div style={{fontSize:12,color:"#888",marginBottom:4}}>{t.slotsFilled}</div>
              <div style={{fontSize:22,fontWeight:500}}>76%</div></div>
          </div>

          <div style={card}>
            <div style={{fontSize:15,fontWeight:500,marginBottom:12}}>{t.weeklyEarnings}</div>
            {WEEKLY.map(d=>(
              <div key={d.w} style={{display:"flex",alignItems:"center",padding:"5px 0",gap:10}}>
                <div style={{fontSize:12,color:"#888",width:52,flexShrink:0}}>{d.w}</div>
                <div style={{flex:1,height:8,background:"#f0f0ee",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.round(d.v/maxW*100)}%`,background:green,borderRadius:4}}/>
                </div>
                <div style={{fontSize:12,fontWeight:500,width:58,textAlign:"right"}}>৳ {d.v.toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{fontSize:15,fontWeight:500,marginBottom:4}}>{t.upcomingToday}</div>
            {todayBks.slice(0,4).map(b=><BookingRow key={b.id} b={b} showMarkPaid={false}/>)}
          </div>
        </div>
      )}

      {/* BOOK SLOT */}
      {page==="book" && (
        <div>
          {/* Step indicator */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:20}}>
            {[1,2,3].map((n,i)=>(
              <>
                <div key={n} style={{
                  width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:12,fontWeight:500,flexShrink:0,
                  background:step>n?green:step===n?"#f0f0ee":"transparent",
                  color:step>n?"#fff":step===n?"#222":"#aaa",
                  border:`0.5px solid ${step>n?green:step===n?"#ccc":"#e0e0e0"}`,
                }}>{step>n?"✓":n}</div>
                {i<2 && <div key={"l"+n} style={{flex:1,height:1,background:"#eee"}}/>}
              </>
            ))}
          </div>

          {step===1 && (
            <div>
              <div style={{fontSize:15,fontWeight:500,marginBottom:10}}>{t.chooseDate}</div>
              <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
                {getDateOptions().map(d=>(
                  <button key={d.value} onClick={()=>{setSelDate(d.value);setSelSlot(null);}} style={{
                    padding:"6px 14px",borderRadius:20,fontSize:13,cursor:"pointer",whiteSpace:"nowrap",
                    border:`0.5px solid ${selDate===d.value?green:"#e0e0e0"}`,
                    background:selDate===d.value?green:"transparent",
                    color:selDate===d.value?"#fff":"#666",fontWeight:selDate===d.value?"500":"400",
                  }}>{d.label}</button>
                ))}
              </div>
              <div style={{fontSize:15,fontWeight:500,marginBottom:10}}>{t.availSlots}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {SLOTS.map(s=>{
                  const taken=getBookedSlots(selDate).includes(s);
                  const isSel=selSlot===s;
                  return (
                    <div key={s} onClick={()=>!taken&&setSelSlot(s)} style={{
                      border:`${isSel?"1.5px":"0.5px"} solid ${isSel?green:taken?"#eee":"#e0e0e0"}`,
                      borderRadius:10,padding:"10px 12px",cursor:taken?"not-allowed":"pointer",
                      background:isSel?lightGreen:taken?"#f9f9f7":"#fff",
                      opacity:taken?0.5:1,
                    }}>
                      <div style={{fontSize:13,fontWeight:500}}>{s}</div>
                      <span style={{
                        fontSize:11,padding:"2px 7px",borderRadius:4,display:"inline-block",marginTop:4,
                        background:taken?"#f0f0ee":lightGreen,color:taken?"#888":"#0F6E56"
                      }}>{taken?t.booked:t.available}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={()=>selSlot&&setStep(2)} style={{
                ...btnPrimary,marginTop:16,opacity:selSlot?1:0.5,cursor:selSlot?"pointer":"not-allowed"
              }}>{t.continue}</button>
            </div>
          )}

          {step===2 && (
            <div>
              <div style={{fontSize:15,fontWeight:500,marginBottom:12}}>{t.yourDetails}</div>
              {[
                {key:"name",label:t.name,ph:"e.g. Jubayer Vai",type:"text"},
                {key:"phone",label:t.mobile,ph:"01XXXXXXXXX",type:"tel"},
                {key:"area",label:t.area,ph:"e.g. Amtola, Silogate",type:"text"},
              ].map(f=>(
                <div key={f.key} style={{marginBottom:12}}>
                  <label style={{fontSize:13,color:"#666",display:"block",marginBottom:4}}>{f.label}</label>
                  <input type={f.type} placeholder={f.ph} value={form[f.key]}
                    onChange={e=>setForm({...form,[f.key]:e.target.value})}
                    style={{width:"100%",padding:"8px 10px",border:"0.5px solid #ccc",
                      borderRadius:8,fontSize:14,fontFamily:"inherit"}}/>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                {[
                  {key:"adv",label:t.advance},{key:"total",label:t.totalPrice}
                ].map(f=>(
                  <div key={f.key}>
                    <label style={{fontSize:13,color:"#666",display:"block",marginBottom:4}}>{f.label}</label>
                    <input type="number" value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                      style={{width:"100%",padding:"8px 10px",border:"0.5px solid #ccc",
                        borderRadius:8,fontSize:14,fontFamily:"inherit"}}/>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setStep(1)} style={btnOutline}>{t.back}</button>
                <button onClick={()=>{if(form.name.trim())setStep(3);}} style={{...btnPrimary,width:"auto",flex:1}}>
                  {t.reviewBooking}
                </button>
              </div>
            </div>
          )}

          {step===3 && (
            <div>
              <div style={{fontSize:15,fontWeight:500,marginBottom:12}}>{t.confirmTitle}</div>
              <div style={card}>
                {[
                  [t.name, form.name],
                  [t.date, getDateOptions().find(d=>d.value===selDate)?.label||selDate],
                  [t.slotLabel, selSlot],
                  [t.mobile, form.phone||"—"],
                  [t.area, form.area||"—"],
                  [t.advancePaid, fmt(parseInt(form.adv)||0)],
                  [t.dueOnArrival, fmt((parseInt(form.total)||0)-(parseInt(form.adv)||0))],
                ].map(([label,val],i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",
                    padding:"8px 0",borderBottom:i<6?"0.5px solid #eee":"none"}}>
                    <span style={{fontSize:13,color:"#888"}}>{label}</span>
                    <span style={{fontSize:13,fontWeight:500}}>{val}</span>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setStep(2)} style={btnOutline}>{t.back}</button>
                <button onClick={handleConfirm} style={{...btnPrimary,width:"auto",flex:1,background:green}}>
                  {t.confirm}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOOKINGS */}
      {page==="bookings" && (
        <div>
          <div style={{fontSize:15,fontWeight:500,marginBottom:10}}>{t.allBookings}</div>
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {["all","today","upcoming","due"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{
                padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",
                border:`0.5px solid ${filter===f?"#ccc":"#e0e0e0"}`,
                background:filter===f?"#f0f0ee":"transparent",
                color:filter===f?"#222":"#888",fontWeight:filter===f?"500":"400",
              }}>{t[f]||t.all}</button>
            ))}
          </div>
          <div style={card}>
            {filteredBookings().length===0
              ? <p style={{color:"#aaa",fontSize:14,padding:"8px 0"}}>{t.noBookings}</p>
              : filteredBookings().map(b=><BookingRow key={b.id} b={b} showMarkPaid={true}/>)
            }
          </div>
        </div>
      )}

      {/* PAYMENTS */}
      {page==="payments" && (
        <div>
          <div style={{fontSize:15,fontWeight:500,marginBottom:10}}>{t.paymentTracker}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
            <div style={statCard}><div style={{fontSize:12,color:"#888",marginBottom:4}}>{t.collected}</div>
              <div style={{fontSize:20,fontWeight:500,color:green}}>{fmt(totalCollected)}</div></div>
            <div style={statCard}><div style={{fontSize:12,color:"#888",marginBottom:4}}>{t.pendingDues}</div>
              <div style={{fontSize:20,fontWeight:500,color:amber}}>{fmt(totalDue)}</div></div>
            <div style={statCard}><div style={{fontSize:12,color:"#888",marginBottom:4}}>{t.expenses}</div>
              <div style={{fontSize:20,fontWeight:500,color:"#A32D2D"}}>৳ 1,100</div></div>
          </div>

          <div style={card}>
            <div style={{fontSize:15,fontWeight:500,marginBottom:4}}>{t.pendingDues}</div>
            {bookings.filter(b=>statusOf(b)!=="paid").map(b=><BookingRow key={b.id} b={b} showMarkPaid={true}/>)}
          </div>

          <div style={card}>
            <div style={{fontSize:15,fontWeight:500,marginBottom:4}}>{t.recentPayments}</div>
            {bookings.filter(b=>statusOf(b)==="paid").slice(0,5).map(b=><BookingRow key={b.id} b={b} showMarkPaid={false}/>)}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",
          background:green,color:"#fff",padding:"10px 20px",
          borderRadius:8,fontSize:14,zIndex:999,whiteSpace:"nowrap",
          boxShadow:"0 2px 8px rgba(0,0,0,0.15)",
        }}>{toast}</div>
      )}
    </div>
  );
}

