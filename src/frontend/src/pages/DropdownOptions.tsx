import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/PageHeader";
import { useDropdownOptionsContext } from "../hooks/DropdownOptionsContext";
import type { LabeledOption } from "../hooks/useDropdownOptions";

// ─── Types ────────────────────────────────────────────────────────────────────

type ListId =
  | "materialNames"
  | "departments"
  | "productTypes"
  | "endUses"
  | "destinations";

interface ListConfig {
  id: ListId;
  title: string;
  description: string;
  type: "simple" | "labeled";
}

const LIST_CONFIGS: ListConfig[] = [
  {
    id: "materialNames",
    title: "Material Names",
    description: "Used in Purchase Orders, Inward Entry, and Material Issue",
    type: "simple",
  },
  {
    id: "departments",
    title: "Departments",
    description: "Used in Material Issue department dropdown",
    type: "simple",
  },
  {
    id: "productTypes",
    title: "Product Types",
    description: "Used in Production Orders product type dropdown",
    type: "labeled",
  },
  {
    id: "endUses",
    title: "End Uses",
    description: "Used in Production Orders end use dropdown",
    type: "labeled",
  },
  {
    id: "destinations",
    title: "Dispatch Destinations",
    description: "Used in Yarn Dispatch destination dropdown",
    type: "labeled",
  },
];

// ─── Simple List Editor ────────────────────────────────────────────────────────

interface SimpleListEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
  onReset: () => void;
}

