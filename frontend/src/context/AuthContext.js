import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";
const TOKEN_KEY = "sv_token";
const USER_KEY  = "sv_user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((token) => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, []);

  useEffect(() => {
    const token      = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (token && storedUser) {
      applyToken(token);
      setUser(JSON.parse(storedUser));

      axios.get(`${API}/auth/me`)
        .then((r) => {
          setUser(r.data);
          localStorage.setItem(USER_KEY, JSON.stringify(r.data));
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          applyToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [applyToken]);

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { token, user: u } = res.data;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    applyToken(token);
    setUser(u);
    return u;
  }, [applyToken]);

  const signup = useCallback(async (name, email, password) => {
    const res = await axios.post(`${API}/auth/signup`, { name, email, password });
    const { token, user: u } = res.data;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    applyToken(token);
    setUser(u);
    return u;
  }, [applyToken]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}