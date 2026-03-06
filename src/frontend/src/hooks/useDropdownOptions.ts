/**
 * useDropdownOptions — centralized, editable dropdown lists stored in localStorage.
 * Provides default values on first use and allows admin to add/remove/reorder items.
 */

import { useCallback, useState } from "react";

// ─── Default Lists ─────────────────────────────────────────────────────────────

export const DEFAULT_MATERIAL_NAMES = [
  "Cotton",
  "Comber Noil",
  "Flat strips",
  "Polyester",
  "RP",
  "Viscose",
  "Bamboo",
  "Silver Ionic",
  "Break comber",
  "Navy Blue",
  "Further Cotton",
  "US Cotton",
];

export const DEFAULT_DEPARTMENTS = [
  "Blowroom",
  "Carding",
  "Drawing",
  "Combing",
  "Roving",
  "Ring Frame",
  "Autocoro",
  "OE",
];

export const DEFAULT_PRODUCT_TYPES = [
  { value: "carded", label: "Carded" },
  { value: "combed", label: "Combed" },
  { value: "polyester", label: "Polyester" },
  { value: "bamboo", label: "Bamboo" },
  { value: "viscose", label: "Viscose" },
  { value: "lt", label: "LT" },
];

export const DEFAULT_END_USES = [
  { value: "warp", label: "Warp" },
  { value: "weft", label: "Weft" },
  { value: "pile", label: "Pile" },
  { value: "ground", label: "Ground" },
  { value: "tfo", label: "TFO" },
];

export const DEFAULT_DESTINATIONS = [
  { value: "weaving", label: "Weaving" },
  { value: "kolhapur", label: "Kolhapur" },
  { value: "ambala", label: "Ambala" },
  { value: "outside", label: "Outside" },
  { value: "amravati", label: "Amravati" },
  { value: "softWinding", label: "Soft Winding" },
  { value: "tfo", label: "TFO" },
];

// ─── Storage Keys ──────────────────────────────────────────────────────────────

const KEYS = {
  materialNames: "spinmill_material_names",
  departments: "spinmill_departments",
  productTypes: "spinmill_product_types",
  endUses: "spinmill_end_uses",
  destinations: "spinmill_destinations",
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function loadList<T>(key: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    // ignore
  }
  return defaults;
}

function saveList<T>(key: string, list: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface LabeledOption {
  value: string;
  label: string;
}

export interface DropdownOptionsStore {
  materialNames: string[];
  departments: string[];
  productTypes: LabeledOption[];
  endUses: LabeledOption[];
  destinations: LabeledOption[];

  setMaterialNames: (list: string[]) => void;
  setDepartments: (list: string[]) => void;
  setProductTypes: (list: LabeledOption[]) => void;
  setEndUses: (list: LabeledOption[]) => void;
  setDestinations: (list: LabeledOption[]) => void;

  resetMaterialNames: () => void;
  resetDepartments: () => void;
  resetProductTypes: () => void;
  resetEndUses: () => void;
  resetDestinations: () => void;
}

export function useDropdownOptions(): DropdownOptionsStore {
  const [materialNames, setMaterialNamesState] = useState<string[]>(() =>
    loadList(KEYS.materialNames, DEFAULT_MATERIAL_NAMES),
  );
  const [departments, setDepartmentsState] = useState<string[]>(() =>
    loadList(KEYS.departments, DEFAULT_DEPARTMENTS),
  );
  const [productTypes, setProductTypesState] = useState<LabeledOption[]>(() =>
    loadList(KEYS.productTypes, DEFAULT_PRODUCT_TYPES),
  );
  const [endUses, setEndUsesState] = useState<LabeledOption[]>(() =>
    loadList(KEYS.endUses, DEFAULT_END_USES),
  );
  const [destinations, setDestinationsState] = useState<LabeledOption[]>(() =>
    loadList(KEYS.destinations, DEFAULT_DESTINATIONS),
  );

  const setMaterialNames = useCallback((list: string[]) => {
    saveList(KEYS.materialNames, list);
    setMaterialNamesState(list);
  }, []);

  const setDepartments = useCallback((list: string[]) => {
    saveList(KEYS.departments, list);
    setDepartmentsState(list);
  }, []);

  const setProductTypes = useCallback((list: LabeledOption[]) => {
    saveList(KEYS.productTypes, list);
    setProductTypesState(list);
  }, []);

  const setEndUses = useCallback((list: LabeledOption[]) => {
    saveList(KEYS.endUses, list);
    setEndUsesState(list);
  }, []);

  const setDestinations = useCallback((list: LabeledOption[]) => {
    saveList(KEYS.destinations, list);
    setDestinationsState(list);
  }, []);

  const resetMaterialNames = useCallback(() => {
    saveList(KEYS.materialNames, DEFAULT_MATERIAL_NAMES);
    setMaterialNamesState(DEFAULT_MATERIAL_NAMES);
  }, []);

  const resetDepartments = useCallback(() => {
    saveList(KEYS.departments, DEFAULT_DEPARTMENTS);
    setDepartmentsState(DEFAULT_DEPARTMENTS);
  }, []);

  const resetProductTypes = useCallback(() => {
    saveList(KEYS.productTypes, DEFAULT_PRODUCT_TYPES);
    setProductTypesState(DEFAULT_PRODUCT_TYPES);
  }, []);

  const resetEndUses = useCallback(() => {
    saveList(KEYS.endUses, DEFAULT_END_USES);
    setEndUsesState(DEFAULT_END_USES);
  }, []);

  const resetDestinations = useCallback(() => {
    saveList(KEYS.destinations, DEFAULT_DESTINATIONS);
    setDestinationsState(DEFAULT_DESTINATIONS);
  }, []);

  return {
    materialNames,
    departments,
    productTypes,
    endUses,
    destinations,
    setMaterialNames,
    setDepartments,
    setProductTypes,
    setEndUses,
    setDestinations,
    resetMaterialNames,
    resetDepartments,
    resetProductTypes,
    resetEndUses,
    resetDestinations,
  };
}
