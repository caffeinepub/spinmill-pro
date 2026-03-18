import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDispatchEntries,
  usePackingEntries,
  useWarehouseStock,
  useYarnOpeningStock,
} from "@/hooks/useQueries";
import { Loader2, Printer } from "lucide-react";
import { useMemo } from "react";

function spinningUnitLabel(u: string): string {
  const s = u.toLowerCase();
  if (s === "openend") return "OE Spinning";
  if (s === "ringspinning") return "Ring Spinning";
  if (s === "tfo") return "TFO";
  if (s === "outsideyarn" || s === "outsideYarn") return "Outside Yarn";
  return u;
}

const UNIT_ORDER = ["OE Spinning", "Ring Spinning", "TFO", "Outside Yarn"];
const PAGE1_UNITS = ["OE Spinning", "Ring Spinning"];
const PAGE2_UNITS = ["TFO", "Outside Yarn"];

/** Returns true if a yarn count string looks like a bad/numeric-only value */
function isCountBad(count: string): boolean {
  if (!count || count === "NaN" || count === "undefined" || count === "")
    return true;
  // A plain number with no "/" or "@" is likely a truncated TFO count (e.g. "30" instead of "30/1")
  const asNum = Number(count);
  return !Number.isNaN(asNum) && !count.includes("/") && !count.includes("@");
}

