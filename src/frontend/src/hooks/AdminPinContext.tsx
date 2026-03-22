import { createContext, useContext, useState } from "react";

const ADMIN_PIN = "1750"; // Change this to set your secret PIN
const SESSION_KEY = "spinmill_admin_unlocked";

interface AdminPinContextValue {
  isAdminUnlocked: boolean;
  unlockAdmin: (pin: string) => boolean;
  lockAdmin: () => void;
}

const AdminPinContext = createContext<AdminPinContextValue>({
  isAdminUnlocked: false,
  unlockAdmin: () => false,
  lockAdmin: () => {},
});

export function AdminPinProvider({ children }: { children: React.ReactNode }) {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "true",
  );

  function unlockAdmin(pin: string): boolean {
    if (pin === ADMIN_PIN) {
      setIsAdminUnlocked(true);
      sessionStorage.setItem(SESSION_KEY, "true");
      return true;
    }
    return false;
  }

  function lockAdmin() {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem(SESSION_KEY);
  }

  return (
    <AdminPinContext.Provider
      value={{ isAdminUnlocked, unlockAdmin, lockAdmin }}
    >
      {children}
    </AdminPinContext.Provider>
  );
}

export function useAdminPin() {
  return useContext(AdminPinContext);
}
