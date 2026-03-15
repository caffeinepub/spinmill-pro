import { createContext, useContext } from "react";
import { useInternetIdentity } from "./useInternetIdentity";

interface UserRoleContextValue {
  isAdmin: boolean;
  isApproved: boolean;
  isLoading: boolean;
  refresh: () => void;
}

const UserRoleContext = createContext<UserRoleContextValue>({
  isAdmin: true,
  isApproved: true,
  isLoading: false,
  refresh: () => {},
});

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;

  return (
    <UserRoleContext.Provider
      value={{
        isAdmin: isLoggedIn,
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
