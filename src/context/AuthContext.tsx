import React, { createContext, useContext, useState } from 'react';
import { Role, User } from '../types';

interface AuthContextType {
  currentUser: User;
  switchRole: (role: Role, stallId?: string | null) => void;
  availableUsers: User[];
}

const defaultUsers: User[] = [
  { id: "usr-guest", name: "Guest Diner (Table T17)", email: "guest@table-t17.local", role: "CUSTOMER", stallId: null },
  { id: "usr-1", name: "Chief Administrator", email: "admin@vivacity.local", role: "SUPER ADMIN", stallId: null },
  { id: "usr-2", name: "Food Court Manager", email: "manager@vivacity.local", role: "MANAGER", stallId: null },
  { id: "usr-3", name: "Counter Cashier (Hasan)", email: "cashier@vivacity.local", role: "CASHIER", stallId: null },
  { id: "usr-4", name: "Fusion Cafe Manager", email: "fusion@vivacity.local", role: "STALL MANAGER", stallId: "fusion-cafe" },
  { id: "usr-5", name: "Top Town Manager", email: "toptown@vivacity.local", role: "STALL MANAGER", stallId: "top-town" },
  { id: "usr-6", name: "Momo Buzz Manager", email: "momobuzz@vivacity.local", role: "STALL MANAGER", stallId: "momo-buzz" },
  { id: "usr-7", name: "Waffle City Manager", email: "wafflecity@vivacity.local", role: "STALL MANAGER", stallId: "waffle-city" },
  { id: "usr-8", name: "Live Station Manager", email: "livestation@vivacity.local", role: "STALL MANAGER", stallId: "live-station" },
  { id: "usr-9", name: "Burger Bar Manager", email: "burgerbar@vivacity.local", role: "STALL MANAGER", stallId: "burger-bar" },
  { id: "usr-12", name: "Drinks & Beverage Manager", email: "drinks@vivacity.local", role: "STALL MANAGER", stallId: "drinks-beverage" },
  { id: "usr-10", name: "Head Chef (Kitchen KDS)", email: "kitchen@vivacity.local", role: "KITCHEN STAFF", stallId: null },
  { id: "usr-11", name: "Floor Runner (Kabir)", email: "runner@vivacity.local", role: "RUNNER / WAITER", stallId: null },
];

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vivacity_user');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return defaultUsers[0]; // Customer default
  });

  const switchRole = (role: Role, stallId: string | null = null) => {
    let matched = defaultUsers.find(u => u.role === role && (!stallId || u.stallId === stallId));
    if (!matched) {
      matched = {
        id: `usr-${Date.now()}`,
        name: `${role} User`,
        email: `${role.toLowerCase().replace(/\s+/g, '')}@vivacity.local`,
        role,
        stallId
      };
    }
    setCurrentUser(matched);
    localStorage.setItem('vivacity_user', JSON.stringify(matched));
  };

  return (
    <AuthContext.Provider value={{ currentUser, switchRole, availableUsers: defaultUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
