import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

// Safe helper to decode JWT payload supporting Base64URL and UTF-8
export const decodeJwtPayload = (token) => {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return false; // If unparseable but present, let server validate
  return payload.exp * 1000 < Date.now();
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Restore user from localStorage on mount
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (token && storedUser) {
      if (!isTokenExpired(token)) {
        try {
          return JSON.parse(storedUser);
        } catch {
          return null;
        }
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return null;
      }
    }
    return null;
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // Check token expiry periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token && isTokenExpired(token)) {
        logout();
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
