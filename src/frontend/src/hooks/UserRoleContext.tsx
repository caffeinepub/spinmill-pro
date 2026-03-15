import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

interface UserRoleContextValue {
  isAdmin: boolean;
  isApproved: boolean;
  isLoading: boolean;
  refresh: () => void;
}

const UserRoleContext = createContext<UserRoleContextValue>({
  isAdmin: false,
  isApproved: false,
  isLoading: false,
  refresh: () => {},
});

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;

  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  // refreshTick is used to trigger manual refreshes
  useEffect(() => {
    void refreshTick; // consumed so the effect re-runs on refresh
    if (!isLoggedIn || !actor || isFetching) {
      setIsAdmin(false);
      setIsApproved(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function checkRole() {
      try {
        const a = actor as any;
        const [approved, roleResult] = await Promise.all([
          a.isCallerApproved() as Promise<boolean>,
          a.getCallerUserRole(),
        ]);
        if (cancelled) return;
        const roleKey =
          roleResult && typeof roleResult === "object"
            ? Object.keys(roleResult as object)[0]
            : String(roleResult);
        setIsAdmin(roleKey === "admin");
        setIsApproved(approved || roleKey === "admin");
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setIsApproved(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkRole();
    return () => {
      cancelled = true;
    };
  }, [actor, isFetching, isLoggedIn, refreshTick]); // eslint-disable-line

  return (
    <UserRoleContext.Provider
      value={{ isAdmin, isApproved, isLoading, refresh }}
    >
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole(): UserRoleContextValue {
  return useContext(UserRoleContext);
}
