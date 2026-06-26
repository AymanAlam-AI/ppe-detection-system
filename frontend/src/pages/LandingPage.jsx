import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function FadeUp({ children, delay = 0, stretch = false }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)", transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`, ...(stretch ? { height: "100%" } : {}) }}>
      {children}
    </div>
  );
}

function AnimCounter({ target, suffix = "" }) {
  const [val, setVal] = useState(0);
  const [ref, inView] = useInView();
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 1800, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

const FAQS = [
  {
    q: "Do I need any technical knowledge to use SafetyVision?",
    a: "No. You just upload a video or photo from your phone or computer. SafetyVision does everything else — it finds each worker in the image and automatically checks whether they are wearing a safety helmet. You get a clear result in minutes."
  },
  {
    q: "What exactly is PPE and why does it matter?",
    a: "PPE stands for Personal Protective Equipment — the safety gear workers wear to protect themselves from injury. On a construction site, this includes hard hats (helmets), high-visibility vests, gloves, and safety boots. Not wearing the right PPE is one of the leading causes of workplace accidents. SafetyVision helps you spot these violations before an accident happens."
  },
  {
    q: "How accurate is the detection?",
    a: "The AI model detects safety helmets with 92% accuracy and was trained on over 3,000 labeled images of real construction and factory workers. It works across different lighting conditions, camera angles, and worker densities."
  },
  {
    q: "Can it work with my CCTV cameras?",
    a: "Yes — the system is built to connect to live CCTV camera feeds. For this version you upload a recorded video clip, but the same detection engine can process live streams from IP cameras in real time. This is the same technology used in industrial safety monitoring systems."
  },
  {
    q: "How long does it take to analyze a video?",
    a: "A 30-second video clip typically takes about 2–3 minutes to fully analyze. The system goes through every frame, identifies every worker, and produces an annotated output video showing who is and isn't wearing a helmet."
  },
  {
    q: "What do I get after the analysis is complete?",
    a: "You get a full compliance report showing: how many workers were detected, how many were wearing helmets, how many were not, the overall compliance rate as a percentage, a timeline showing exactly which moments in the video had violations, and an annotated video you can download and share."
  },
  {
    q: "Is my video data kept private?",
    a: "Yes. Videos are processed locally on your server and are not sent to any third-party service. All analysis happens within your own infrastructure."
  },
  {
    q: "What types of videos or images can I upload?",
    a: "SafetyVision accepts MP4, AVI, MOV, and MKV video files, as well as JPG and PNG images. You can use footage from any camera — a mobile phone, CCTV, or a drone."
  },
];

export default function LandingPage() {
  const [tick, setTick] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const s = {
    page: { backgroundColor: "#080C10", minHeight: "100vh", color: "#E6EDF3", fontFamily: "Inter, sans-serif" },
    nav: { position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #21262D", backgroundColor: "rgba(8,12,16,0.9)", backdropFilter: "blur(12px)", height: "64px" },
    navInner: { maxWidth: "1200px", margin: "0 auto", padding: "0 48px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" },
    mono: { fontFamily: "JetBrains Mono, monospace" },
    amber: { color: "#F0A500" },
    muted: { color: "#7D8590" },
    border: { border: "1px solid #21262D" },
    section: { maxWidth: "1200px", margin: "0 auto", padding: "0 48px" },
  };

  return (
    <div style={s.page}>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navInner}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <div style={{ width: "32px", height: "32px", backgroundColor: "#F0A500", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" fill="#080C10"/>
              <path d="M9 12l2 2 4-4" stroke="#F0A500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p style={{ ...s.mono, fontWeight: 700, fontSize: "14px", color: "#E6EDF3", margin: 0, lineHeight: 1.2 }}>SafetyVision</p>
            <p style={{ ...s.mono, fontSize: "9px", color: "#7D8590", margin: 0, letterSpacing: "0.12em", textTransform: "uppercase" }}>PPE Detection</p>
          </div>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: "2px", backgroundColor: "#161B22", border: "1px solid #21262D", borderRadius: "10px", padding: "4px" }}>
          {[
            { label: "How it works", href: "#how" },
            { label: "Features", href: "#features" },
            { label: "FAQ", href: "#faq" },
          ].map(({ label, href }) => (
            <a key={label} href={href}
              style={{ ...s.mono, fontSize: "12px", color: "#7D8590", textDecoration: "none", padding: "6px 14px", borderRadius: "7px", transition: "color 0.15s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#E6EDF3"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#7D8590"}
            >{label}</a>
          ))}
        </nav>
        <Link to="/dashboard"
          style={{ ...s.mono, fontSize: "11px", fontWeight: 700, color: "#080C10", backgroundColor: "#F0A500", textDecoration: "none", padding: "9px 18px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.1em", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4920A"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F0A500"; e.currentTarget.style.transform = "translateY(0)"; }}
        >Sign in — Ayman</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ ...s.section, padding: "120px 48px 80px", textAlign: "center" }}>
        <FadeUp>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid rgba(240,165,0,0.3)", backgroundColor: "rgba(240,165,0,0.07)", padding: "5px 14px 5px 10px", borderRadius: "100px", marginBottom: "40px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#F0A500", animation: "pulse 2s infinite" }} />
            <span style={{ ...s.mono, fontSize: "11px", ...s.amber, letterSpacing: "0.08em", textTransform: "uppercase" }}>AI-Powered Workplace Safety</span>
          </div>
          <h1 style={{ fontSize: "clamp(40px, 6vw, 68px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#E6EDF3", margin: "0 0 24px" }}>
            Every worker.<br/>
            <span style={s.amber}>Every helmet.</span><br/>
            Every second.
          </h1>
          <p style={{ fontSize: "18px", ...s.muted, lineHeight: 1.75, maxWidth: "540px", margin: "0 auto 48px" }}>
            SafetyVision watches your site so you don't have to. Upload a video or connect a camera — it instantly spots every worker and flags anyone not wearing a safety helmet.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link to="/dashboard"
              style={{ ...s.mono, fontSize: "12px", fontWeight: 700, color: "#080C10", backgroundColor: "#F0A500", textDecoration: "none", padding: "14px 28px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.1em", transition: "all 0.2s", display: "inline-block" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4920A"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(240,165,0,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F0A500"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >Open Dashboard →</Link>
            <a href="#how"
              style={{ ...s.mono, fontSize: "12px", color: "#7D8590", border: "1px solid #21262D", textDecoration: "none", padding: "14px 28px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.1em", transition: "all 0.2s", display: "inline-block" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#E6EDF3"; e.currentTarget.style.borderColor = "#30363D"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#7D8590"; e.currentTarget.style.borderColor = "#21262D"; }}
            >See how it works</a>
          </div>
        </FadeUp>

        {/* Mock terminal */}
        <FadeUp delay={0.15}>
          <div style={{ marginTop: "80px", border: "1px solid #21262D", borderRadius: "10px", overflow: "hidden", backgroundColor: "#0D1117", textAlign: "left" }}>
            <div style={{ borderBottom: "1px solid #21262D", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {["#DA3633", "#F0A500", "#3FB950"].map((c, i) => <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: c, opacity: 0.8 }} />)}
              </div>
              <span style={{ ...s.mono, fontSize: "10px", ...s.muted, letterSpacing: "0.05em" }}>safetyvision — live inference</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#3FB950", animation: "pulse 1.5s infinite" }} />
                <span style={{ ...s.mono, fontSize: "9px", color: "#3FB950", textTransform: "uppercase", letterSpacing: "0.1em" }}>Processing</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", backgroundColor: "#21262D" }}>
              {[
                { label: "Workers detected", value: "7", color: "#E6EDF3" },
                { label: "Wearing helmet", value: "5", color: "#3FB950" },
                { label: "Not wearing helmet", value: "2", color: "#DA3633" },
                { label: "Compliance rate", value: "71.4%", color: tick % 2 === 0 ? "#F0A500" : "#DA3633" },
                { label: "Current frame", value: `${240 + tick * 47}/828`, color: "#7D8590" },
                { label: "Detection speed", value: "2.6ms", color: "#7D8590" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ backgroundColor: "#0D1117", padding: "20px 24px" }}>
                  <p style={{ ...s.mono, fontSize: "9px", ...s.muted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>{label}</p>
                  <p style={{ ...s.mono, fontSize: "22px", fontWeight: 700, color, margin: 0, transition: "color 0.4s" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </section>

      {/* STATS */}
      <section style={{ borderTop: "1px solid #21262D", borderBottom: "1px solid #21262D" }}>
        <div style={{ ...s.section, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "0 48px" }}>
          {[
            { value: 81, suffix: "%", label: "Overall accuracy" },
            { value: 92, suffix: "%", label: "Helmet detection" },
            { value: 3000, suffix: "+", label: "Training images" },
            { value: 44, suffix: "", label: "Training epochs" },
          ].map(({ value, suffix, label }, i) => (
            <div key={label} style={{ padding: "48px 24px", textAlign: "center", borderRight: i < 3 ? "1px solid #21262D" : "none" }}>
              <FadeUp delay={i * 0.08}>
                <p style={{ ...s.mono, fontSize: "48px", fontWeight: 900, ...s.amber, margin: "0 0 8px", lineHeight: 1 }}>
                  <AnimCounter target={value} suffix={suffix} />
                </p>
                <p style={{ ...s.mono, fontSize: "10px", ...s.muted, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>{label}</p>
              </FadeUp>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT IS PPE - layperson explanation */}
      <section style={{ borderBottom: "1px solid #21262D", backgroundColor: "#0D1117" }}>
        <div style={{ ...s.section, padding: "100px 48px" }}>
          <FadeUp>
            <p style={{ ...s.mono, fontSize: "10px", ...s.amber, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>The problem we solve</p>
            <h2 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px", color: "#E6EDF3" }}>What is PPE — and why does it matter?</h2>
            <p style={{ fontSize: "17px", ...s.muted, lineHeight: 1.8, maxWidth: "620px", margin: "0 0 64px" }}>
              PPE stands for <strong style={{ color: "#E6EDF3" }}>Personal Protective Equipment</strong> — the safety gear workers wear to protect themselves from injury on site. A safety helmet is the most important piece of PPE on any construction or factory floor. Without it, a single falling object can be fatal.
            </p>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", backgroundColor: "#21262D", border: "1px solid #21262D", borderRadius: "10px", overflow: "hidden" }}>
            {[
              { icon: "🪖", title: "Safety helmet", desc: "Protects the head from falling objects, bumps, and debris. Required on all construction sites by law in India and internationally.", tag: "Most critical" },
              { icon: "🦺", title: "High-vis vest", desc: "Makes workers visible to machinery operators, especially in low light. Reduces the risk of being struck by moving vehicles.", tag: "High importance" },
              { icon: "🧤", title: "Safety gloves", desc: "Protect hands from cuts, chemicals, and heat. Essential for workers handling materials or operating machinery.", tag: "High importance" },
            ].map(({ icon, title, desc, tag }, i) => (
              <FadeUp key={title} delay={i * 0.08}>
                <div style={{ backgroundColor: "#0D1117", padding: "32px", height: "100%", boxSizing: "border-box", transition: "background-color 0.2s", cursor: "default" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#161B22"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#0D1117"}
                >
                  <div style={{ fontSize: "28px", marginBottom: "12px" }}>{icon}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#E6EDF3", margin: 0 }}>{title}</p>
                    <span style={{ ...s.mono, fontSize: "8px", color: "#F0A500", border: "1px solid rgba(240,165,0,0.3)", borderRadius: "3px", padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{tag}</span>
                  </div>
                  <p style={{ fontSize: "13px", ...s.muted, lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp delay={0.2}>
            <div style={{ marginTop: "32px", border: "1px solid rgba(218,54,51,0.3)", backgroundColor: "rgba(218,54,51,0.05)", borderRadius: "10px", padding: "24px 28px", display: "flex", alignItems: "flex-start", gap: "16px" }}>
              <span style={{ fontSize: "20px", flexShrink: 0, marginTop: "2px" }}>⚠️</span>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#E6EDF3", margin: "0 0 4px" }}>The scale of the problem</p>
                <p style={{ fontSize: "13px", ...s.muted, margin: 0, lineHeight: 1.65 }}>
                  According to the International Labour Organization, over <strong style={{ color: "#E6EDF3" }}>2.3 million workers</strong> suffer fatal or non-fatal workplace accidents every year globally. The majority of construction-site injuries are preventable — and most are caused by workers not wearing the right safety gear. Manual inspection is slow, inconsistent, and impossible to scale across large sites. SafetyVision automates this entirely.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ borderBottom: "1px solid #21262D" }}>
        <div style={{ ...s.section, padding: "100px 48px" }}>
          <FadeUp>
            <p style={{ ...s.mono, fontSize: "10px", ...s.amber, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>Simple to use</p>
            <h2 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 64px", color: "#E6EDF3" }}>From video to report in minutes</h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "stretch" }}>
            {[
              { step: "01", icon: "📹", title: "Upload your video or photo", desc: "Take a video on your phone, download CCTV footage, or upload any photo of workers on site. SafetyVision accepts MP4, AVI, MOV, and JPG/PNG formats." },
              { step: "02", icon: "🔍", title: "AI scans every single frame", desc: "The system looks at every frame of your video — up to 30 times per second. It finds each worker and checks: are they wearing a helmet? This happens automatically, no human review needed." },
              { step: "03", icon: "🚨", title: "Violations are flagged instantly", desc: "Every worker without a helmet gets a red marker. Every worker wearing one gets a green marker. You can see exactly who, where, and when in the video the violations occurred." },
              { step: "04", icon: "📊", title: "Download your compliance report", desc: "Get a full report: overall compliance rate, worker count, violation timeline, and an annotated video you can share with site managers, inspectors, or clients." },
            ].map(({ step, icon, title, desc }, i) => (
              <FadeUp key={step} delay={i * 0.08} stretch>
                <div style={{ border: "1px solid #21262D", borderRadius: "10px", padding: "28px", backgroundColor: "#0D1117", display: "flex", gap: "20px", transition: "border-color 0.2s", cursor: "default", height: "100%", boxSizing: "border-box" }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#30363D"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "#21262D"}
                >
                  <div style={{ flexShrink: 0 }}>
                    <p style={{ ...s.mono, fontSize: "10px", ...s.amber, margin: "0 0 4px" }}>{step}</p>
                    <div style={{ fontSize: "24px" }}>{icon}</div>
                  </div>
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "#E6EDF3", margin: "0 0 8px" }}>{title}</p>
                    <p style={{ fontSize: "13px", ...s.muted, lineHeight: 1.65, margin: 0 }}>{desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ borderBottom: "1px solid #21262D", backgroundColor: "#0D1117" }}>
        <div style={{ ...s.section, padding: "100px 48px" }}>
          <FadeUp>
            <p style={{ ...s.mono, fontSize: "10px", ...s.amber, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>Capabilities</p>
            <h2 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 64px", color: "#E6EDF3" }}>Built for the real world</h2>
          </FadeUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", backgroundColor: "#21262D", border: "1px solid #21262D", borderRadius: "10px", overflow: "hidden" }}>
            {[
              { icon: "⚡", title: "Real-time detection", desc: "Processes video feeds frame by frame, detecting every worker and checking helmet compliance in milliseconds." },
              { icon: "🎯", title: "92% accuracy", desc: "Fine-tuned on 3,000+ labeled images of real construction and factory workers across lighting conditions and angles." },
              { icon: "📊", title: "Full compliance reports", desc: "Per-video compliance rates, violation timelines, worker counts — everything a safety manager needs in one place." },
              { icon: "📹", title: "Any camera, any format", desc: "Works with MP4, AVI, MOV, MKV, JPG, and PNG. CCTV, mobile phone, or drone footage — all accepted." },
              { icon: "🏗", title: "Scales to any site size", desc: "From a single camera to a full CCTV network. The architecture is designed for enterprise-scale deployment." },
              { icon: "🔒", title: "Data stays private", desc: "All processing happens on your own server. No video data is sent to external services or third parties." },
            ].map(({ icon, title, desc }, i) => (
              <FadeUp key={title} delay={i * 0.06}>
                <div style={{ backgroundColor: "#0D1117", padding: "32px", height: "100%", boxSizing: "border-box", transition: "background-color 0.2s", cursor: "default" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#161B22"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#0D1117"}
                >
                  <div style={{ fontSize: "24px", marginBottom: "14px" }}>{icon}</div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#E6EDF3", margin: "0 0 8px" }}>{title}</p>
                  <p style={{ fontSize: "13px", ...s.muted, lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ borderBottom: "1px solid #21262D" }}>
        <div style={{ ...s.section, padding: "100px 48px" }}>
          <FadeUp>
            <p style={{ ...s.mono, fontSize: "10px", ...s.amber, textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 12px" }}>FAQ</p>
            <h2 style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 12px", color: "#E6EDF3" }}>Common questions</h2>
            <p style={{ fontSize: "16px", ...s.muted, margin: "0 0 56px", lineHeight: 1.6 }}>Everything you need to know before getting started.</p>
          </FadeUp>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {FAQS.map(({ q, a }, i) => {
              const open = openFaq === i;
              return (
                <FadeUp key={i} delay={i * 0.04}>
                  <div style={{ border: "1px solid #21262D", borderRadius: "8px", overflow: "hidden", transition: "border-color 0.2s", marginBottom: "2px", borderColor: open ? "#30363D" : "#21262D" }}>
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", background: open ? "#0F141A" : "#0D1117", border: "none", cursor: "pointer", textAlign: "left", transition: "background-color 0.2s", gap: "16px" }}
                      onMouseEnter={(e) => { if (!open) e.currentTarget.style.backgroundColor = "#0F141A"; }}
                      onMouseLeave={(e) => { if (!open) e.currentTarget.style.backgroundColor = "#0D1117"; }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#E6EDF3", lineHeight: 1.4 }}>{q}</span>
                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "1px solid #30363D", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "rotate(0)" }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M5 2v6M2 5h6" stroke="#7D8590" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </button>
                    {open && (
                      <div style={{ padding: "0 24px 20px", backgroundColor: "#0F141A" }}>
                        <p style={{ fontSize: "14px", ...s.muted, lineHeight: 1.75, margin: 0, paddingTop: "4px", borderTop: "1px solid #21262D", paddingTop: "16px" }}>{a}</p>
                      </div>
                    )}
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div style={{ ...s.section, padding: "100px 48px", textAlign: "center" }}>
          <FadeUp>
            <h2 style={{ fontSize: "48px", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 16px", color: "#E6EDF3" }}>Ready to monitor your site?</h2>
            <p style={{ fontSize: "16px", ...s.muted, margin: "0 0 48px", lineHeight: 1.7 }}>
              Upload a video and get your first compliance report in minutes.<br/>No technical setup. No training required.
            </p>
            <Link to="/dashboard"
              style={{ ...s.mono, fontSize: "13px", fontWeight: 700, color: "#080C10", backgroundColor: "#F0A500", textDecoration: "none", padding: "16px 36px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.1em", display: "inline-block", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#D4920A"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(240,165,0,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#F0A500"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >Get started →</Link>
          </FadeUp>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid #21262D", padding: "32px 48px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "24px", height: "24px", backgroundColor: "#F0A500", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" fill="#080C10"/>
              </svg>
            </div>
            <span style={{ ...s.mono, fontSize: "11px", ...s.muted }}>© {new Date().getFullYear()} SafetyVision. All rights reserved.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#3FB950" }} />
            <span style={{ ...s.mono, fontSize: "10px", ...s.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>YOLOv8 · Flask · React · CUDA</span>
          </div>
        </div>
      </footer>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}