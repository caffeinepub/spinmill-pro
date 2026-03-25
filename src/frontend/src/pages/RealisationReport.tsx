import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calculator, Plus, Printer, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useInwardEntries,
  useMaterialIssues,
  usePackingEntries,
  useProductionOrders,
  useRawMaterialOpeningStock,
  useYarnCountLabels,
} from "../hooks/useQueries";
import { normalizeRecord } from "../utils/candid";

const OE_WASTE_TYPES = [
  "Lickerin Dropping",
  "Flat Strips",
  "Microdust",
  "Router Fan",
];
const RING_WASTE_TYPES = [
  "BRD",
  "LRD",
  "Flat Strips",
  "Usable Waste",
  "Microdust",
  "Metal Waste",
  "Hard Waste",
  "Sweeping Waste",
];

function lsGet<T>(key: string, def: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : def;
  } catch {
    return def;
  }
}
function lsSet(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* */
  }
}

function getNs(val: unknown): bigint {
  if (typeof val === "bigint") return val;
  try {
    return BigInt(String(val));
  } catch {
    return 0n;
  }
}
function dateToStartNs(dateStr: string): bigint {
  return BigInt(new Date(`${dateStr}T00:00:00.000Z`).getTime()) * 1_000_000n;
}
function dateToEndNs(dateStr: string): bigint {
  return BigInt(new Date(`${dateStr}T23:59:59.999Z`).getTime()) * 1_000_000n;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

interface WasteRow {
  id: string;
  wasteType: string;
  grade: string;
  qty: number;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
function firstOfMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function RealisationReport() {
  const [unit, setUnit] = useState<"oe" | "ring">("oe");
  const [fromDate, setFromDate] = useState(firstOfMonthStr());
  const [toDate, setToDate] = useState(todayStr());
  const [openingWIP, setOpeningWIP] = useState(0);
  const [closingWIP, setClosingWIP] = useState(0);
  const [wasteRows, setWasteRows] = useState<WasteRow[]>([]);
  const [newWasteType, setNewWasteType] = useState("");
  const [newWasteGrade, setNewWasteGrade] = useState("");
  const [newWasteQty, setNewWasteQty] = useState("");

  const warehouse = unit === "oe" ? "oeRawMaterial" : "ringRawMaterial";
  const spinUnitKey = unit === "oe" ? "openend" : "ringspinning";
  const unitLabel = unit === "oe" ? "OE Spinning" : "Ring Spinning";
  const wasteTypes = unit === "oe" ? OE_WASTE_TYPES : RING_WASTE_TYPES;

  useEffect(() => {
    const wipKey = `spinmill_wip_${unit}_${fromDate}_${toDate}`;
    const saved = lsGet<{ opening: number; closing: number } | null>(
      wipKey,
      null,
    );
    if (saved) {
      setOpeningWIP(saved.opening);
      setClosingWIP(saved.closing);
    } else {
      const lastClosing = lsGet<number>(`spinmill_last_closing_wip_${unit}`, 0);
      setOpeningWIP(lastClosing);
      setClosingWIP(0);
    }
    const wasteKey = `spinmill_waste_${unit}_${fromDate}_${toDate}`;
    setWasteRows(lsGet<WasteRow[]>(wasteKey, []));
    setNewWasteType("");
    setNewWasteGrade("");
    setNewWasteQty("");
  }, [unit, fromDate, toDate]);

  useEffect(() => {
    const wipKey = `spinmill_wip_${unit}_${fromDate}_${toDate}`;
    lsSet(wipKey, { opening: openingWIP, closing: closingWIP });
    lsSet(`spinmill_last_closing_wip_${unit}`, closingWIP);
  }, [openingWIP, closingWIP, unit, fromDate, toDate]);

  useEffect(() => {
    const wasteKey = `spinmill_waste_${unit}_${fromDate}_${toDate}`;
    lsSet(wasteKey, wasteRows);
  }, [wasteRows, unit, fromDate, toDate]);

  const { data: rawOpeningStockRaw } = useRawMaterialOpeningStock();
  const { data: inwardEntriesRaw } = useInwardEntries();
  const { data: materialIssuesRaw } = useMaterialIssues();
  const { data: packingEntriesRaw } = usePackingEntries();
  const { data: productionOrdersRaw } = useProductionOrders();
  const { data: yarnCountLabels } = useYarnCountLabels();

  const rawOpeningStock = useMemo(
    () =>
      Array.isArray(rawOpeningStockRaw)
        ? rawOpeningStockRaw.map((r) => normalizeRecord(r))
        : [],
    [rawOpeningStockRaw],
  );
  const inwardEntries = useMemo(
    () =>
      Array.isArray(inwardEntriesRaw)
        ? inwardEntriesRaw.map((r) => normalizeRecord(r))
        : [],
    [inwardEntriesRaw],
  );
  const materialIssues = useMemo(
    () =>
      Array.isArray(materialIssuesRaw)
        ? materialIssuesRaw.map((r) => normalizeRecord(r))
        : [],
    [materialIssuesRaw],
  );
  const packingEntries = useMemo(
    () =>
      Array.isArray(packingEntriesRaw)
        ? packingEntriesRaw.map((r) => normalizeRecord(r))
        : [],
    [packingEntriesRaw],
  );
  const productionOrders = useMemo(
    () =>
      Array.isArray(productionOrdersRaw)
        ? productionOrdersRaw.map((r) => normalizeRecord(r))
        : [],
    [productionOrdersRaw],
  );

  const sectionAData = useMemo(() => {
    const startNs = dateToStartNs(fromDate);
    const endNs = dateToEndNs(toDate);
    const wh = warehouse.toLowerCase();

    const openingMap: Record<string, number> = {};
    for (const r of rawOpeningStock) {
      if (String(r.warehouse || "").toLowerCase() === wh) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rAny = r as any;
        const mat = String(rAny.grade || rAny.materialName || "Unknown").trim();
        openingMap[mat] = (openingMap[mat] || 0) + Number(r.weightKg || 0);
      }
    }
    for (const r of inwardEntries) {
      if (String(r.warehouse || "").toLowerCase() === wh) {
        const ts = getNs(r.inwardDate);
        if (ts < startNs) {
          const mat = String(r.materialName || "Unknown").trim();
          openingMap[mat] = (openingMap[mat] || 0) + Number(r.receivedQty || 0);
        }
      }
    }
    for (const r of materialIssues) {
      if (String(r.warehouse || "").toLowerCase() === wh) {
        const ts = getNs(r.issueDate);
        if (ts < startNs) {
          const mat = String(r.materialName || "Unknown").trim();
          openingMap[mat] = (openingMap[mat] || 0) - Number(r.issuedQty || 0);
        }
      }
    }

    const inwardMap: Record<string, number> = {};
    for (const r of inwardEntries) {
      if (String(r.warehouse || "").toLowerCase() === wh) {
        const ts = getNs(r.inwardDate);
        if (ts >= startNs && ts <= endNs) {
          const mat = String(r.materialName || "Unknown").trim();
          inwardMap[mat] = (inwardMap[mat] || 0) + Number(r.receivedQty || 0);
        }
      }
    }

    const issuedMap: Record<string, number> = {};
    for (const r of materialIssues) {
      if (String(r.warehouse || "").toLowerCase() === wh) {
        const ts = getNs(r.issueDate);
        if (ts >= startNs && ts <= endNs) {
          const mat = String(r.materialName || "Unknown").trim();
          issuedMap[mat] = (issuedMap[mat] || 0) + Number(r.issuedQty || 0);
        }
      }
    }

    const allGrades = new Set([
      ...Object.keys(openingMap),
      ...Object.keys(inwardMap),
      ...Object.keys(issuedMap),
    ]);

    const rows = Array.from(allGrades)
      .map((grade) => {
        const op = openingMap[grade] || 0;
        const inw = inwardMap[grade] || 0;
        const iss = issuedMap[grade] || 0;
        return {
          grade,
          openingStock: op,
          inward: inw,
          issued: iss,
          closing: op + inw - iss,
        };
      })
      .sort((a, b) => a.grade.localeCompare(b.grade));

    const totals = rows.reduce(
      (acc, r) => ({
        openingStock: acc.openingStock + r.openingStock,
        inward: acc.inward + r.inward,
        issued: acc.issued + r.issued,
        closing: acc.closing + r.closing,
      }),
      { openingStock: 0, inward: 0, issued: 0, closing: 0 },
    );

    return { rows, totals };
  }, [
    rawOpeningStock,
    inwardEntries,
    materialIssues,
    warehouse,
    fromDate,
    toDate,
  ]);

  const sectionDData = useMemo(() => {
    const startNs = dateToStartNs(fromDate);
    const endNs = dateToEndNs(toDate);

    const lotUnitMap: Record<string, string> = {};
    const lotCountMap: Record<string, string> = {};
    for (const o of productionOrders) {
      const lot = String(o.lotNumber || "").trim();
      if (lot) {
        lotUnitMap[lot] = String(o.spinningUnit || "").toLowerCase();
        const label =
          yarnCountLabels?.get(lot) || String(o.yarnCountNe || "Unknown");
        lotCountMap[lot] = label;
      }
    }

    const countQtyMap: Record<string, number> = {};
    for (const p of packingEntries) {
      const ts = getNs(p.packingDate);
      if (ts < startNs || ts > endNs) continue;
      const lot = String(p.lotNumber || "").trim();
      const unitOfLot = (lotUnitMap[lot] || "").toLowerCase();
      if (unitOfLot !== spinUnitKey) continue;
      const count = lotCountMap[lot] || "Unknown";
      countQtyMap[count] =
        (countQtyMap[count] || 0) + Number(p.quantityKg || 0);
    }

    const rows = Object.entries(countQtyMap)
      .map(([count, qty]) => ({ count, qty }))
      .sort((a, b) => a.count.localeCompare(b.count));

    const total = rows.reduce((s, r) => s + r.qty, 0);
    return { rows, total };
  }, [
    packingEntries,
    productionOrders,
    yarnCountLabels,
    fromDate,
    toDate,
    spinUnitKey,
  ]);

  const totalWaste = wasteRows.reduce((s, r) => s + r.qty, 0);

  const summary = useMemo(() => {
    const totalIssued = sectionAData.totals.issued;
    const openWIP = openingWIP;
    const totalIssue = totalIssued + openWIP;
    const closeWIP = closingWIP;
    const netConsumption = totalIssue - closeWIP;
    const yarnPacked = sectionDData.total;
    const theoreticalWaste = netConsumption - yarnPacked;
    const yarnRealisation =
      netConsumption > 0 ? (yarnPacked / netConsumption) * 100 : 0;
    const totalWasteProd = totalWaste;
    const invisibleLoss = netConsumption - yarnPacked - totalWasteProd;
    const invisibleLossPct =
      netConsumption > 0 ? (invisibleLoss / netConsumption) * 100 : 0;
    return {
      totalIssued,
      openWIP,
      totalIssue,
      closeWIP,
      netConsumption,
      yarnPacked,
      theoreticalWaste,
      yarnRealisation,
      totalWasteProd,
      invisibleLoss,
      invisibleLossPct,
    };
  }, [sectionAData, openingWIP, closingWIP, sectionDData, totalWaste]);

  function autoCalcClosingWIP() {
    const val = Math.max(
      0,
      Math.round(
        (openingWIP +
          sectionAData.totals.issued -
          sectionDData.total -
          totalWaste) *
          100,
      ) / 100,
    );
    setClosingWIP(val);
  }

  function addWasteRow() {
    if (!newWasteType || !newWasteQty) return;
    const qty = Number.parseFloat(newWasteQty);
    if (Number.isNaN(qty) || qty <= 0) return;
    setWasteRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        wasteType: newWasteType,
        grade: newWasteGrade,
        qty,
      },
    ]);
    setNewWasteType("");
    setNewWasteGrade("");
    setNewWasteQty("");
  }

  function removeWasteRow(id: string) {
    setWasteRows((prev) => prev.filter((r) => r.id !== id));
  }

  const generatedAt = new Date().toLocaleString();

  const realisationColor =
    summary.yarnRealisation >= 90
      ? "bg-green-100 text-green-800 font-bold"
      : summary.yarnRealisation >= 70
        ? "bg-amber-100 text-amber-800 font-bold"
        : "bg-red-100 text-red-800 font-bold";

  const invisibleColor =
    Math.abs(summary.invisibleLoss) < 0.01
      ? "bg-green-50 text-green-700"
      : summary.invisibleLoss > 0
        ? "bg-red-50 text-red-700"
        : "bg-blue-50 text-blue-700";

  const invisibleSuffix =
    Math.abs(summary.invisibleLoss) < 0.01
      ? ""
      : summary.invisibleLoss > 0
        ? " (Loss)"
        : " (Gain)";

  return (
    <div className="p-4 space-y-4">
      <style>{`
        /* ── Screen: hide print-only elements ── */
        .print-show { display: none; }
        .print-bc-row { display: flex; flex-direction: column; gap: 16px; }

        @media print {
          @page { size: A4 portrait; margin: 8mm; }

          /* Hide everything on the page, then reveal only the print area */
          body * { visibility: hidden; }
          #realisation-print-area,
          #realisation-print-area * { visibility: visible; }

          #realisation-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            font-size: 7.5pt;
            line-height: 1.3;
            color: #111;
          }

          /* Show / hide toggles */
          .print-hide { display: none !important; }
          .print-show { display: block !important; }

          /* Force page 2 */
          .print-page-break { page-break-before: always !important; break-before: page !important; }

          /* Typography */
          h2.rpt-title { font-size: 11pt; font-weight: 700; margin: 0 0 2px; }
          h3.rpt-subtitle { font-size: 9pt; font-weight: 600; margin: 0 0 1px; color: #444; }
          p.rpt-period { font-size: 7pt; color: #666; margin: 0 0 6px; }
          .sec-heading {
            font-size: 8pt;
            font-weight: 700;
            margin: 0 0 3px;
            padding-bottom: 2px;
            border-bottom: 1px solid #ccc;
          }

          /* Section A — full width */
          .print-section-a { width: 100%; margin-bottom: 6px; }

          /* Section B + C — stacked vertically */
          .print-bc-row {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            
            margin-bottom: 0 !important;
          }
          .print-bc-col { min-width: 0; }

          /* Tables */
          table { border-collapse: collapse; width: 100%; margin-bottom: 0; }
          th, td {
            border: 1px solid #bbb;
            padding: 1.5px 3px;
            font-size: 7pt;
            vertical-align: top;
          }
          thead th {
            background: #f0f0f0 !important;
            font-weight: 700;
            font-size: 6.5pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          tbody tr:last-child td { font-weight: 700; background: #f5f5f5 !important; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }

          /* WIP boxes */
          .wip-box {
            border: 1px solid #d0c0e8;
            border-radius: 3px;
            padding: 4px 6px;
            margin-bottom: 5px;
            background: #f9f5ff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .wip-label { font-size: 6.5pt; font-weight: 600; color: #6b21a8; margin-bottom: 2px; }
          .wip-value { font-size: 9pt; font-weight: 700; color: #111; }

          /* Section E highlight rows */
          .row-highlight-green td { background: #dcfce7 !important; }
          .row-highlight-amber td { background: #fef3c7 !important; }
          .row-highlight-red td { background: #fee2e2 !important; }
          .row-subtotal td { background: #f3f4f6 !important; font-weight: 600; }

          /* Footer */
          .rpt-footer {
            font-size: 6.5pt;
            color: #888;
            text-align: center;
            padding-top: 3px;
            border-top: 1px solid #ddd;
            margin-top: 4px;
          }

          /* Reset spacing utilities */
          .mb-6, .mb-4, .mb-3, .mb-2 { margin-bottom: 0 !important; }
          .space-y-4 > * + * { margin-top: 0 !important; }
        }
      `}</style>

      {/* ── Screen controls (hidden during print) ── */}
      <div className="print-hide space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-800">
            Realisation Report
          </h1>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="w-4 h-4" />
            Print PDF
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex gap-2">
            <Button
              variant={unit === "oe" ? "default" : "outline"}
              onClick={() => setUnit("oe")}
              data-ocid="realisation.oe_tab"
            >
              OE Spinning
            </Button>
            <Button
              variant={unit === "ring" ? "default" : "outline"}
              onClick={() => setUnit("ring")}
              data-ocid="realisation.ring_tab"
            >
              Ring Spinning
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-xs text-gray-500">From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-36"
                data-ocid="realisation.from_input"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-36"
                data-ocid="realisation.to_input"
              />
            </div>
          </div>
        </div>
        <Separator />
      </div>

      {/* ─────────────────────────────────────────────────────────
          PRINTABLE REPORT AREA
          Page 1: Header → Section A → Section B + C (50/50)
          Page 2: Section D → Section E → Footer
      ───────────────────────────────────────────────────────── */}
      <div id="realisation-print-area">
        {/* ── PAGE 1 ── */}

        {/* Header */}
        <div className="text-center mb-3">
          <h2 className="rpt-title text-xl font-bold">
            Sudarshan Jeans (P) Ltd Spinning
          </h2>
          <h3 className="rpt-subtitle text-lg font-semibold text-gray-700">
            Realisation Report — {unitLabel}
          </h3>
          <p className="rpt-period text-sm text-gray-500">
            Period: {fromDate} to {toDate}
          </p>
        </div>

        {/* Section A — full width */}
        <div className="print-section-a mb-4">
          <h4 className="sec-heading text-base font-bold text-blue-700 border-b border-blue-200 pb-1 mb-2">
            Section A: Raw Material Warehouse
          </h4>
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50">
                <TableHead>Grade / Material</TableHead>
                <TableHead className="text-right">Opening (kg)</TableHead>
                <TableHead className="text-right">Inward (kg)</TableHead>
                <TableHead className="text-right">Issued (kg)</TableHead>
                <TableHead className="text-right">Closing (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectionAData.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400">
                    No data for selected period
                  </TableCell>
                </TableRow>
              ) : (
                sectionAData.rows.map((r) => (
                  <TableRow key={r.grade}>
                    <TableCell className="font-medium">{r.grade}</TableCell>
                    <TableCell className="text-right">
                      {fmt(r.openingStock)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(r.inward)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(r.issued)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(r.closing)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-blue-50 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {fmt(sectionAData.totals.openingStock)}
                </TableCell>
                <TableCell className="text-right">
                  {fmt(sectionAData.totals.inward)}
                </TableCell>
                <TableCell className="text-right">
                  {fmt(sectionAData.totals.issued)}
                </TableCell>
                <TableCell className="text-right">
                  {fmt(sectionAData.totals.closing)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Section B + C — side by side on screen (column) and in print (50/50 grid) */}
        <div className="print-bc-row gap-4 mb-4">
          {/* Section B — WIP */}
          <div className="print-bc-col">
            <h4 className="sec-heading text-base font-bold text-purple-700 border-b border-purple-200 pb-1 mb-2">
              Section B: WIP (Work In Progress)
            </h4>

            {/* Opening WIP */}
            <div className="wip-box bg-purple-50 rounded-lg p-3 mb-3">
              <div className="wip-label text-sm font-semibold text-purple-800 mb-1">
                Opening WIP (kg)
              </div>
              {/* Screen: input */}
              <Input
                type="number"
                value={openingWIP}
                onChange={(e) =>
                  setOpeningWIP(Number.parseFloat(e.target.value) || 0)
                }
                className="print-hide mt-1"
                data-ocid="realisation.opening_wip_input"
              />
              {/* Print: plain value */}
              <p className="print-show wip-value font-bold text-lg mt-1">
                {fmt(openingWIP)} kg
              </p>
            </div>

            {/* Closing WIP */}
            <div className="wip-box bg-purple-50 rounded-lg p-3">
              <div className="wip-label text-sm font-semibold text-purple-800 mb-1">
                Closing WIP (kg)
              </div>
              {/* Screen: input + auto-calc button */}
              <div className="print-hide flex gap-2 mt-1">
                <Input
                  type="number"
                  value={closingWIP}
                  onChange={(e) =>
                    setClosingWIP(Number.parseFloat(e.target.value) || 0)
                  }
                  className="flex-1"
                  data-ocid="realisation.closing_wip_input"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={autoCalcClosingWIP}
                  title="Auto = Opening WIP + RM Issued − Yarn Packed − Total Waste"
                  data-ocid="realisation.auto_wip_button"
                >
                  <Calculator className="w-4 h-4" />
                </Button>
              </div>
              {/* Print: plain value */}
              <p className="print-show wip-value font-bold text-lg mt-1">
                {fmt(closingWIP)} kg
              </p>
            </div>
          </div>

          {/* Section C — Waste Production */}
          <div className="print-bc-col">
            <h4 className="sec-heading text-base font-bold text-orange-600 border-b border-orange-200 pb-1 mb-2">
              Section C: Waste Production
            </h4>

            {/* Add form — screen only */}
            <div className="print-hide flex flex-wrap gap-2 mb-3 bg-orange-50 p-3 rounded-lg">
              <div>
                <Label className="text-xs">Waste Type</Label>
                <select
                  value={newWasteType}
                  onChange={(e) => setNewWasteType(e.target.value)}
                  className="block mt-1 border rounded px-2 py-1 text-sm bg-white"
                  data-ocid="realisation.waste_type_select"
                >
                  <option value="">Select type</option>
                  {wasteTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Grade</Label>
                <Input
                  value={newWasteGrade}
                  onChange={(e) => setNewWasteGrade(e.target.value)}
                  placeholder="Grade (optional)"
                  className="mt-1 w-32 text-sm"
                  data-ocid="realisation.waste_grade_input"
                />
              </div>
              <div>
                <Label className="text-xs">Qty (kg)</Label>
                <Input
                  type="number"
                  value={newWasteQty}
                  onChange={(e) => setNewWasteQty(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-24 text-sm"
                  data-ocid="realisation.waste_qty_input"
                />
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  onClick={addWasteRow}
                  className="gap-1 mt-1"
                  data-ocid="realisation.waste_add_button"
                >
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-orange-50">
                  <TableHead>Waste Type</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Qty (kg)</TableHead>
                  <TableHead className="print-hide w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wasteRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-gray-400"
                    >
                      No waste entries for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  wasteRows.map((r, idx) => (
                    <TableRow
                      key={r.id}
                      data-ocid={`realisation.waste.item.${idx + 1}`}
                    >
                      <TableCell>{r.wasteType}</TableCell>
                      <TableCell>{r.grade || "—"}</TableCell>
                      <TableCell className="text-right">{fmt(r.qty)}</TableCell>
                      <TableCell className="print-hide">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWasteRow(r.id)}
                          data-ocid={`realisation.waste.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="bg-orange-50 font-bold">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">
                    {fmt(totalWaste)}
                  </TableCell>
                  <TableCell className="print-hide" />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── PAGE 2 (forced page break) ── */}
        <div className="print-page-break" />

        {/* Section D — Yarn Production (full width) */}
        <div className="mb-4">
          <h4 className="sec-heading text-base font-bold text-green-700 border-b border-green-200 pb-1 mb-2">
            Section D: Yarn Production
          </h4>
          <Table>
            <TableHeader>
              <TableRow className="bg-green-50">
                <TableHead>Count (Ne)</TableHead>
                <TableHead className="text-right">Yarn Packed (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectionDData.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-gray-400">
                    No packing entries for selected period
                  </TableCell>
                </TableRow>
              ) : (
                sectionDData.rows.map((r) => (
                  <TableRow key={r.count}>
                    <TableCell className="font-medium">{r.count}</TableCell>
                    <TableCell className="text-right">{fmt(r.qty)}</TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-green-50 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {fmt(sectionDData.total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Section E — Summary (full width) */}
        <div className="mb-4">
          <h4 className="sec-heading text-base font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2">
            Section E: Summary
          </h4>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="w-10">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>1</TableCell>
                <TableCell>Total Raw Material Issued</TableCell>
                <TableCell className="text-right">
                  {fmt(summary.totalIssued)} kg
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2</TableCell>
                <TableCell>Opening WIP</TableCell>
                <TableCell className="text-right">
                  {fmt(summary.openWIP)} kg
                </TableCell>
              </TableRow>
              <TableRow className="row-subtotal bg-gray-50 font-semibold">
                <TableCell>3</TableCell>
                <TableCell>Total Issue (1 + 2)</TableCell>
                <TableCell className="text-right">
                  {fmt(summary.totalIssue)} kg
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>4</TableCell>
                <TableCell>Closing WIP</TableCell>
                <TableCell className="text-right">
                  {fmt(summary.closeWIP)} kg
                </TableCell>
              </TableRow>
              <TableRow className="row-subtotal bg-gray-50 font-semibold">
                <TableCell>5</TableCell>
                <TableCell>Net Consumption (3 − 4)</TableCell>
                <TableCell className="text-right">
                  {fmt(summary.netConsumption)} kg
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>6</TableCell>
                <TableCell>Total Yarn Packed</TableCell>
                <TableCell className="text-right">
                  {fmt(summary.yarnPacked)} kg
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>7</TableCell>
                <TableCell>Theoretical Waste (5 − 6)</TableCell>
                <TableCell className="text-right">
                  {fmt(summary.theoreticalWaste)} kg
                </TableCell>
              </TableRow>
              <TableRow className={realisationColor}>
                <TableCell>8</TableCell>
                <TableCell>Yarn Realisation % (6 / 5 × 100)</TableCell>
                <TableCell className="text-right">
                  {fmt(summary.yarnRealisation)} %
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>9</TableCell>
                <TableCell>Total Waste Produced</TableCell>
                <TableCell className="text-right">
                  {fmt(summary.totalWasteProd)} kg
                </TableCell>
              </TableRow>
              <TableRow className={invisibleColor}>
                <TableCell>10</TableCell>
                <TableCell>
                  Invisible Loss / Gain (5 − 6 − 9){invisibleSuffix}
                </TableCell>
                <TableCell className="text-right">
                  {fmt(summary.invisibleLoss)} kg
                </TableCell>
              </TableRow>
              <TableRow className={invisibleColor}>
                <TableCell>11</TableCell>
                <TableCell>Invisible Loss %</TableCell>
                <TableCell className="text-right">
                  {fmt(summary.invisibleLossPct)} %
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="rpt-footer text-xs text-gray-400 text-center pt-2 border-t">
          Sudarshan Jeans (P) Ltd Spinning &nbsp;|&nbsp; Realisation Report —{" "}
          {unitLabel} &nbsp;|&nbsp;
          {fromDate} to {toDate} &nbsp;|&nbsp; Generated: {generatedAt}
        </div>
      </div>
    </div>
  );
}
