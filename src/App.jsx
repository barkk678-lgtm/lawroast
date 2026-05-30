import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { LogOut, Clock, CheckCircle, Upload, X, Users, Flame, Mail, Search, RefreshCw, Trash2, RotateCcw } from "lucide-react";

const SUPA = "https://iohmakgsmmrjssacmmvx.supabase.co";
const KEY = "sb_publishable_6BamgDCcnhBq1r1JJ28M8Q_nkb7qKeu";
const H = {"apikey":KEY,"Authorization":`Bearer ${KEY}`,"Content-Type":"application/json","Prefer":"return=representation"};
const db = {
  getOrders: () => fetch(`${SUPA}/rest/v1/orders?select=*&order=created_at.desc`,{headers:H}).then(r=>r.ok?r.json():r.text().then(t=>Promise.reject(t))),
  insertOrder: d => fetch(`${SUPA}/rest/v1/orders`,{method:"POST",headers:H,body:JSON.stringify(d)}).then(r=>r.ok?r.json():r.text().then(t=>Promise.reject(t))),
  patchOrder: (id,d) => fetch(`${SUPA}/rest/v1/orders?id=eq.${id}`,{method:"PATCH",headers:H,body:JSON.stringify(d)}).then(r=>r.ok?Promise.resolve():r.text().then(t=>Promise.reject(t))),
  deleteOrder: (id) => fetch(`${SUPA}/rest/v1/orders?id=eq.${id}`,{method:"DELETE",headers:H}).then(r=>r.ok?null:r.text().then(t=>Promise.reject(t))),
  uploadFile: async (f,path) => {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    const r = await fetch(`${SUPA}/storage/v1/object/papers/${encoded}`,{method:"POST",headers:{"apikey":KEY,"Authorization":`Bearer ${KEY}`,"Content-Type":f.type||"application/octet-stream"},body:f});
    if(!r.ok){ const err=await r.text(); throw new Error(`Storage ${r.status}: ${err}`); }
    return path;
  },
};

const PLANS = [
  { id:1, name:"סטנדרטי", price:120, salePrice:95, hours:120, accent:"#818cf8", glowBg:"rgba(129,140,248,0.09)", glowBorder:"rgba(129,140,248,0.5)", tagline:"לא דחוף? גם אנחנו לא ממהרים", features:['בדיקה ע"י עו"ד מנוסה','הערות כתובות מפורטות','ניתוח חוזקות וחולשות','כתישה בטון נעים'] },
  { id:2, name:"מהיר", price:150, salePrice:125, hours:72, accent:"#fb923c", glowBg:"rgba(251,146,60,0.09)", glowBorder:"rgba(251,146,60,0.5)", tagline:"כי הדד-ליין מתקרב ואתה יודע את זה", features:['בדיקה ע"י עו"ד מנוסה','הערות כתובות מפורטות','ניתוח חוזקות וחולשות','כתישה בטון נעים','עדיפות בתור'] },
  { id:3, name:"SOS 🔥", price:200, salePrice:175, hours:36, accent:"#ef4444", glowBg:"rgba(239,68,68,0.09)", glowBorder:"rgba(239,68,68,0.55)", tagline:"ההגשה עוד רגע? אנחנו לא שופטים. קצת כן.", features:['בדיקה ע"י עו"ד מנוסה','הערות כתובות מפורטות','ניתוח חוזקות וחולשות','כתישה בטון נעים','עדיפות מקסימלית'], recommended:true },
];

// ← שינוי 2: רשימת מוסדות מורחבת
const INSTS = [
  "אוניברסיטת תל אביב",
  "אוניברסיטת בר אילן",
  "אוניברסיטת חיפה",
  "אוניברסיטת רייכמן",
  "האוניברסיטה העברית",
  "המכללה למנהל",
  "מכללת ספיר",
  "המכללה האקדמית ספיר",
  "הקריה האקדמית אונו",
  "המרכז האקדמי למשפט ועסקים",
  "שערי מדע ומשפט",
  "המרכז האקדמי פרס",
];

const YEARS = ["שנה א'","שנה ב'","שנה ג'","שנה ד'"];
const COURSES = ["משפט חוקתי","דיני חוזים","משפט עונשין"];
const GENDERS = ["גבר","אישה","אחר"];

const fmtPlanTime = h => h < 48 ? `${h} שעות` : `${Math.floor(h/24)} ימים`;

const SS = {
  "התקבל": {color:"#64748b",bg:"rgba(100,116,139,0.09)",border:"rgba(100,116,139,0.28)"},
  "בבדיקה": {color:"#d97706",bg:"rgba(217,119,6,0.09)", border:"rgba(217,119,6,0.3)"},
  "נשלח משוב":{color:"#16a34a",bg:"rgba(22,163,74,0.09)", border:"rgba(22,163,74,0.3)"},
};

const fmtMs = ms => {
  if (ms<=0) return "⏰ פג";
  const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000);
  if (h>=48) return `${Math.floor(h/24)}ד ${h%24}ש`;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};

const hoursAgo = ts => Math.round((Date.now()-new Date(ts).getTime())/3600000);

const rowToOrder = r => ({
  id: r.id, name: r.name||"", email: r.email||"", gender: r.gender||"",
  institution: r.institution||"", year: r.year||"", course: r.course||"",
  plan: PLANS.find(p=>p.id===r.plan_id)||PLANS[0],
  notes: r.notes||"",
  submittedAt: new Date(r.created_at).getTime(),
  status: r.status||"התקבל",
  instructions_path: r.instructions_path||null,
  paper_path: r.paper_path||null,
  deleted_at: r.deleted_at||null,
});