function SimpleListEditor({ items, onChange, onReset }: SimpleListEditorProps) {
  const [newItem, setNewItem] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      toast.error("This option already exists");
      return;
    }
    onChange([...items, trimmed]);
    setNewItem("");
    toast.success(`"${trimmed}" added`);
  }

  function removeItem(idx: number) {
    const updated = items.filter((_, i) => i !== idx);
    onChange(updated);
    toast.success("Option removed");
  }

  function startEdit(idx: number) {
    setEditIdx(idx);
    setEditValue(items[idx]);
  }

  function saveEdit(idx: number) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (items.some((it, i) => it === trimmed && i !== idx)) {
      toast.error("This option already exists");
      return;
    }
    const updated = [...items];
    updated[idx] = trimmed;
    onChange(updated);
    setEditIdx(null);
    toast.success("Option updated");
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const updated = [...items];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    onChange(updated);
  }

  function moveDown(idx: number) {
    if (idx === items.length - 1) return;
    const updated = [...items];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/60 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No options yet. Add one below.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Option
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right w-32">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow
                  key={item}
                  data-ocid={`dropdown-options.simple.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/30 transition-colors"
                >
                  <TableCell>
                    {editIdx === idx ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(idx);
                            if (e.key === "Escape") setEditIdx(null);
                          }}
                          className="h-7 text-sm"
                          autoFocus
                          data-ocid="dropdown-options.edit.input"
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => saveEdit(idx)}
                          data-ocid="dropdown-options.edit.save_button"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setEditIdx(null)}
                          data-ocid="dropdown-options.edit.cancel_button"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm">{item}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        data-ocid={`dropdown-options.simple.move_up.${idx + 1}`}
                        title="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveDown(idx)}
                        disabled={idx === items.length - 1}
                        data-ocid={`dropdown-options.simple.move_down.${idx + 1}`}
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(idx)}
                        data-ocid={`dropdown-options.simple.edit_button.${idx + 1}`}
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(idx)}
                        data-ocid={`dropdown-options.simple.delete_button.${idx + 1}`}
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Row */}
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Type new option and press Enter or click Add"
          className="h-8 text-sm"
          data-ocid="dropdown-options.new_item.input"
        />
        <Button
          size="sm"
          className="gap-1.5 h-8 shrink-0"
          onClick={addItem}
          data-ocid="dropdown-options.add_item.button"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 shrink-0 text-muted-foreground"
          onClick={() => {
            onReset();
            toast.success("Reset to defaults");
          }}
          data-ocid="dropdown-options.reset.button"
          title="Reset to defaults"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}

// ─── Labeled List Editor ───────────────────────────────────────────────────────

interface LabeledListEditorProps {
  items: LabeledOption[];
  onChange: (items: LabeledOption[]) => void;
  onReset: () => void;
}

function LabeledListEditor({
  items,
  onChange,
  onReset,
}: LabeledListEditorProps) {
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");

  function slugify(label: string): string {
    return label
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  function addItem() {
    const label = newLabel.trim();
    if (!label) return;
    const value = newValue.trim() || slugify(label);
    if (items.some((it) => it.value === value)) {
      toast.error("An option with this key already exists");
      return;
    }
    onChange([...items, { value, label }]);
    setNewLabel("");
    setNewValue("");
    toast.success(`"${label}" added`);
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
    toast.success("Option removed");
  }

  function startEdit(idx: number) {
    setEditIdx(idx);
    setEditLabel(items[idx].label);
    setEditValue(items[idx].value);
  }

  function saveEdit(idx: number) {
    const label = editLabel.trim();
    const value = editValue.trim();
    if (!label || !value) return;
    if (items.some((it, i) => it.value === value && i !== idx)) {
      toast.error("This key already exists");
      return;
    }
    const updated = [...items];
    updated[idx] = { value, label };
    onChange(updated);
    setEditIdx(null);
    toast.success("Option updated");
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const updated = [...items];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    onChange(updated);
  }

  function moveDown(idx: number) {
    if (idx === items.length - 1) return;
    const updated = [...items];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/60 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No options yet. Add one below.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Display Label
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">
                  Key (value)
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right w-36">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow
                  key={`${item.value}-${idx}`}
                  data-ocid={`dropdown-options.labeled.item.${idx + 1}`}
                  className="border-border/40 hover:bg-muted/30 transition-colors"
                >
                  {editIdx === idx ? (
                    <>
                      <TableCell>
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="h-7 text-sm"
                          placeholder="Display label"
                          autoFocus
                          data-ocid="dropdown-options.labeled.edit.label_input"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 text-sm font-mono"
                          placeholder="key"
                          data-ocid="dropdown-options.labeled.edit.value_input"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => saveEdit(idx)}
                            data-ocid="dropdown-options.labeled.save_button"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setEditIdx(null)}
                            data-ocid="dropdown-options.labeled.cancel_button"
                          >
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-sm font-medium">
                        {item.label}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {item.value}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                            data-ocid={`dropdown-options.labeled.move_up.${idx + 1}`}
                            title="Move up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveDown(idx)}
                            disabled={idx === items.length - 1}
                            data-ocid={`dropdown-options.labeled.move_down.${idx + 1}`}
                            title="Move down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEdit(idx)}
                            data-ocid={`dropdown-options.labeled.edit_button.${idx + 1}`}
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(idx)}
                            data-ocid={`dropdown-options.labeled.delete_button.${idx + 1}`}
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          value={newLabel}
          onChange={(e) => {
            setNewLabel(e.target.value);
            if (!newValue) {
              // Auto-suggest value
            }
          }}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Display label (e.g. Polyester Blend)"
          className="h-8 text-sm flex-1 min-w-[160px]"
          data-ocid="dropdown-options.new_label.input"
        />
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Key (auto if blank)"
          className="h-8 text-sm w-40 font-mono"
          data-ocid="dropdown-options.new_value.input"
        />
        <Button
          size="sm"
          className="gap-1.5 h-8 shrink-0"
          onClick={addItem}
          data-ocid="dropdown-options.add_labeled.button"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 shrink-0 text-muted-foreground"
          onClick={() => {
            onReset();
            toast.success("Reset to defaults");
          }}
          data-ocid="dropdown-options.reset_labeled.button"
          title="Reset to defaults"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DropdownOptionsPage() {
  const store = useDropdownOptionsContext();
  const [activeList, setActiveList] = useState<ListId>("materialNames");

  const activeConfig = LIST_CONFIGS.find((c) => c.id === activeList)!;

  function renderEditor() {
    switch (activeList) {
      case "materialNames":
        return (
          <SimpleListEditor
            items={store.materialNames}
            onChange={store.setMaterialNames}
            onReset={store.resetMaterialNames}
          />
        );
      case "departments":
        return (
          <SimpleListEditor
            items={store.departments}
            onChange={store.setDepartments}
            onReset={store.resetDepartments}
          />
        );
      case "productTypes":
        return (
          <LabeledListEditor
            items={store.productTypes}
            onChange={store.setProductTypes}
            onReset={store.resetProductTypes}
          />
        );
      case "endUses":
        return (
          <LabeledListEditor
            items={store.endUses}
            onChange={store.setEndUses}
            onReset={store.resetEndUses}
          />
        );
      case "destinations":
        return (
          <LabeledListEditor
            items={store.destinations}
            onChange={store.setDestinations}
            onReset={store.resetDestinations}
          />
        );
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Dropdown Options"
        description="Manage the options available in dropdown menus across the application"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left: list selector */}
        <div className="md:col-span-1 space-y-1">
          {LIST_CONFIGS.map((cfg) => (
            <button
              key={cfg.id}
              type="button"
              data-ocid={`dropdown-options.list_tab.${cfg.id}`}
              onClick={() => setActiveList(cfg.id)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                activeList === cfg.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <span className="block font-medium text-[13px]">{cfg.title}</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {cfg.description}
              </span>
            </button>
          ))}
        </div>

        {/* Right: editor */}
        <div className="md:col-span-3">
          <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {activeConfig.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeConfig.description}
              </p>
            </div>
            <div className="border-t border-border/40 pt-4">
              {renderEditor()}
            </div>
          </div>
        </div>
      </div>

      {/* Help note */}
      <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 p-3">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Changes are saved locally in your browser and take effect immediately
          in all forms. Use the Reset button to restore the original default
          options.
        </p>
      </div>
    </div>
  );
}
