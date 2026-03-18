import { createContext, useContext } from "react";
import { useAdminPin } from "./AdminPinContext";
import { useInternetIdentity } from "./useInternetIdentity";

interface UserRoleContextValue {
  isAdmin: boolean;
  isApproved: boolean;
  isLoading: boolean;
  refresh: () => void;
}

const UserRoleContext = createContext<UserRoleContextValue>({
  isAdmin: false,
  isApproved: true,
  isLoading: false,
  refresh: () => {},
});

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const { isAdminUnlocked } = useAdminPin();

  return (
    <UserRoleContext.Provider
      value={{
        isAdmin: isAdminUnlocked,
        isApproved: isLoggedIn,
        isLoading: false,
        refresh: () => {},
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole(): UserRoleContextValue {
  return useContext(UserRoleContext);
}