const css = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:5px;background:#f1f5f9}
::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
.fi{background:#f5f1eb;border:1px solid #ddd6cc;color:#1a1510;border-radius:10px;padding:12px 14px;font-family:'Heebo',sans-serif;font-size:14px;width:100%;direction:rtl;outline:none;transition:all .2s;display:block}
.fi:focus{border-color:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.1)}
.fi::placeholder{color:#a09890}
select.fi option{background:#fff;color:#1a1510}
textarea.fi{resize:vertical}
.fiw{background:#fff;border:1px solid #e2e8f0;color:#1e293b;border-radius:9px;padding:10px 13px;font-family:'Heebo',sans-serif;font-size:13px;width:100%;direction:rtl;outline:none;transition:border-color .2s;display:block}
.fiw:focus{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.08)}
.fiw::placeholder{color:#94a3b8}
select.fiw option{background:#fff;color:#1e293b}
textarea.fiw{resize:vertical}
.lbl{display:block;font-size:11px;color:#78716c;margin-bottom:6px;font-weight:700;letter-spacing:.04em}
.lblw{display:block;font-size:10px;color:#94a3b8;margin-bottom:5px;font-weight:700;letter-spacing:.05em}
.gc2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:520px){.gc2{grid-template-columns:1fr}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{transform:translateX(110%)}to{transform:translateX(0)}}
.puls{animation:pulse 1s ease-in-out infinite}
.spin-a{animation:spin .7s linear infinite}
.fin{animation:fadeIn .3s ease}
.sin{animation:slideIn .38s cubic-bezier(.16,1,.3,1)}
.trow:hover td{background:#f8fafc!important}
.del-btn{background:none;border:1px solid #e2e8f0;border-radius:6px;padding:5px;cursor:pointer;color:#94a3b8;display:flex;align-items:center;transition:all .15s}
.del-btn:hover{border-color:#fca5a5!important;color:#dc2626!important;background:rgba(220,38,38,.05)!important}
`;

const TESTIMONIALS = [
  {initials:"נ.ל",bg:"#fde8d8",tc:"#c2410c",name:"נ. לוי",sub:"דיני חוזים · שנה א׳ · TAU",text:'חשבתי שהעבודה שלי ממש טובה. הוא חשב אחרת. היה לו הרבה מה להגיד ואימצתי כמעט את הכל. עליתי מהעבודה הקודמת מ-78 ל-91.'},
  {initials:"י.מ",bg:"#dbeafe",tc:"#1d4ed8",name:"י. מזרחי",sub:"משפט חוקתי · שנה ב׳ · BIU",text:'קיבלתי את המשוב יום לפני ההגשה, ישבתי לתקן לילה שלם. לא נעים, אבל שווה. המרצה שלי שאל אם עברתי קורס כתיבה.'},
  {initials:"ש.כ",bg:"#d1fae5",tc:"#065f46",name:"ש. כהן",sub:"משפט עונשין · שנה א׳ · Haifa",text:'הוא לא ריחם עלי וזה בדיוק מה שרציתי. כל הערה הייתה מדויקת. אני וחברה כתבנו את העבודות שלנו יחד, ואני קיבלתי 15 נקודות יותר.'},
  {initials:"א.ר",bg:"#ede9fe",tc:"#5b21b6",name:"א. רוזנברג",sub:"דיני חוזים · שנה ב׳ · Reichman",text:'כואב לקרוא, אבל ממכר. ממש כמו שמסבירים באתר. הייתי אמור להיות עצבני, במקום זה ישבתי לתקן ישר. מסלול מהיר, קיבלתי תוך יומיים.'},
  {initials:"ת.א",bg:"#fef9c3",tc:"#92400e",name:"ת. אברהם",sub:"משפט חוקתי · שנה א׳ · TAU",text:'משוב מעולה, מקצועי ומצחיק. סוף סוף קצת קלילות באקדמיה. כתב לי "נקודה מצוינת אם היא הייתה נכונה". צחקתי, תיקנתי, קיבלתי 94.'},
];

function TestimonialCard({ r }) {
  return (
    <div style={{background:"#fff",border:r.hot?"2px solid rgba(220,38,38,.2)":"1px solid #ede6dc",borderRadius:"14px",padding:"20px 22px",position:"relative",height:"100%"}}>
      {r.hot&&<div style={{position:"absolute",top:"-11px",right:"18px",background:"linear-gradient(135deg,#dc2626,#f97316)",color:"#fff",fontSize:"10px",fontWeight:800,padding:"3px 12px",borderRadius:"100px"}}>🔥 הכי אהוב</div>}
      <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
        <div style={{width:"40px",height:"40px",borderRadius:"50%",background:r.bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"14px",color:r.tc}}>{r.initials}</div>
        <div>
          <p style={{fontWeight:700,fontSize:"14px",color:"#1a1510",margin:0}}>{r.name}</p>
          <p style={{fontSize:"12px",color:"#a8a29e",margin:0}}>{r.sub}</p>
        </div>
        <div style={{marginRight:"auto",fontSize:"13px",color:"#f97316"}}>★★★★★</div>
      </div>
      <p style={{fontSize:"14px",color:"#57534e",lineHeight:1.75,margin:0}}>{r.text}</p>
    </div>
  );
}

function TestimonialsSection() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const id = setInterval(() => setCurrent(c => (c + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(id);
  }, [isMobile]);

  const handleTouchStart = e => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = e => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      setCurrent(c => diff > 0 ? (c + 1) % TESTIMONIALS.length : (c - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
    }
    touchStartX.current = null;
  };

  return (
    <section style={{maxWidth:"1040px",margin:"0 auto",padding:"0 24px 60px",position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",marginBottom:"2rem"}}>
        <h2 style={{fontSize:"24px",fontWeight:900,color:"#1a1510",margin:0}}>מה אומרים עלינו</h2>
      </div>

      {isMobile ? (
        /* קרוסלה למובייל */
        <div style={{position:"relative",overflow:"hidden"}} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div style={{transition:"opacity .4s ease",opacity:1}}>
            <TestimonialCard r={TESTIMONIALS[current]} />
          </div>
          {/* נקודות ניווט */}
          <div style={{display:"flex",justifyContent:"center",gap:"7px",marginTop:"16px"}}>
            {TESTIMONIALS.map((_,i) => (
              <button key={i} onClick={()=>setCurrent(i)} style={{width: i===current?"20px":"8px",height:"8px",borderRadius:"100px",border:"none",background:i===current?"#dc2626":"#ddd6cc",cursor:"pointer",padding:0,transition:"all .3s ease"}}/>
            ))}
          </div>
        </div>
      ) : (
        /* פירמידה לדסקטופ */
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px",marginBottom:"16px"}}>
            {TESTIMONIALS.slice(0,3).map((r,i)=><TestimonialCard key={i} r={r}/>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"16px",maxWidth:"70%",margin:"0 auto"}}>
            {TESTIMONIALS.slice(3).map((r,i)=><TestimonialCard key={i} r={r}/>)}
          </div>
        </>
      )}

      <div style={{textAlign:"center",marginTop:"1.5rem"}}>
        <p style={{fontSize:"12px",color:"#a8a29e",margin:0}}>⭐ 4.9 ממוצע · 200+ עבודות נכתשו בהצלחה</p>
      </div>
    </section>
  );
}

function Drawer({ order, onClose, onStatusChange }) {
  const [roast,setRoast]=useState(""), [phase,setPhase]=useState(0), [ffile,setFfile]=useState(null);
  const [,setTick]=useState(0); const fref=useRef();
  useEffect(()=>{ const id=setInterval(()=>setTick(t=>t+1),1000); return ()=>clearInterval(id); },[]);
  const remaining=(order.submittedAt+order.plan.hours*3600000)-Date.now();
  const isUrg=remaining<3*3600000&&order.status!=="נשלח משוב";
  const st=SS[order.status];
  const send=async()=>{
    setPhase(1); await new Promise(r=>setTimeout(r,1300));
    setPhase(2); await new Promise(r=>setTimeout(r,1300));
    setPhase(3);
    onStatusChange(order.id,"נשלח משוב");
    let fileAttachment=null;
    if(ffile){
      await new Promise(res=>{
        const reader=new FileReader();
        reader.onloadend=()=>{ fileAttachment={name:ffile.name,data:reader.result.split(',')[1],type:ffile.type||'application/octet-stream'}; res(); };
        reader.readAsDataURL(ffile);
      });
    }
    fetch('/api/send-feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:order.name,email:order.email,course:order.course,feedback:roast,fileAttachment})}).catch(()=>{});
  };
  const fileUrl = path => path ? `${SUPA}/storage/v1/object/public/papers/${path}` : null;
  const instrName = order.instructions_path ? order.instructions_path.split("/").pop() : `הנחיות_${order.course}.pdf`;
  const paperName = order.paper_path ? order.paper_path.split("/").pop() : `עבודה_${order.name.split(" ")[0]}.docx`;
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,23,42,.38)",zIndex:200,backdropFilter:"blur(3px)"}}/>
      <div className="sin" style={{position:"fixed",top:0,left:0,bottom:0,width:"min(520px,100vw)",background:"#f8fafc",borderRight:"1px solid #e2e8f0",zIndex:201,overflowY:"auto",direction:"rtl",boxShadow:"4px 0 28px rgba(0,0,0,.09)"}}>
        <div style={{padding:"22px",fontFamily:"'Heebo',sans-serif"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
            <div><h2 style={{fontWeight:900,fontSize:"18px",margin:"0 0 2px",color:"#0f172a"}}>{order.name}</h2><div style={{fontSize:"12px",color:"#64748b"}}>{order.email}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{background:st.bg,border:`1px solid ${st.border}`,color:st.color,borderRadius:"100px",padding:"4px 12px",fontSize:"11px",fontWeight:700}}>{order.status}</span>
              <button onClick={onClose} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"8px",padding:"7px",cursor:"pointer",color:"#64748b",display:"flex"}}><X size={15}/></button>
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:"12px",padding:"15px",marginBottom:"14px",border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
            <div className="gc2" style={{gap:"11px"}}>
              {[["מוסד",order.institution],["שנה",order.year],["קורס",order.course],["מסלול",`${order.plan.name} · ₪${order.plan.price}`]].map(([k,v])=>(
                <div key={k}><div className="lblw">{k}</div><div style={{fontSize:"13px",color:"#1e293b",fontWeight:600}}>{v}</div></div>
              ))}
            </div>
            {order.notes&&<div style={{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid #f1f5f9"}}><div className="lblw">💬 הערות הסטודנט</div><div style={{fontSize:"13px",color:"#475569",lineHeight:1.65,fontStyle:"italic"}}>"{order.notes}"</div></div>}
          </div>
          {order.status!=="נשלח משוב"&&<div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px",background:isUrg?"rgba(239,68,68,.06)":"#fff",borderRadius:"9px",padding:"10px 13px",border:`1px solid ${isUrg?"rgba(239,68,68,.22)":"#e2e8f0"}`}}>
            <Clock size={13} color={isUrg?"#ef4444":"#94a3b8"}/><span style={{fontSize:"12px",color:"#64748b"}}>זמן שנותר:</span>
            <span className={isUrg?"puls":""} style={{fontFamily:"monospace",fontWeight:700,fontSize:"14px",color:isUrg?"#ef4444":"#0f172a"}}>{fmtMs(remaining)}</span>
            {isUrg&&<span style={{marginRight:"auto",fontSize:"11px",color:"#ef4444",fontWeight:700}}>🚨 דחוף!</span>}
          </div>}
          <div style={{marginBottom:"14px"}}><div className="lblw">📁 קבצים שהועלו</div>
            {[{name:instrName,url:fileUrl(order.instructions_path),ico:"📋"},{name:paperName,url:fileUrl(order.paper_path),ico:"📄"}].map((f,i)=>(
              <a key={i} href={f.url||undefined} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 11px",background:"#fff",borderRadius:"8px",marginBottom:"5px",border:"1px solid #e2e8f0",textDecoration:"none"}}>
                <span style={{fontSize:"14px"}}>{f.ico}</span>
                <span style={{fontSize:"12px",color:f.url?"#6366f1":"#475569",textDecoration:f.url?"underline":"none"}}>{f.name}</span>
                {f.url&&<span style={{marginRight:"auto",fontSize:"10px",color:"#94a3b8"}}>⬇ הורד</span>}
              </a>
            ))}
          </div>
          <div style={{marginBottom:"14px"}}><label className="lblw">✍️ אזור הכתישה — המשוב שלך</label>
            <textarea className="fiw" rows={5} placeholder={`כתוב כאן את המשוב המפורט עבור ${order.name}.\nזכור: אנחנו כותשים — בטון נעים.`} value={roast} onChange={e=>setRoast(e.target.value)} style={{lineHeight:1.7}}/>
          </div>
          <div style={{marginBottom:"20px"}}><label className="lblw">📎 העלה עבודה בדוקה</label>
            <div onClick={()=>fref.current?.click()} style={{border:`2px dashed ${ffile?"#16a34a":"#cbd5e1"}`,borderRadius:"10px",padding:"12px",textAlign:"center",cursor:"pointer",background:"#fff",color:ffile?"#16a34a":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
              <Upload size={14}/><span style={{fontSize:"12px",fontWeight:600}}>{ffile?ffile.name:"לחץ להעלאת הקובץ הבדוק"}</span>
            </div>
            <input ref={fref} type="file" style={{display:"none"}} onChange={e=>setFfile(e.target.files[0])}/>
          </div>
          {phase===0&&<button onClick={send} style={{width:"100%",padding:"14px",borderRadius:"11px",border:"none",background:"linear-gradient(135deg,#dc2626,#f97316)",color:"#fff",fontFamily:"'Heebo',sans-serif",fontWeight:900,fontSize:"15px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",boxShadow:"0 4px 14px rgba(220,38,38,.24)"}}><Mail size={15}/> שלח משוב וקובץ בדוק לסטודנט</button>}
          {(phase===1||phase===2)&&<div style={{textAlign:"center",padding:"18px",background:"#fff",borderRadius:"12px",border:"1px solid #e2e8f0"}}>
            <div className="spin-a" style={{width:"24px",height:"24px",border:"3px solid #e2e8f0",borderTop:`3px solid ${phase===1?"#ef4444":"#fb923c"}`,borderRadius:"50%",margin:"0 auto 11px"}}/>
            <div style={{color:"#64748b",fontSize:"13px",fontFamily:"'Heebo',sans-serif",marginBottom:"11px"}}>{phase===1?"מכין מייל...":"מצרף קבצים..."}</div>
            <div style={{height:"4px",background:"#f1f5f9",borderRadius:"2px",overflow:"hidden"}}><div style={{height:"100%",background:phase===1?"#ef4444":"#fb923c",width:phase===1?"40%":"80%",borderRadius:"2px",transition:"width .8s ease"}}/></div>
          </div>}
          {phase===3&&<div className="fin" style={{background:"rgba(22,163,74,.06)",border:"1px solid rgba(22,163,74,.25)",borderRadius:"12px",padding:"20px",textAlign:"center",fontFamily:"'Heebo',sans-serif"}}>
            <CheckCircle size={32} color="#16a34a" style={{margin:"0 auto 9px",display:"block"}}/>
            <div style={{fontWeight:900,fontSize:"16px",color:"#16a34a",marginBottom:"5px"}}>האוטומציה הופעלה בהצלחה! 🎉</div>
            <div style={{fontSize:"12px",color:"#64748b",marginBottom:"3px"}}>המייל נשלח לכתובת:</div>
            <div style={{fontSize:"14px",color:"#0f172a",fontWeight:700}}>{order.email}</div>
          </div>}
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [view,setView]=useState("landing"), [adminTab,setAdminTab]=useState("live");
  const [loginOpen,setLoginOpen]=useState(false);
  const [uname,setUname]=useState(""), [pwd,setPwd]=useState(""), [lerr,setLerr]=useState("");
  const [orders,setOrders]=useState([]), [sel,setSel]=useState(null);
  const [,setTick]=useState(0);
  const [dbLoading,setDbLoading]=useState(false), [dbError,setDbError]=useState(null), [lastSync,setLastSync]=useState(null);
  const [submitting,setSubmitting]=useState(false);
  const [chartFilter,setChartFilter]=useState(null), [tableSearch,setTableSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState(""), [colSort,setColSort]=useState({col:"deadline",dir:"asc"});
  const [selPlan,setSelPlan]=useState(null), [submitted,setSubmitted]=useState(false);
  const [form,setForm]=useState({name:"",email:"",gender:"",institution:"",year:"",course:"",notes:""});
  const [instrFile,setInstrFile]=useState(null), [paperFile,setPaperFile]=useState(null);
  const [hovP,setHovP]=useState(null), [btnHov,setBtnHov]=useState(false);
  const [formError,setFormError]=useState(null);
  const instrRef=useRef(), paperRef=useRef(), formRef=useRef();

  useEffect(()=>{ const id=setInterval(()=>setTick(t=>t+1),1000); return ()=>clearInterval(id); },[]);
  useEffect(()=>{
    try{
      if(window.location.hash==='#admin'){
        if(sessionStorage.getItem('lr_auth')==='1') setView('admin');
        else setLoginOpen(true);
      }
    }catch{}
  },[]);

  const loadOrders=useCallback(async()=>{
    setDbLoading(true); setDbError(null);
    try{ const rows=await db.getOrders(); setOrders(rows.map(rowToOrder)); setLastSync(Date.now()); }
    catch(e){ setDbError("שגיאת התחברות לשרת — "+(typeof e==="string"?e:"בדוק חיבור")); }
    finally{ setDbLoading(false); }
  },[]);

  useEffect(()=>{
    if(view!=="admin") return;
    loadOrders();
    const id=setInterval(loadOrders,20000);
    return ()=>clearInterval(id);
  },[view,loadOrders]);

  const doLogin=()=>{
    if(uname==="admin"&&pwd===import.meta.env.VITE_ADMIN_PASSWORD){
      try{sessionStorage.setItem('lr_auth','1');}catch{}
      window.location.hash='admin';
      setLoginOpen(false);setView("admin");setLerr("");setUname("");setPwd("");
    }else setLerr("פרטים שגויים.");
  };

  const updateStatus=(id,status)=>{
    setOrders(o=>o.map(x=>x.id===id?{...x,status}:x));
    setSel(s=>s?.id===id?{...s,status}:s);
    db.patchOrder(id,{status}).catch(console.error);
  };

  const softDelete=(id)=>{
    const now=new Date().toISOString();
    setOrders(o=>o.map(x=>x.id===id?{...x,deleted_at:now}:x));
    if(sel?.id===id) setSel(null);
    db.patchOrder(id,{deleted_at:now}).catch(console.error);
  };

  const restore=(id)=>{
    setOrders(o=>o.map(x=>x.id===id?{...x,deleted_at:null}:x));
    db.patchOrder(id,{deleted_at:null}).catch(console.error);
  };

  const hardDelete=(id)=>{
    setOrders(o=>o.filter(x=>x.id!==id));
    db.deleteOrder(id).catch(console.error);
  };

  const handleSubmit=async()=>{
    if(submitting) return;
    // ← שינוי 1: ולידציה לכל השדות החובה
    if(!selPlan){ setFormError("⚠️ אנא בחר מסלול לפני השליחה"); formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}); return; }
    if(!form.name.trim()){ setFormError("⚠️ אנא מלא שם מלא"); return; }
    if(!form.email.trim()){ setFormError("⚠️ אנא מלא כתובת מייל"); return; }
    if(!form.gender){ setFormError("⚠️ אנא בחר מגדר"); return; }
    if(!form.institution){ setFormError("⚠️ אנא בחר מוסד לימודים"); return; }
    if(!form.year){ setFormError("⚠️ אנא בחר שנת לימוד"); return; }
    if(!form.course){ setFormError("⚠️ אנא בחר קורס"); return; }
    if(!instrFile){ setFormError("⚠️ אנא העלה את הנחיות העבודה"); return; }
    if(!paperFile){ setFormError("⚠️ אנא העלה את קובץ העבודה"); return; }
    setFormError(null); setSubmitting(true);
    try{
      const orderId=crypto.randomUUID();
      await db.insertOrder({id:orderId,name:form.name,email:form.email,gender:form.gender,institution:form.institution,year:form.year,course:form.course,plan_id:selPlan,notes:form.notes,status:"התקבל"});
      let fileError=null;
      try{
        const ext=f=>f.name.split('.').pop().replace(/[^a-zA-Z0-9]/g,'').toLowerCase()||'bin';
        const ip=instrFile?await db.uploadFile(instrFile,`${orderId}/instructions.${ext(instrFile)}`):null;
        const pp=paperFile?await db.uploadFile(paperFile,`${orderId}/paper.${ext(paperFile)}`):null;
        if(ip||pp) await db.patchOrder(orderId,{instructions_path:ip,paper_path:pp});
      }catch(e){ fileError=String(e); }
      fetch('/api/send-confirmation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.name,email:form.email,course:form.course,planId:selPlan,orderId})}).catch(()=>{});
      setSubmitted(true);
      if(fileError) setTimeout(()=>alert("⚠️ ההגשה נשמרה אבל הקבצים לא הועלו:\n"+fileError),300);
    }catch(e){ setFormError("❌ שגיאה בשליחה: "+(typeof e==="string"?e:(e?.message||JSON.stringify(e)))); }
    finally{ setSubmitting(false); }
  };

  const activeOrders = orders.filter(o=>!o.deleted_at&&o.status!=="נשלח משוב");
  const archivedOrders= orders.filter(o=>!o.deleted_at&&o.status==="נשלח משוב");
  const trashOrders = orders.filter(o=>o.deleted_at);
  const revenue=activeOrders.reduce((s,o)=>s+o.plan.price,0);
  const inProg=activeOrders.filter(o=>o.status==="בבדיקה").length;
  const urgCnt=activeOrders.filter(o=>o.plan.hours===36).length;
  const planData=PLANS.map(p=>({name:p.name.replace(" 🔥",""),planId:p.id,fill:p.accent,הזמנות:activeOrders.filter(o=>o.plan.id===p.id).length}));
  const courseData=COURSES.map(c=>({name:c.replace("משפט ","מ. ").replace("דיני ","ד. "),fullCourse:c,הכנסות:activeOrders.filter(o=>o.course===c).reduce((s,o)=>s+o.plan.price,0)}));
  const today0=new Date(); today0.setHours(0,0,0,0);
  const weeklyData=Array.from({length:7},(_,i)=>{
    const ds=new Date(today0.getTime()); ds.setDate(ds.getDate()+i);
    const de=new Date(ds.getTime()); de.setDate(de.getDate()+1);
    const dayNames=["א'","ב'","ג'","ד'","ה'","ו'","ש'"];
    return{name:`יום ${dayNames[ds.getDay()]}`,dayStart:ds.getTime(),dayEnd:de.getTime(),עבודות:activeOrders.filter(o=>{const dl=o.submittedAt+o.plan.hours*3600000;return dl>=ds.getTime()&&dl<de.getTime();}).length};
  });

  const handleChartClick=(type,data)=>{
    if(type==="plan"){if(chartFilter?.type==="plan"&&chartFilter.planId===data.planId)setChartFilter(null);else setChartFilter({type:"plan",planId:data.planId,label:data.name});}
    else if(type==="course"){if(chartFilter?.type==="course"&&chartFilter.course===data.fullCourse)setChartFilter(null);else setChartFilter({type:"course",course:data.fullCourse,label:data.name});}
    else if(type==="day"){if(chartFilter?.type==="day"&&chartFilter.dayStart===data.dayStart)setChartFilter(null);else setChartFilter({type:"day",dayStart:data.dayStart,dayEnd:data.dayEnd,label:data.name});}
  };

  const handleColSort=col=>setColSort(s=>s.col===col?{col,dir:s.dir==="asc"?"desc":"asc"}:{col,dir:"asc"});

  let displayOrders=[...activeOrders];
  if(chartFilter?.type==="plan") displayOrders=displayOrders.filter(o=>o.plan.id===chartFilter.planId);
  if(chartFilter?.type==="course") displayOrders=displayOrders.filter(o=>o.course===chartFilter.course);
  if(chartFilter?.type==="day") displayOrders=displayOrders.filter(o=>{const dl=o.submittedAt+o.plan.hours*3600000;return dl>=chartFilter.dayStart&&dl<chartFilter.dayEnd;});
  if(tableSearch) displayOrders=displayOrders.filter(o=>o.name.includes(tableSearch)||o.email.includes(tableSearch)||o.institution.includes(tableSearch));
  if(statusFilter) displayOrders=displayOrders.filter(o=>o.status===statusFilter);
  displayOrders.sort((a,b)=>{
    const m=colSort.dir==="asc"?1:-1;
    if(colSort.col==="name") return a.name.localeCompare(b.name,"he")*m;
    if(colSort.col==="institution") return a.institution.localeCompare(b.institution,"he")*m;
    if(colSort.col==="course") return a.course.localeCompare(b.course,"he")*m;
    if(colSort.col==="price") return (a.plan.price-b.plan.price)*m;
    return ((a.submittedAt+a.plan.hours*3600000)-(b.submittedAt+b.plan.hours*3600000))*m;
  });

  const SortInd=({col})=><span style={{fontSize:"9px",marginLeft:"3px",color:colSort.col===col?"#6366f1":"#cbd5e1"}}>{colSort.col===col?(colSort.dir==="asc"?"▲":"▼"):"⇅"}</span>;
  const ttStyle={background:"#fff",border:"1px solid #e2e8f0",borderRadius:"8px",fontFamily:"Heebo",color:"#1e293b",fontSize:11,boxShadow:"0 4px 12px rgba(0,0,0,.07)"};
  const hasFilters=chartFilter||tableSearch||statusFilter;
  const syncAgo=lastSync?Math.floor((Date.now()-lastSync)/1000):null;

  const OrderTable=({rows})=>(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",direction:"rtl"}}>
        <thead><tr style={{borderBottom:"1px solid #f1f5f9",background:"#fafafa"}}>
          {[["name","שם"],["institution","מוסד"],["course","קורס"],["price","מסלול"],["deadline","דד-ליין"],["status","סטטוס"],["del",""]].map(([col,label])=>(
            <th key={col} onClick={col!=="status"&&col!=="del"?()=>handleColSort(col):undefined}
              style={{padding:"9px 13px",textAlign:"right",fontSize:"10px",color:colSort.col===col?"#6366f1":"#94a3b8",fontWeight:700,letterSpacing:".05em",whiteSpace:"nowrap",cursor:col!=="status"&&col!=="del"?"pointer":"default",userSelect:"none"}}>
              {col!=="status"&&col!=="del"&&<SortInd col={col}/>}{label}
            </th>
          ))}
        </tr></thead>
        <tbody>
          {rows.length===0&&<tr><td colSpan={7} style={{padding:"36px",textAlign:"center",color:"#94a3b8",fontFamily:"'Heebo',sans-serif",fontSize:"13px"}}>
            {orders.filter(o=>!o.deleted_at).length===0?"עדיין אין הגשות — שתף את הקישור ותתחיל לקבל עבודות 🔥":"אין עבודות תואמות לסינון"}
          </td></tr>}
          {rows.map(o=>{
            const rem=(o.submittedAt+o.plan.hours*3600000)-Date.now();
            const urgRow=rem<3*3600000; const st=SS[o.status];
            return(
              <tr key={o.id} className="trow" onClick={()=>setSel(o)} style={{borderBottom:"1px solid #f8fafc",cursor:"pointer"}}>
                <td style={{padding:"11px 13px"}}><div style={{fontWeight:700,fontSize:"13px",color:"#0f172a"}}>{o.name}</div><div style={{fontSize:"10px",color:"#94a3b8"}}>{o.email}</div></td>
                <td style={{padding:"11px 13px",fontSize:"11px",color:"#64748b",whiteSpace:"nowrap"}}>{o.institution.replace("אוניברסיטת ","")}</td>
                <td style={{padding:"11px 13px",fontSize:"11px",color:"#475569"}}>{o.course}</td>
                <td style={{padding:"11px 13px"}}><span style={{background:o.plan.accent+"18",border:`1px solid ${o.plan.accent}40`,color:o.plan.accent,borderRadius:"100px",padding:"2px 8px",fontSize:"11px",fontWeight:700,whiteSpace:"nowrap"}}>{o.plan.name} · ₪{o.plan.price}</span></td>
                <td style={{padding:"11px 13px"}}><span className={urgRow?"puls":""} style={{fontFamily:"monospace",fontSize:"13px",fontWeight:700,color:urgRow?"#dc2626":"#334155"}}>{fmtMs(rem)}</span></td>
                <td style={{padding:"11px 13px"}} onClick={e=>e.stopPropagation()}>
                  <select value={o.status} onChange={e=>updateStatus(o.id,e.target.value)} style={{background:st.bg,border:`1px solid ${st.border}`,color:st.color,borderRadius:"6px",padding:"4px 7px",fontFamily:"'Heebo',sans-serif",fontSize:"11px",fontWeight:700,cursor:"pointer",outline:"none"}}>
                    {Object.keys(SS).map(s=><option key={s} value={s} style={{background:"#fff",color:"#1e293b"}}>{s}</option>)}
                  </select>
                </td>
                <td style={{padding:"11px 13px"}} onClick={e=>e.stopPropagation()}>
                  <button className="del-btn" title="העבר לסל מחזור" onClick={()=>softDelete(o.id)}><Trash2 size={13}/></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if(view==="admin") return(
    <>
      <style>{css}</style>
      {sel&&<Drawer order={sel} onClose={()=>setSel(null)} onStatusChange={updateStatus}/>}
      <div dir="rtl" style={{background:"#f1f5f9",minHeight:"100vh",fontFamily:"'Heebo',sans-serif",color:"#1e293b"}}>
        <header style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:"54px",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"7px"}}><span style={{fontSize:"18px"}}>🔥</span><span style={{fontWeight:900,fontSize:"16px",color:"#0f172a"}}>LawRoast</span></div>
            <div style={{display:"flex",gap:"2px",background:"#f1f5f9",borderRadius:"8px",padding:"3px"}}>
              {[["live","📊 לייב"],["archive","📁 ארכיון"],["trash","🗑️ סל מחזור"]].map(([t,l])=>(
                <button key={t} onClick={()=>setAdminTab(t)} style={{padding:"5px 14px",borderRadius:"6px",border:"none",background:adminTab===t?"#fff":"transparent",color:adminTab===t?"#0f172a":"#64748b",fontFamily:"'Heebo',sans-serif",fontSize:"12px",fontWeight:700,cursor:"pointer",boxShadow:adminTab===t?"0 1px 4px rgba(0,0,0,.07)":"none",transition:"all .15s",display:"flex",alignItems:"center",gap:"4px"}}>
                  {l}
                  {t==="archive"&&archivedOrders.length>0&&<span style={{background:"#e2e8f0",borderRadius:"100px",padding:"1px 7px",fontSize:"10px",color:"#64748b"}}>{archivedOrders.length}</span>}
                  {t==="trash"&&trashOrders.length>0&&<span style={{background:"rgba(220,38,38,.1)",borderRadius:"100px",padding:"1px 7px",fontSize:"10px",color:"#dc2626"}}>{trashOrders.length}</span>}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            {syncAgo!==null&&!dbLoading&&<span style={{fontSize:"10px",color:"#94a3b8"}}>{syncAgo<10?"עודכן זה עתה":`עודכן לפני ${syncAgo}ש׳`}</span>}
            {dbLoading&&<div className="spin-a" style={{width:"14px",height:"14px",border:"2px solid #e2e8f0",borderTop:"2px solid #6366f1",borderRadius:"50%",flexShrink:0}}/>}
            <button onClick={loadOrders} style={{display:"flex",alignItems:"center",gap:"5px",background:"#f8fafc",border:"1px solid #e2e8f0",color:"#64748b",borderRadius:"7px",padding:"6px 10px",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:"11px",fontWeight:700}}><RefreshCw size={12}/></button>
            <button onClick={()=>{try{sessionStorage.removeItem('lr_auth');}catch{}window.location.hash='';setView("landing");}} style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(220,38,38,.06)",border:"1px solid rgba(220,38,38,.2)",color:"#dc2626",borderRadius:"8px",padding:"7px 12px",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:"12px",fontWeight:700}}><LogOut size={13}/> התנתק</button>
          </div>
        </header>
        <main style={{padding:"20px",maxWidth:"1280px",margin:"0 auto"}}>
          {dbError&&<div style={{background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.22)",borderRadius:"10px",padding:"12px 16px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"10px",fontFamily:"'Heebo',sans-serif"}}>
            <span style={{fontSize:"16px"}}>⚠️</span><span style={{fontSize:"12px",color:"#dc2626",flex:1}}>{dbError}</span>
            <button onClick={loadOrders} style={{background:"rgba(220,38,38,.08)",border:"1px solid rgba(220,38,38,.2)",borderRadius:"6px",padding:"4px 10px",color:"#dc2626",fontSize:"11px",fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>נסה שוב</button>
          </div>}
          {adminTab==="live"&&<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:"11px",marginBottom:"16px"}}>
              {[
                {emoji:"💸",label:"כסף שעשית מלעשות לאנשים רע לב",val:`₪${revenue}`,color:"#16a34a",bg:"rgba(22,163,74,.07)",border:"rgba(22,163,74,.22)"},
                {icon:<Users size={17} color="#6366f1"/>,label:"עבודות פעילות",val:activeOrders.length,color:"#6366f1",bg:"rgba(99,102,241,.07)",border:"rgba(99,102,241,.22)"},
                {icon:<Clock size={17} color="#d97706"/>,label:"עבודות בטיפול",val:inProg,color:"#d97706",bg:"rgba(217,119,6,.07)",border:"rgba(217,119,6,.22)"},
                {icon:<Flame size={17} color="#dc2626"/>,label:"הזמנות SOS דחופות",val:urgCnt,color:"#dc2626",bg:"rgba(220,38,38,.07)",border:"rgba(220,38,38,.22)"},
              ].map((k,i)=>(
                <div key={i} style={{background:k.bg,border:`1px solid ${k.border}`,borderRadius:"11px",padding:"15px 17px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>{k.emoji?<span style={{fontSize:"17px"}}>{k.emoji}</span>:k.icon}<span style={{fontSize:"10px",color:"#94a3b8",textAlign:"left",maxWidth:"90px",lineHeight:1.4}}>{k.label}</span></div>
                  <div style={{fontSize:"1.85rem",fontWeight:900,color:k.color}}>{k.val}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"11px",marginBottom:"16px"}}>
              {[
                {title:"📊 התפלגות מסלולים",data:planData,dk:"הזמנות",type:"plan",colored:true,fmtLbl:v=>v,fmtTip:v=>[v,"הזמנות"]},
                {title:"💰 הכנסות לפי קורס",data:courseData,dk:"הכנסות",type:"course",color:"#6366f1",colored:false,fmtLbl:v=>"₪"+v,fmtTip:v=>["₪"+v,"הכנסות"]},
                {title:"📅 עומס שבועי",data:weeklyData,dk:"עבודות",type:"day",color:"#6366f1",colored:false,weekly:true,fmtLbl:v=>v,fmtTip:v=>[v,"עבודות"]},
              ].map((ch,ci)=>(
                <div key={ci} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"12px",padding:"15px",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
                  <div style={{fontWeight:700,fontSize:"12px",marginBottom:"13px",color:"#64748b",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span>{ch.title}</span>
                    {chartFilter?.type===ch.type&&<span style={{fontSize:"10px",color:"#ef4444",cursor:"pointer",fontWeight:700}} onClick={()=>setChartFilter(null)}>× נקה</span>}
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={ch.data} margin={{top:18,right:4,left:-22,bottom:0}}>
                      <XAxis dataKey="name" tick={{fill:"#94a3b8",fontSize:9,fontFamily:"Heebo"}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#94a3b8",fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false}/>
                      <Tooltip contentStyle={ttStyle} cursor={{fill:"rgba(99,102,241,.04)"}} formatter={ch.fmtTip}/>
                      <Bar dataKey={ch.dk} radius={[4,4,0,0]} style={{cursor:"pointer"}} onClick={d=>handleChartClick(ch.type,d)}>
                        <LabelList dataKey={ch.dk} position="top" style={{fill:"#475569",fontSize:11,fontFamily:"Heebo",fontWeight:700}} formatter={ch.fmtLbl}/>
                        {ch.data.map((e,j)=>{
                          let fill=ch.colored?e.fill:(ch.weekly&&j===0?"#f97316":ch.color);
                          const dim=chartFilter?.type===ch.type&&(ch.type==="plan"?chartFilter.planId!==e.planId:ch.type==="course"?chartFilter.course!==e.fullCourse:chartFilter.dayStart!==e.dayStart);
                          const act=chartFilter?.type===ch.type&&(ch.type==="plan"?chartFilter.planId===e.planId:ch.type==="course"?chartFilter.course===e.fullCourse:chartFilter.dayStart===e.dayStart);
                          return<Cell key={j} fill={act?"#ef4444":fill} opacity={dim?0.3:1}/>;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"12px",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
              <div style={{padding:"13px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"8px"}}>
                <h3 style={{fontWeight:900,fontSize:"14px",color:"#0f172a"}}>🔥 Live Tasks</h3>
                <div style={{display:"flex",gap:"7px",alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"5px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:"7px",padding:"5px 9px"}}>
                    <Search size={11} color="#94a3b8"/>
                    <input value={tableSearch} onChange={e=>setTableSearch(e.target.value)} placeholder="חיפוש..." style={{background:"none",border:"none",outline:"none",fontSize:"11px",color:"#1e293b",fontFamily:"'Heebo',sans-serif",width:"90px",direction:"rtl"}}/>
                  </div>
                  <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:"7px",padding:"5px 9px",fontFamily:"'Heebo',sans-serif",fontSize:"11px",color:statusFilter?SS[statusFilter]?.color:"#64748b",fontWeight:700,cursor:"pointer",outline:"none"}}>
                    <option value="">כל הסטטוסים</option><option value="התקבל">התקבל</option><option value="בבדיקה">בבדיקה</option>
                  </select>
                  {hasFilters&&<button onClick={()=>{setChartFilter(null);setTableSearch("");setStatusFilter("");}} style={{padding:"5px 9px",borderRadius:"7px",border:"1px solid rgba(220,38,38,.28)",background:"rgba(220,38,38,.06)",color:"#dc2626",fontFamily:"'Heebo',sans-serif",fontSize:"11px",fontWeight:700,cursor:"pointer"}}>× נקה</button>}
                </div>
              </div>
              {chartFilter&&<div style={{padding:"7px 16px",background:"#f8fafc",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:"6px"}}><span style={{fontSize:"11px",color:"#64748b",fontFamily:"'Heebo',sans-serif"}}>מסנן לפי גרף:</span><span onClick={()=>setChartFilter(null)} style={{background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.25)",color:"#6366f1",borderRadius:"100px",padding:"2px 10px",fontSize:"11px",fontWeight:700,fontFamily:"'Heebo',sans-serif",cursor:"pointer"}}>{chartFilter.label} ×</span></div>}
              {dbLoading&&orders.length===0
                ?<div style={{padding:"36px",textAlign:"center",fontFamily:"'Heebo',sans-serif"}}><div className="spin-a" style={{width:"24px",height:"24px",border:"3px solid #e2e8f0",borderTop:"3px solid #6366f1",borderRadius:"50%",margin:"0 auto 10px"}}/><div style={{color:"#94a3b8",fontSize:"13px"}}>טוען הגשות...</div></div>
                :<OrderTable rows={displayOrders}/>
              }
            </div>
          </>}
          {adminTab==="archive"&&(
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"12px",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
              <div style={{padding:"13px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{fontSize:"15px"}}>📁</span><h3 style={{fontWeight:900,fontSize:"14px",color:"#0f172a"}}>ארכיון — עבודות שנשלח עליהן משוב</h3>
                <span style={{background:"rgba(22,163,74,.08)",border:"1px solid rgba(22,163,74,.22)",color:"#16a34a",borderRadius:"100px",padding:"1px 9px",fontSize:"11px",fontWeight:700}}>{archivedOrders.length}</span>
              </div>
              {archivedOrders.length===0?<div style={{padding:"40px",textAlign:"center",color:"#94a3b8",fontFamily:"'Heebo',sans-serif",fontSize:"13px"}}><div style={{fontSize:"30px",marginBottom:"8px"}}>📭</div>הארכיון ריק</div>:<OrderTable rows={archivedOrders}/>}
            </div>
          )}
          {adminTab==="trash"&&(
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"12px",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
              <div style={{padding:"13px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{fontSize:"15px"}}>🗑️</span>
                  <h3 style={{fontWeight:900,fontSize:"14px",color:"#0f172a"}}>סל מחזור</h3>
                  {trashOrders.length>0&&<span style={{background:"rgba(220,38,38,.08)",border:"1px solid rgba(220,38,38,.2)",color:"#dc2626",borderRadius:"100px",padding:"1px 9px",fontSize:"11px",fontWeight:700}}>{trashOrders.length}</span>}
                </div>
                {trashOrders.length>0&&<button onClick={()=>{if(window.confirm("למחוק לצמיתות את כל הפריטים בסל?"))trashOrders.forEach(o=>hardDelete(o.id));}} style={{background:"rgba(220,38,38,.06)",border:"1px solid rgba(220,38,38,.22)",borderRadius:"7px",padding:"6px 14px",color:"#dc2626",fontFamily:"'Heebo',sans-serif",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>ריקון סל מחזור</button>}
              </div>
              {trashOrders.length===0?<div style={{padding:"40px",textAlign:"center",color:"#94a3b8",fontFamily:"'Heebo',sans-serif",fontSize:"13px"}}><div style={{fontSize:"30px",marginBottom:"8px"}}>🗑️</div>הסל ריק</div>
                :<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",direction:"rtl"}}>
                  <thead><tr style={{borderBottom:"1px solid #f1f5f9",background:"#fafafa"}}>
                    {["שם","קורס","מסלול","נמחק לפני",""].map(h=><th key={h} style={{padding:"9px 13px",textAlign:"right",fontSize:"10px",color:"#94a3b8",fontWeight:700,letterSpacing:".05em"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>{trashOrders.map(o=>{
                    const h=hoursAgo(o.deleted_at);
                    return(<tr key={o.id} style={{borderBottom:"1px solid #f8fafc",opacity:0.75}}>
                      <td style={{padding:"11px 13px"}}><div style={{fontWeight:700,fontSize:"13px",color:"#0f172a"}}>{o.name}</div><div style={{fontSize:"10px",color:"#94a3b8"}}>{o.email}</div></td>
                      <td style={{padding:"11px 13px",fontSize:"11px",color:"#475569"}}>{o.course}</td>
                      <td style={{padding:"11px 13px"}}><span style={{background:o.plan.accent+"18",border:`1px solid ${o.plan.accent}40`,color:o.plan.accent,borderRadius:"100px",padding:"2px 8px",fontSize:"11px",fontWeight:700}}>{o.plan.name} · ₪{o.plan.price}</span></td>
                      <td style={{padding:"11px 13px",fontSize:"11px",color:"#94a3b8",fontFamily:"monospace"}}>{h>=48?`${Math.floor(h/24)} ימים`:`${h} שעות`}</td>
                      <td style={{padding:"11px 13px"}} onClick={e=>e.stopPropagation()}>
                        <div style={{display:"flex",gap:"6px",justifyContent:"flex-end"}}>
                          <button onClick={()=>restore(o.id)} style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.25)",borderRadius:"6px",padding:"5px 10px",color:"#6366f1",fontFamily:"'Heebo',sans-serif",fontSize:"11px",fontWeight:700,cursor:"pointer"}}><RotateCcw size={12}/> שחזר</button>
                          <button onClick={()=>{if(window.confirm("למחוק לצמיתות?"))hardDelete(o.id);}} style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(220,38,38,.06)",border:"1px solid rgba(220,38,38,.2)",borderRadius:"6px",padding:"5px 10px",color:"#dc2626",fontFamily:"'Heebo',sans-serif",fontSize:"11px",fontWeight:700,cursor:"pointer"}}><Trash2 size={12}/> מחק לצמיתות</button>
                        </div>
                      </td>
                    </tr>);
                  })}</tbody>
                </table></div>}
            </div>
          )}
        </main>
      </div>
    </>
  );

  const PAYBOX = {1:"https://links.payboxapp.com/ghGya7cru3b",2:"https://links.payboxapp.com/EaXPM0Rqu3b",3:"https://links.payboxapp.com/65h5qLbsu3b"};
  const curPlan=PLANS.find(p=>p.id===selPlan);
  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ← שינוי 4: מסך לאחר הגשה עם תשלום Paybox
  if(submitted) return(
    <>
      <style>{css}</style>
      <div dir="rtl" style={{background:"#fef7ef",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Heebo',sans-serif",textAlign:"center",padding:"2rem"}}>
        <div style={{maxWidth:"480px",width:"100%"}}>
          <div style={{fontSize:"5rem",marginBottom:"1rem"}}>🎉</div>
          <h2 style={{fontSize:"clamp(1.8rem,5vw,2.6rem)",fontWeight:900,color:"#1a1510",margin:"0 0 10px"}}>ההגשה התקבלה בהצלחה!</h2>
          <p style={{fontSize:"1rem",color:"#78716c",margin:"0 0 28px",lineHeight:1.7}}>
            כל מה שנשאר הוא לשלם — ורק אז השעון מתחיל לרוץ 🕐
          </p>

          {/* כרטיס תשלום */}
          <div style={{background:"#fff",border:"2px solid rgba(220,38,38,.2)",borderRadius:"18px",padding:"24px",marginBottom:"20px",boxShadow:"0 8px 32px rgba(220,38,38,.08)"}}>
            <p style={{fontSize:"13px",color:"#a8a29e",fontWeight:700,margin:"0 0 6px",letterSpacing:".05em"}}>סכום לתשלום</p>
            {curPlan&&<div style={{fontSize:"2.8rem",fontWeight:900,color:"#dc2626",margin:"0 0 2px",lineHeight:1}}>₪{curPlan.salePrice}</div>}
            {curPlan&&<div style={{fontSize:"14px",color:"#ccc5b9",textDecoration:"line-through",marginBottom:"4px"}}>₪{curPlan.price}</div>}
            {curPlan&&<div style={{fontSize:"13px",color:"#a8a29e",marginBottom:"20px"}}>מסלול {curPlan.name} · זמן תגובה {fmtPlanTime(curPlan.hours)} מרגע התשלום</div>}
            {/* מובייל = כפתור, דסקטופ = QR */}
            {isMobileDevice ? (
              <a href={PAYBOX[selPlan]} target="_blank" rel="noreferrer" style={{display:"block",width:"100%",padding:"16px",borderRadius:"13px",border:"none",background:"linear-gradient(135deg,#dc2626,#f97316)",color:"#fff",fontFamily:"'Heebo',sans-serif",fontWeight:900,fontSize:"17px",textDecoration:"none",boxShadow:"0 4px 18px rgba(220,38,38,.28)"}}>
                💳 לתשלום בPaybox לחץ כאן
              </a>
            ) : (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}>
                <p style={{fontSize:"13px",color:"#57534e",fontWeight:700,margin:0}}>סרוק עם הטלפון לתשלום ב-Paybox</p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(PAYBOX[selPlan])}&bgcolor=ffffff&color=1a1510&margin=10`}
                  alt="QR לתשלום"
                  style={{width:"180px",height:"180px",borderRadius:"12px",border:"2px solid #ede6dc",boxShadow:"0 4px 14px rgba(0,0,0,.08)"}}
                />
                <p style={{fontSize:"11px",color:"#a8a29e",margin:0}}>או <a href={PAYBOX[selPlan]} target="_blank" rel="noreferrer" style={{color:"#dc2626",fontWeight:700}}>לחץ כאן</a> לפתיחה בדפדפן</p>
              </div>
            )}
          </div>

          <div style={{background:"rgba(217,119,6,.06)",border:"1px solid rgba(217,119,6,.2)",borderRadius:"12px",padding:"14px 18px",marginBottom:"20px",textAlign:"right"}}>
            <p style={{fontSize:"13px",color:"#92400e",fontWeight:700,margin:"0 0 6px"}}>⏳ חשוב לדעת</p>
            <p style={{fontSize:"12px",color:"#78350f",margin:0,lineHeight:1.7}}>הבדיקה תתחיל <strong>רק לאחר קבלת התשלום</strong>.<br/>לא שילמת? העבודה לא נכנסת לתור.</p>
          </div>

          <p style={{fontSize:"11px",color:"#a8a29e",margin:0,lineHeight:1.7}}>
            📧 אישור הגשה נשלח למייל שלך.<br/>
            לא קיבלת? בדוק ספאם / קידומי מכירות.
          </p>
        </div>
      </div>
    </>
  );

  return(
    <>
      <style>{css}</style>
      {loginOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"}} onClick={()=>{setLoginOpen(false);setLerr("");}}>
          <div className="fin" onClick={e=>e.stopPropagation()} style={{background:"#fff",border:"1px solid #ddd6cc",borderRadius:"18px",padding:"28px",width:"min(350px,90vw)",fontFamily:"'Heebo',sans-serif",direction:"rtl",boxShadow:"0 20px 60px rgba(0,0,0,.12)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <h3 style={{fontWeight:900,fontSize:"16px",margin:0,color:"#1a1510"}}>🔐 כניסת צוות</h3>
              <button onClick={()=>{setLoginOpen(false);setLerr("");}} style={{background:"#f5f1eb",border:"1px solid #ddd6cc",borderRadius:"7px",padding:"6px",cursor:"pointer",color:"#78716c",display:"flex"}}><X size={13}/></button>
            </div>
            <div style={{marginBottom:"12px"}}><label className="lbl">שם משתמש</label><input className="fi" type="text" placeholder="admin" value={uname} onChange={e=>setUname(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}/></div>
            <div style={{marginBottom:"16px"}}><label className="lbl">סיסמה</label><input className="fi" type="password" placeholder="••••" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}/></div>
            {lerr&&<div style={{color:"#dc2626",fontSize:"12px",marginBottom:"12px",textAlign:"center"}}>{lerr}</div>}
            <button onClick={doLogin} style={{width:"100%",padding:"13px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#dc2626,#f97316)",color:"#fff",fontFamily:"'Heebo',sans-serif",fontWeight:900,fontSize:"15px",cursor:"pointer"}}>כניסה 🔥</button>
          </div>
        </div>
      )}

      <div dir="rtl" style={{background:"#fef7ef",minHeight:"100vh",color:"#1a1510",fontFamily:"'Heebo',sans-serif",overflowX:"hidden",position:"relative"}}>
        <div style={{position:"absolute",top:"-80px",right:"-80px",width:"400px",height:"400px",background:"radial-gradient(circle,rgba(251,146,60,.18) 0%,transparent 65%)",pointerEvents:"none",zIndex:0}}/>
        <div style={{position:"absolute",top:"200px",left:"-100px",width:"350px",height:"350px",background:"radial-gradient(circle,rgba(220,38,38,.1) 0%,transparent 65%)",pointerEvents:"none",zIndex:0}}/>

        <section style={{position:"relative",zIndex:1,maxWidth:"800px",margin:"0 auto",padding:"72px 24px 56px",textAlign:"center"}}>
          <h1 style={{fontSize:"clamp(2.6rem,6.5vw,4.4rem)",fontWeight:900,lineHeight:1.08,letterSpacing:"-.03em",margin:"0 0 28px"}}>
            העבודה שלך <span style={{color:"#dc2626"}}>דלוחה.</span><br/>
            <span style={{color:"#f97316"}}>חבל</span> שתגלה את זה בציון.
          </h1>
          <div style={{background:"rgba(255,255,255,.75)",border:"1px solid rgba(220,38,38,.12)",borderRadius:"16px",padding:"18px 24px",maxWidth:"580px",margin:"0 auto 36px",backdropFilter:"blur(4px)",boxShadow:"0 4px 16px rgba(220,38,38,.06)"}}>
            <p style={{fontSize:"1.05rem",color:"#57534e",lineHeight:1.8,margin:0}}>
              חברים לא יגידו לך את האמת — הם יחייכו ויגידו ״וואו, ממש טוב״.<br/>ה-AI? יחרטט בביטחון עד שתגיש ותיפול.<br/>
              <strong style={{color:"#1a1510"}}>עורך דין</strong> יקרא, יבקר, ויאמר גם את מה שלא נעים לשמוע&nbsp;😉
            </p>
          </div>
          <div style={{display:"flex",gap:"10px",justifyContent:"center",flexWrap:"wrap"}}>
            {[["✓ עד 4 עמודים","#57534e","rgba(0,0,0,.06)","rgba(0,0,0,.1)"],["✓ הערות מפורטות","#57534e","rgba(0,0,0,.06)","rgba(0,0,0,.1)"],["✓ כתישה שמעלה ציונים","#b91c1c","rgba(220,38,38,.08)","rgba(220,38,38,.22)"]].map(([t,tc,bg,bc])=>(
              <span key={t} style={{background:bg,border:`1px solid ${bc}`,borderRadius:"100px",padding:"7px 16px",fontSize:"13px",fontWeight:700,color:tc}}>{t}</span>
            ))}
          </div>
        </section>

        <div style={{textAlign:"center",padding:"4px 24px 36px",zIndex:1,position:"relative"}}>
          <p style={{fontSize:"18px",fontWeight:900,color:"#1a1510",letterSpacing:"-.01em",marginBottom:"6px"}}>בחר את המסלול המתאים לך</p>
          <p style={{fontSize:"12px",color:"#a8a29e",fontWeight:500}}>כמה מהר תצטרך את המשוב?</p>
        </div>

        <section style={{maxWidth:"1040px",margin:"0 auto",padding:"0 24px 72px",position:"relative",zIndex:1}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"20px"}}>
            {PLANS.map(plan=>{
              const isSel=selPlan===plan.id, isHov=hovP===plan.id;
              return(
                <div key={plan.id}
                  onClick={()=>{setSelPlan(plan.id);setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),80);}}
                  onMouseEnter={()=>setHovP(plan.id)} onMouseLeave={()=>setHovP(null)}
                  style={{background:isSel?plan.glowBg:"#fff",border:`2px solid ${isSel?plan.accent:plan.recommended?"rgba(239,68,68,.4)":"#ede6dc"}`,borderRadius:"18px",padding:"26px 22px",cursor:"pointer",position:"relative",boxShadow:isSel?`0 8px 32px ${plan.accent}28,0 2px 8px rgba(0,0,0,.06)`:isHov?"0 10px 32px rgba(0,0,0,.12)":"0 2px 8px rgba(0,0,0,.04)",transform:isHov&&!isSel?"translateY(-5px) rotate(-.3deg)":isSel?"translateY(-2px)":"none",transition:"all .22s ease",display:"flex",flexDirection:"column"}}>
                  {plan.recommended&&<div style={{position:"absolute",top:"-13px",right:"20px",background:"linear-gradient(135deg,#dc2626,#f97316)",color:"#fff",fontSize:"11px",fontWeight:800,padding:"4px 14px",borderRadius:"100px",boxShadow:"0 3px 10px rgba(220,38,38,.35)"}}>🔥 הכי פופולרי</div>}
                  <div style={{flex:1,marginBottom:"22px"}}>
                    <h3 style={{fontSize:"1.35rem",fontWeight:900,color:plan.accent,marginBottom:"10px"}}>{plan.name}</h3>
                    <p style={{fontSize:"13px",color:"#57534e",lineHeight:1.6,marginBottom:"18px"}}>{plan.tagline}</p>
                    {/* מחיר מבצע השקה */}
                    <div style={{display:"flex",alignItems:"baseline",gap:"10px",marginBottom:"2px"}}>
                      <div style={{fontSize:"2.6rem",fontWeight:900,lineHeight:1,color:"#1a1510"}}>₪{plan.salePrice}</div>
                      <div style={{fontSize:"1.2rem",fontWeight:700,color:"#ccc5b9",textDecoration:"line-through"}}>₪{plan.price}</div>
                    </div>
                    <div style={{display:"inline-block",background:"rgba(22,163,74,.08)",border:"1px solid rgba(22,163,74,.25)",borderRadius:"100px",padding:"2px 10px",fontSize:"11px",color:"#16a34a",fontWeight:700,marginBottom:"6px"}}>🏷️ מחיר השקה</div>
                    <div style={{fontSize:"12px",color:"#a8a29e",marginTop:"4px"}}>בתוך {fmtPlanTime(plan.hours)}</div>
                  </div>
                  <button style={{width:"100%",padding:"12px",borderRadius:"9px",border:"none",background:isSel?plan.accent:`${plan.accent}22`,color:isSel?"#fff":plan.accent,fontFamily:"'Heebo',sans-serif",fontWeight:700,fontSize:"13px",cursor:"pointer",transition:"all .18s"}}>
                    {isSel?"✓ נבחר — גלול לטופס ↓":"לבחירת מסלול זה ↓"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ביקורות לקוחות */}
        <TestimonialsSection />

        <div style={{maxWidth:"680px",margin:"0 auto",padding:"0 24px 18px",position:"relative",zIndex:1}}>
          <div style={{background:"linear-gradient(135deg,#fdba74,#fca5a5)",border:"2px solid #f97316",borderRadius:"14px",padding:"14px 22px",textAlign:"center",fontWeight:800,fontSize:"14px",color:"#7c2d12",boxShadow:"0 4px 16px rgba(249,115,22,.18)",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",flexWrap:"wrap"}}>
            <span style={{fontSize:"18px"}}>⚠️</span><span>לא אחראים לדמעות, רגשות פגועים, ולחץ דם גבוה בעקבות המשוב</span><span style={{fontSize:"18px"}}>⚠️</span>
          </div>
        </div>

        <section ref={formRef} style={{maxWidth:"680px",margin:"0 auto",padding:"0 24px 90px",position:"relative",zIndex:1}}>
          <div style={{background:"#fff",border:"2px solid #ede6dc",borderRadius:"20px",padding:"clamp(22px,5vw,38px)",boxShadow:"0 8px 32px rgba(220,38,38,.07),0 2px 8px rgba(0,0,0,.04)"}}>
            <div style={{textAlign:"center",marginBottom:"24px"}}>
              <h2 style={{fontSize:"1.75rem",fontWeight:900,margin:"0 0 16px",color:"#1a1510"}}>שלח את העבודה לכתישה 🔥</h2>

              {/* ← שינוי 6: חיווי מסלולים תמיד מוצג */}
              <div style={{display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}>
                {PLANS.map(p=>{
                  const isSel=selPlan===p.id;
                  return(
                    <span key={p.id} onClick={()=>setSelPlan(p.id)} style={{
                      background:isSel?p.glowBg:"transparent",
                      border:`1px solid ${isSel?p.accent:"#d4cdc4"}`,
                      borderRadius:"100px",
                      padding:"5px 14px",
                      fontSize:"12px",
                      color:isSel?p.accent:"#a8a29e",
                      fontWeight:700,
                      cursor:"pointer",
                      transition:"all .18s",
                    }}>
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div className="gc2">
                <div><label className="lbl">שם מלא</label><input className="fi" type="text" placeholder="ישראל ישראלי" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                <div><label className="lbl">כתובת מייל</label><input className="fi" type="email" placeholder="israel@uni.ac.il" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
              </div>
              <div className="gc2">
                <div><label className="lbl">מגדר</label>
                  <select className="fi" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}>
                    <option value="">-- בחר --</option>{GENDERS.map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div><label className="lbl">מוסד לימודים</label>
                  <select className="fi" value={form.institution} onChange={e=>setForm({...form,institution:e.target.value})}>
                    <option value="">-- בחר מוסד --</option>{INSTS.map(i=><option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div className="gc2">
                <div><label className="lbl">שנת לימוד</label>
                  <select className="fi" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}>
                    <option value="">-- בחר שנה --</option>{YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div><label className="lbl">קורס</label>
                  <select className="fi" value={form.course} onChange={e=>setForm({...form,course:e.target.value})}>
                    <option value="">-- בחר קורס --</option>{COURSES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="lbl">הערות נוספות (אופציונלי)</label><textarea className="fi" rows={3} placeholder="ספר לנו ממה אתה הכי מודאג..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
              <div className="gc2">
                {[{lbl:"הנחיות העבודה",ref:instrRef,file:instrFile,set:setInstrFile,ico:"📋"},{lbl:"הקובץ שלך (עד 4 עמ')",ref:paperRef,file:paperFile,set:setPaperFile,ico:"🔥"}].map((u,i)=>(
                  <div key={i}>
                    <label className="lbl">{u.lbl}</label>
                    <div onClick={()=>u.ref.current?.click()}
                      onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#dc2626";e.currentTarget.style.background="rgba(220,38,38,.05)";}}
                      onDragLeave={e=>{e.currentTarget.style.borderColor=u.file?"#16a34a":"#ccc5b9";e.currentTarget.style.background="#faf7f3";}}
                      onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=u.file?"#16a34a":"#ccc5b9";e.currentTarget.style.background="#faf7f3";const f=e.dataTransfer.files[0];if(f)u.set(f);}}
                      style={{border:`2px dashed ${u.file?"#16a34a":"#ccc5b9"}`,borderRadius:"10px",padding:"13px 8px",textAlign:"center",cursor:"pointer",background:"#faf7f3",color:u.file?"#16a34a":"#a8a29e",transition:"all .2s",minHeight:"72px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"4px"}}>
                      <div style={{fontSize:"18px"}}>{u.file?"✅":u.ico}</div>
                      <div style={{fontSize:"10px",fontWeight:600,wordBreak:"break-all"}}>{u.file?u.file.name:"לחץ להעלאה · גרור לכאן"}</div>
                    </div>
                    <input ref={u.ref} type="file" style={{display:"none"}} onChange={e=>u.set(e.target.files[0])}/>
                  </div>
                ))}
              </div>

              {formError&&<div style={{background:"rgba(220,38,38,.07)",border:"1px solid rgba(220,38,38,.25)",borderRadius:"10px",padding:"12px 16px",fontSize:"13px",color:"#b91c1c",fontWeight:600,fontFamily:"'Heebo',sans-serif"}}>{formError}</div>}

              <button onClick={handleSubmit} disabled={submitting} onMouseEnter={()=>!submitting&&setBtnHov(true)} onMouseLeave={()=>setBtnHov(false)}
                style={{width:"100%",padding:"17px",borderRadius:"13px",border:"none",background:"linear-gradient(135deg,#dc2626,#f97316)",color:"#fff",fontFamily:"'Heebo',sans-serif",fontWeight:900,fontSize:"18px",cursor:submitting?"not-allowed":"pointer",opacity:submitting?0.8:btnHov?0.9:1,transform:!submitting&&btnHov?"scale(1.015)":"scale(1)",transition:"all .18s",boxShadow:btnHov&&!submitting?"0 12px 36px rgba(220,38,38,.38)":"0 4px 18px rgba(220,38,38,.22)",marginTop:"4px",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
                {submitting?<><div className="spin-a" style={{width:"20px",height:"20px",border:"3px solid rgba(255,255,255,.35)",borderTop:"3px solid #fff",borderRadius:"50%",flexShrink:0}}/>שולח...</>:"הגש ל-ROAST 🔥"}
              </button>

              {/* ← שינויים 3 ו-5: הערת אזכור אחיד (ללא השורה הישנה) */}
              <p style={{textAlign:"center",fontSize:"11px",color:"#a8a29e",margin:0}}>
                ⚠️ הבדיקה אינה כוללת בדיקת האזכור האחיד
              </p>
            </div>
          </div>
        </section>

        <footer style={{textAlign:"center",padding:"18px 24px",borderTop:"1px solid #ede6dc",background:"#faf2e8",color:"#a8a29e",fontSize:"12px",position:"relative",zIndex:1}}>
          <p style={{margin:"0 0 10px",color:"#78716c"}}>🔥 LawRoast · ביקורת משפטית שלא תשכח</p>
          <button onClick={()=>setLoginOpen(true)} style={{background:"none",border:"none",cursor:"pointer",color:"#d4cdc4",fontSize:"11px",fontFamily:"'Heebo',sans-serif",padding:0,transition:"color .2s"}} onMouseEnter={e=>e.target.style.color="#a8a29e"} onMouseLeave={e=>e.target.style.color="#d4cdc4"}>
            כניסת צוות
          </button>
        </footer>
      </div>
    </>
  );
}
