import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function InputField({ label, type, value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", fontWeight: 700, color: "#7D8590", textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width:           "100%",
          padding:         "11px 14px",
          borderRadius:    "8px",
          border:          `1px solid ${focused ? "rgba(240,165,0,0.5)" : "#21262D"}`,
          backgroundColor: focused ? "#0D1117" : "#161B22",
          color:           "#E6EDF3",
          fontFamily:      "Inter, sans-serif",
          fontSize:        "14px",
          outline:         "none",
          boxSizing:       "border-box",
          transition:      "border-color 0.15s, background-color 0.15s",
          boxShadow:       focused ? "0 0 0 3px rgba(240,165,0,0.08)" : "none",
        }}
      />
    </div>
  );
}

export default function AuthPage() {
  const [tab,      setTab]      = useState("login");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const { login, signup } = useAuth();
  const navigate          = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:       "100vh",
      backgroundColor: "#080C10",
      display:         "flex",
      flexDirection:   "column",
      alignItems:      "center",
      justifyContent:  "center",
      padding:         "24px",
      fontFamily:      "Inter, sans-serif",
    }}>

      <div style={{ marginBottom: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "44px", height: "44px", backgroundColor: "#F0A500", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6l-9-4z" fill="#080C10"/>
            <path d="M9 12l2 2 4-4" stroke="#F0A500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "20px", fontWeight: 800, color: "#E6EDF3", margin: 0, letterSpacing: "-0.02em" }}>SafetyVision</p>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.12em" }}>AI-powered PPE Detection</p>
        </div>
      </div>

      <div style={{
        width:           "100%",
        maxWidth:        "400px",
        backgroundColor: "#0D1117",
        border:          "1px solid #21262D",
        borderRadius:    "14px",
        overflow:        "hidden",
      }}>

        <div style={{ display: "flex", borderBottom: "1px solid #21262D" }}>
          {[
            { key: "login",  label: "Sign In" },
            { key: "signup", label: "Create Account" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(""); }}
              style={{
                flex:            1,
                padding:         "16px 0",
                background:      "none",
                border:          "none",
                borderBottom:    tab === key ? "2px solid #F0A500" : "2px solid transparent",
                fontFamily:      "Inter, sans-serif",
                fontSize:        "13px",
                fontWeight:      tab === key ? 600 : 400,
                color:           tab === key ? "#E6EDF3" : "#7D8590",
                cursor:          "pointer",
                transition:      "color 0.15s",
                marginBottom:    "-1px",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "28px 28px 32px", display: "flex", flexDirection: "column", gap: "18px" }}>

          {tab === "signup" && (
            <InputField
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              autoComplete="name"
            />
          )}

          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tab === "signup" ? "At least 6 characters" : "Your password"}
            autoComplete={tab === "signup" ? "new-password" : "current-password"}
          />

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "rgba(218,54,51,0.08)", border: "1px solid rgba(218,54,51,0.2)", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#DA3633", lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width:           "100%",
              padding:         "12px 0",
              borderRadius:    "8px",
              border:          "none",
              backgroundColor: loading ? "#9A6800" : "#F0A500",
              color:           "#080C10",
              fontFamily:      "JetBrains Mono, monospace",
              fontSize:        "11px",
              fontWeight:      700,
              textTransform:   "uppercase",
              letterSpacing:   "0.1em",
              cursor:          loading ? "not-allowed" : "pointer",
              transition:      "background-color 0.2s",
              marginTop:       "4px",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#D4920A"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#F0A500"; }}
          >
            {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
          </button>

          <p style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#4A5568", margin: 0 }}>
            {tab === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setTab(tab === "login" ? "signup" : "login"); setError(""); }}
              style={{ background: "none", border: "none", color: "#F0A500", fontSize: "12px", cursor: "pointer", fontFamily: "Inter, sans-serif", padding: 0 }}
            >
              {tab === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        </form>
      </div>

      <p style={{ marginTop: "24px", fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "#4A5568", textAlign: "center", letterSpacing: "0.05em" }}>
        Your data is private and scoped to your account.
      </p>
    </div>
  );
}