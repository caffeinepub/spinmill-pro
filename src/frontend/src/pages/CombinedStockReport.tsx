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
import { useEffect, useMemo, useRef } from "react";

function spinningUnitLabel(u: string): string {
  const s = u.toLowerCase();
  if (s === "openend") return "OE Spinning";
  if (s === "ringspinning") return "Ring Spinning";
  if (s === "tfo") return "TFO";
  if (s === "outsideyarn" || s === "outsideYarn") return "Outside Yarn";
  return u;
}

const UNIT_ORDER = ["OE Spinning", "Ring Spinning", "TFO", "Outside Yarn"];

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
  const printStyleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        body > * { display: none !important; }
        #combined-stock-print-region { display: block !important; }
        @page { size: A4 portrait; margin: 15mm; }
      }
    `;
    document.head.appendChild(style);
    printStyleRef.current = style;
    return () => {
      if (printStyleRef.current)
        document.head.removeChild(printStyleRef.current);
    };
  }, []);

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
    for (const p of packingEntries) {
      const key = p.lotNumber;
      if (!packMap.has(key)) {
        packMap.set(key, {
          totalPackedKg: 0,
          yarnCountNe: String(p.yarnCountNe),
          spinningUnit: p.spinningUnit as string,
          productType: p.productType as string,
          endUse: p.endUse as string,
        });
      }
      packMap.get(key)!.totalPackedKg += Number(p.quantityKg);
    }
    for (const os of openingStockEntries) {
      const key = os.lotNumber;
      if (!packMap.has(key)) {
        packMap.set(key, {
          totalPackedKg: 0,
          yarnCountNe: String(os.yarnCountNe),
          spinningUnit: os.spinningUnit as string,
          productType: os.productType as string,
          endUse: os.endUse as string,
        });
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

  const handlePrint = () => window.print();

  return (
    <div className="p-6 space-y-6">
      {/* Screen Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Combined Stock Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Raw Material & Yarn Stock – {today}
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
      {/* PRINT-ONLY REGION */}
      {/* ============================================================ */}
      <div id="combined-stock-print-region" style={{ display: "none" }}>
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "11px",
            color: "#000",
          }}
        >
          {/* Print Header */}
          <div
            style={{
              textAlign: "center",
              borderBottom: "2px solid #000",
              paddingBottom: "8px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: "bold" }}>
              SpinMill Pro
            </div>
            <div
              style={{ fontSize: "13px", fontWeight: "bold", marginTop: "2px" }}
            >
              Combined Stock Report
            </div>
            <div style={{ marginTop: "4px" }}>Date: {today}</div>
          </div>

          {/* Section 1 Print */}
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
                  <th style={{ ...thStyle, textAlign: "right" }}>Total (kg)</th>
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
                    style={{ backgroundColor: "#e0e0e0", fontWeight: "bold" }}
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

          {/* Section 2 Print */}
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
              Section 2: Total Yarn Stock – Unit Wise &amp; Lot Number Wise
            </div>
            {yarnByUnit.map(({ unit, rows: unitRows }) => {
              const unitTotal = unitRows.reduce((s, r) => s + r.availableKg, 0);
              return (
                <div key={unit} style={{ marginBottom: "12px" }}>
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
                        <th style={{ ...thStyle, textAlign: "right" }}>
                          Available (kg)
                        </th>
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
                      <tr
                        style={{
                          backgroundColor: "#e8e8e8",
                          fontWeight: "bold",
                        }}
                      >
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
            })}
            {yarnByUnit.length > 0 && (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "10px",
                  marginTop: "4px",
                }}
              >
                <tbody>
                  <tr
                    style={{ backgroundColor: "#d0d0d0", fontWeight: "bold" }}
                  >
                    <td style={tdStyle} colSpan={4}>
                      Grand Total
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {yarnGrandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

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
            <span>SpinMill Pro – Confidential</span>
            <span>Printed: {printedAt}</span>
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