export default function CombinedStockReport() {
  const { data: warehouseStock = [], isLoading: loadingWS } =
    useWarehouseStock();
  const { data: packingEntries = [], isLoading: loadingPE } =
    usePackingEntries();
  const { data: dispatchEntries = [], isLoading: loadingDE } =
    useDispatchEntries();
  const { data: openingStockEntries = [], isLoading: loadingOS } =
    useYarnOpeningStock();

  const isLoading = loadingWS || loadingPE || loadingDE || loadingOS;

  // ---- Raw Material Stock ----
  const rawMaterialRows = useMemo(() => {
    const map = new Map<string, { oe: number; ring: number }>();
    for (const ws of warehouseStock) {
      const name = ws.materialName as string;
      if (!map.has(name)) map.set(name, { oe: 0, ring: 0 });
      const row = map.get(name)!;
      const wh = (ws.warehouse as string).toLowerCase();
      const qty = Number(ws.totalQty ?? 0);
      if (wh === "oerawmaterial") row.oe += qty;
      else if (wh === "ringrawmaterial") row.ring += qty;
    }
    return Array.from(map.entries())
      .map(([name, vals]) => ({
        name,
        oe: vals.oe,
        ring: vals.ring,
        total: vals.oe + vals.ring,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [warehouseStock]);

  const rmGrandTotal = useMemo(
    () =>
      rawMaterialRows.reduce(
        (acc, r) => ({
          oe: acc.oe + r.oe,
          ring: acc.ring + r.ring,
          total: acc.total + r.total,
        }),
        { oe: 0, ring: 0, total: 0 },
      ),
    [rawMaterialRows],
  );

  // ---- Yarn Stock ----
  const yarnRows = useMemo(() => {
    const packMap = new Map<
      string,
      {
        totalPackedKg: number;
        yarnCountNe: string;
        spinningUnit: string;
        productType: string;
        endUse: string;
      }
    >();

    // Step 1: seed from packing entries
    for (const p of packingEntries) {
      const key = p.lotNumber;
      if (!packMap.has(key)) {
        packMap.set(key, {
          totalPackedKg: 0,
          // Use empty string fallback to avoid "undefined" string
          yarnCountNe: String(p.yarnCountNe ?? ""),
          spinningUnit: p.spinningUnit as string,
          productType: p.productType as string,
          endUse: p.endUse as string,
        });
      }
      packMap.get(key)!.totalPackedKg += Number(p.quantityKg);
    }

    // Step 2: merge opening stock entries
    // Opening stock stores yarnCountNe as Text (reliable for TFO / Outside Yarn)
    // so if the existing count looks wrong (numeric-only, NaN, empty), overwrite it
    for (const os of openingStockEntries) {
      const key = os.lotNumber;
      const osCount = String(os.yarnCountNe ?? "");
      if (!packMap.has(key)) {
        packMap.set(key, {
          totalPackedKg: 0,
          yarnCountNe: osCount,
          spinningUnit: os.spinningUnit as string,
          productType: os.productType as string,
          endUse: os.endUse as string,
        });
      } else {
        // Update yarnCountNe when opening stock has a better (text) value
        const existing = packMap.get(key)!;
        if (
          isCountBad(existing.yarnCountNe) &&
          osCount &&
          !isCountBad(osCount)
        ) {
          existing.yarnCountNe = osCount;
        }
      }
      packMap.get(key)!.totalPackedKg += Number(os.weightKg);
    }

    const dispatchMap = new Map<string, number>();
    for (const d of dispatchEntries) {
      dispatchMap.set(
        d.lotNumber,
        (dispatchMap.get(d.lotNumber) ?? 0) + Number(d.quantityKg),
      );
    }
    const result: Array<{
      lotNumber: string;
      yarnCountNe: string;
      spinningUnit: string;
      unitLabel: string;
      productType: string;
      endUse: string;
      availableKg: number;
    }> = [];
    for (const [lotNumber, pack] of packMap.entries()) {
      const totalDispatchedKg = dispatchMap.get(lotNumber) ?? 0;
      const availableKg = pack.totalPackedKg - totalDispatchedKg;
      if (availableKg <= 0) continue;
      result.push({
        lotNumber,
        yarnCountNe: pack.yarnCountNe,
        spinningUnit: pack.spinningUnit,
        unitLabel: spinningUnitLabel(pack.spinningUnit),
        productType: pack.productType,
        endUse: pack.endUse,
        availableKg,
      });
    }
    return result.sort((a, b) => a.lotNumber.localeCompare(b.lotNumber));
  }, [packingEntries, dispatchEntries, openingStockEntries]);

  const yarnByUnit = useMemo(() => {
    const map = new Map<string, typeof yarnRows>();
    for (const row of yarnRows) {
      if (!map.has(row.unitLabel)) map.set(row.unitLabel, []);
      map.get(row.unitLabel)!.push(row);
    }
    return UNIT_ORDER.filter((u) => map.has(u)).map((u) => ({
      unit: u,
      rows: map.get(u)!,
    }));
  }, [yarnRows]);

  const yarnByUnitMap = useMemo(() => {
    const map = new Map<string, typeof yarnRows>();
    for (const { unit, rows } of yarnByUnit) {
      map.set(unit, rows);
    }
    return map;
  }, [yarnByUnit]);

  const yarnGrandTotal = useMemo(
    () => yarnRows.reduce((s, r) => s + r.availableKg, 0),
    [yarnRows],
  );

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const printedAt = new Date().toLocaleString("en-IN");

  const handlePrint = () => {
    const printRegion = document.getElementById("combined-stock-print-region");
    if (!printRegion) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Combined Stock Report</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 15mm; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { border: 1px solid #999; padding: 4px 6px; text-align: left; font-weight: bold; background: #f0f0f0; }
    td { border: 1px solid #ccc; padding: 3px 6px; }
    .print-page-break { page-break-before: always; break-before: page; margin-top: 0; }
    @page { size: A4 portrait; margin: 15mm; }
  </style>
</head>
<body>
${printRegion.innerHTML}
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  const PrintHeader = () => (
    <div
      style={{
        textAlign: "center",
        borderBottom: "2px solid #000",
        paddingBottom: "8px",
        marginBottom: "16px",
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: "bold" }}>
        Sudarshan Jeans (P)Ltd Spinning
      </div>
      <div style={{ fontSize: "13px", fontWeight: "bold", marginTop: "2px" }}>
        Combined Stock Report
      </div>
      <div style={{ marginTop: "4px" }}>Date: {today}</div>
    </div>
  );

  const PrintYarnSection = ({ unit }: { unit: string }) => {
    const unitRows = yarnByUnitMap.get(unit);
    if (!unitRows || unitRows.length === 0) return null;
    const unitTotal = unitRows.reduce((s, r) => s + r.availableKg, 0);
    return (
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            fontWeight: "bold",
            fontSize: "11px",
            margin: "6px 0 3px",
            padding: "2px 4px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ccc",
          }}
        >
          {unit}
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "10px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={thStyle}>Lot No.</th>
              <th style={thStyle}>Count (Ne)</th>
              <th style={thStyle}>Product Type</th>
              <th style={thStyle}>End Use</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Available (kg)</th>
            </tr>
          </thead>
          <tbody>
            {unitRows.map((row) => (
              <tr key={row.lotNumber}>
                <td style={tdStyle}>{row.lotNumber}</td>
                <td style={tdStyle}>{row.yarnCountNe}</td>
                <td style={tdStyle}>{row.productType}</td>
                <td style={tdStyle}>{row.endUse}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {row.availableKg.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: "#e8e8e8", fontWeight: "bold" }}>
              <td style={tdStyle} colSpan={4}>
                {unit} – Sub Total
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                {unitTotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Screen Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Combined Stock Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Raw Material &amp; Yarn Stock – {today}
          </p>
        </div>
        <Button
          onClick={handlePrint}
          className="gap-2"
          data-ocid="combined_report.primary_button"
        >
          <Printer className="w-4 h-4" />
          Print PDF
        </Button>
      </div>

      {isLoading ? (
        <div
          className="flex items-center justify-center py-20"
          data-ocid="combined_report.loading_state"
        >
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Loading stock data…</span>
        </div>
      ) : (
        <>
          {/* Section 1: Raw Material Stock */}
          <Card data-ocid="combined_report.section.1">
            <CardHeader>
              <CardTitle className="text-lg">
                Section 1 – Raw Material Stock (Grade Wise &amp; Warehouse Wise)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grade / Material</TableHead>
                    <TableHead className="text-right">
                      OE Raw Material (kg)
                    </TableHead>
                    <TableHead className="text-right">
                      Ring Raw Material (kg)
                    </TableHead>
                    <TableHead className="text-right">Total (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawMaterialRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-gray-400 py-6"
                        data-ocid="combined_report.empty_state"
                      >
                        No raw material stock found
                      </TableCell>
                    </TableRow>
                  ) : (
                    rawMaterialRows.map((row, i) => (
                      <TableRow
                        key={row.name}
                        data-ocid={`combined_report.row.${i + 1}`}
                      >
                        <TableCell className="font-medium">
                          {row.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.oe.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.ring.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {row.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {rawMaterialRows.length > 0 && (
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell>Grand Total</TableCell>
                      <TableCell className="text-right">
                        {rmGrandTotal.oe.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {rmGrandTotal.ring.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {rmGrandTotal.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Section 2: Yarn Stock */}
          <Card data-ocid="combined_report.section.2">
            <CardHeader>
              <CardTitle className="text-lg">
                Section 2 – Total Yarn Stock (Unit Wise &amp; Lot Number Wise)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {yarnByUnit.length === 0 ? (
                <p
                  className="text-center text-gray-400 py-6"
                  data-ocid="combined_report.yarn_empty_state"
                >
                  No yarn stock found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lot No.</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Count (Ne)</TableHead>
                      <TableHead>Product Type</TableHead>
                      <TableHead>End Use</TableHead>
                      <TableHead className="text-right">
                        Available (kg)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yarnByUnit.map(({ unit, rows: unitRows }) => {
                      const unitTotal = unitRows.reduce(
                        (s, r) => s + r.availableKg,
                        0,
                      );
                      return (
                        <>
                          {unitRows.map((row, i) => (
                            <TableRow
                              key={row.lotNumber}
                              data-ocid={`combined_report.yarn_row.${i + 1}`}
                            >
                              <TableCell>{row.lotNumber}</TableCell>
                              <TableCell>{row.unitLabel}</TableCell>
                              <TableCell>{row.yarnCountNe}</TableCell>
                              <TableCell>{row.productType}</TableCell>
                              <TableCell>{row.endUse}</TableCell>
                              <TableCell className="text-right">
                                {row.availableKg.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow
                            className="bg-blue-50 font-semibold"
                            key={`subtotal-${unit}`}
                          >
                            <TableCell colSpan={5}>
                              {unit} – Sub Total
                            </TableCell>
                            <TableCell className="text-right">
                              {unitTotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })}
                    <TableRow className="bg-gray-100 font-bold">
                      <TableCell colSpan={5}>Grand Total</TableCell>
                      <TableCell className="text-right">
                        {yarnGrandTotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ============================================================ */}
      {/* PRINT-ONLY REGION – hidden on screen, cloned into new window */}
      {/* ============================================================ */}
      <div id="combined-stock-print-region" style={{ display: "none" }}>
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "11px",
            color: "#000",
          }}
        >
          {/* ===== PAGE 1: Raw Material + OE Spinning + Ring Spinning ===== */}
          <div>
            <PrintHeader />

            {/* Section 1: Raw Material Stock */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                  borderBottom: "1px solid #000",
                  paddingBottom: "3px",
                }}
              >
                Section 1: Raw Material Stock – Grade Wise &amp; Warehouse Wise
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "10px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th style={thStyle}>Grade / Material</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>
                      OE Raw Material (kg)
                    </th>
                    <th style={{ ...thStyle, textAlign: "right" }}>
                      Ring Raw Material (kg)
                    </th>
                    <th style={{ ...thStyle, textAlign: "right" }}>
                      Total (kg)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rawMaterialRows.map((row) => (
                    <tr key={row.name}>
                      <td style={tdStyle}>{row.name}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {row.oe.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {row.ring.toFixed(2)}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: "bold",
                        }}
                      >
                        {row.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {rawMaterialRows.length > 0 && (
                    <tr
                      style={{
                        backgroundColor: "#e0e0e0",
                        fontWeight: "bold",
                      }}
                    >
                      <td style={tdStyle}>Grand Total</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {rmGrandTotal.oe.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {rmGrandTotal.ring.toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {rmGrandTotal.total.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 2 Page 1: OE Spinning + Ring Spinning */}
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                  borderBottom: "1px solid #000",
                  paddingBottom: "3px",
                }}
              >
                Section 2: Yarn Stock – OE Spinning &amp; Ring Spinning
              </div>
              {PAGE1_UNITS.map((unit) => (
                <PrintYarnSection key={unit} unit={unit} />
              ))}
              {PAGE1_UNITS.every((u) => !yarnByUnitMap.has(u)) && (
                <div
                  style={{
                    padding: "8px",
                    color: "#888",
                    textAlign: "center",
                    fontSize: "10px",
                  }}
                >
                  No OE Spinning or Ring Spinning yarn stock found
                </div>
              )}
            </div>
          </div>

          {/* ===== PAGE 2: TFO + Outside Yarn ===== */}
          <div className="print-page-break">
            <PrintHeader />

            {/* Section 2 Page 2: TFO + Outside Yarn */}
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                  borderBottom: "1px solid #000",
                  paddingBottom: "3px",
                }}
              >
                Section 2: Yarn Stock – TFO &amp; Outside Yarn
              </div>
              {PAGE2_UNITS.map((unit) => (
                <PrintYarnSection key={unit} unit={unit} />
              ))}
              {PAGE2_UNITS.every((u) => !yarnByUnitMap.has(u)) && (
                <div
                  style={{
                    padding: "8px",
                    color: "#888",
                    textAlign: "center",
                    fontSize: "10px",
                  }}
                >
                  No TFO or Outside Yarn stock found
                </div>
              )}
            </div>

            {/* Grand Total – all yarn units */}
            {yarnRows.length > 0 && (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "10px",
                  marginTop: "8px",
                }}
              >
                <tbody>
                  <tr
                    style={{ backgroundColor: "#d0d0d0", fontWeight: "bold" }}
                  >
                    <td style={tdStyle} colSpan={4}>
                      Grand Total – All Yarn Stock
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {yarnGrandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* Print Footer */}
            <div
              style={{
                marginTop: "24px",
                borderTop: "1px solid #000",
                paddingTop: "6px",
                fontSize: "9px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Sudarshan Jeans (P)Ltd Spinning – Confidential</span>
              <span>Printed: {printedAt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #999",
  padding: "4px 6px",
  textAlign: "left",
  fontWeight: "bold",
  backgroundColor: "#f0f0f0",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "3px 6px",
};
