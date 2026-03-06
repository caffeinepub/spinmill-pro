import { createContext, useContext } from "react";
import {
  type DropdownOptionsStore,
  useDropdownOptions,
} from "./useDropdownOptions";

const DropdownOptionsContext = createContext<DropdownOptionsStore | null>(null);

export function DropdownOptionsProvider({
  children,
}: { children: React.ReactNode }) {
  const store = useDropdownOptions();
  return (
    <DropdownOptionsContext.Provider value={store}>
      {children}
    </DropdownOptionsContext.Provider>
  );
}

export function useDropdownOptionsContext(): DropdownOptionsStore {
  const ctx = useContext(DropdownOptionsContext);
  if (!ctx)
    throw new Error(
      "useDropdownOptionsContext must be used inside DropdownOptionsProvider",
    );
  return ctx;
}
