// src/context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "../services/api";
import { toast } from "./ToastContext";   

export const AuthContext = createContext(null);

// Keep these in sync with the backend's role choices.
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  RECEPTIONIST: "RECEPTIONIST",
  CASHIER: "CASHIER",
  NURSE: "NURSE",
  DOCTOR: "DOCTOR",
  LAB_TECHNOLOGIST: "LAB_TECHNOLOGIST",
  RADIOLOGIST: "RADIOLOGIST",
  PHARMACIST: "PHARMACIST",
  ACCOUNTANT: "ACCOUNTANT",
  MORTUARY_ATTENDANT: "MORTUARY_ATTENDANT",
  HR_OFFICER: "HR_OFFICER",
  PROCUREMENT_OFFICER: "PROCUREMENT_OFFICER",
  AMBULANCE_DISPATCHER: "AMBULANCE_DISPATCHER",
  HEALTH_RECORDS_OFFICER: "HEALTH_RECORDS_OFFICER",
  MEDICAL_RECORDS_OFFICER: "MEDICAL_RECORDS_OFFICER",
  BIOMEDICAL_ENGINEER: "BIOMEDICAL_ENGINEER",
  IT_SUPPORT_OFFICER: "IT_SUPPORT_OFFICER",
  GROUP_ADMIN: "GROUP_ADMIN",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  /**
   * Step 1 of login: username + password.
   * - If the backend bypasses OTP (DEBUG=True), the response already
   *   contains tokens + user — we log in immediately, same as before.
   * - Otherwise the response is { otp_required: true, user_id } and no
   *   tokens are issued yet; the caller (Login.jsx) should show the OTP
   *   step and call verifyOtp() next.
   */
  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    if (data.otp_required) {
      return { otpRequired: true, userId: data.user_id };
    }
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    setUser(data.user);
    return { otpRequired: false, user: data.user };
  }, []);

  /** Step 2 of login: submit the emailed OTP code to complete authentication. */
  const verifyOtp = useCallback(async (userId, code) => {
    const data = await api.verifyLoginOTP({ user_id: userId, code });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    setUser(data.user);
    return data.user;
  }, []);

  const resendOtp = useCallback(async (userId) => {
    return api.resendLoginOTP({ user_id: userId });
  }, []);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      if (refresh) await api.logout(refresh);
    } catch {
      // ignore network errors on logout
    } finally {
      localStorage.clear();
      setUser(null);
      toast.success("Logged out successfully");  
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api.getMe();
    setUser(me);
    return me;
  }, []);

  // Super Admin always passes, regardless of which roles are asked for.
  // hasRole() with no args just checks "is there a logged-in user".
  // NOTE: because of the Super Admin bypass below, hasRole("GROUP_ADMIN")
  // is NOT a safe way to check GROUP_ADMIN-exclusivity — it also returns
  // true for SUPER_ADMIN. Use the separate isGroupAdmin boolean for any
  // check that must be GROUP_ADMIN-only (e.g. the branch switcher).
  const hasRole = useCallback(
    (...roles) => {
      if (!user?.role) return false;
      if (user.role === ROLES.SUPER_ADMIN) return true;
      if (roles.length === 0) return true;
      return roles.includes(user.role);
    },
    [user]
  );

  // Strict, non-bypassed check — true only for an actual GROUP_ADMIN account.
  const isGroupAdmin = user?.role === ROLES.GROUP_ADMIN;

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    isGroupAdmin,
    loading,
    login,
    verifyOtp,
    resendOtp,
    logout,
    refreshUser,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}