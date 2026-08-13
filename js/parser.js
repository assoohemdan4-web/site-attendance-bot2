window.AttendanceParser = (() => {
  const C = ATTENDANCE_CONFIG.workbook;

  function clean(v) {
    return v === null || v === undefined ? "" : String(v).trim();
  }

  function toDate(v) {
    if (v instanceof Date && !isNaN(v)) return new Date(v.getTime());
    if (typeof v === "number" && window.XLSX?.SSF) {
      const p = XLSX.SSF.parse_date_code(v);
      if (p) return new Date(p.y, p.m - 1, p.d, p.H || 0, p.M || 0, p.S || 0);
    }
    if (typeof v === "string") {
      const text = v.trim();
      // Keep workbook dates local. Avoid Date.parse on ambiguous DD/MM/YYYY values.
      const m = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (m) {
        return new Date(
          Number(m[3]), Number(m[2]) - 1, Number(m[1]),
          Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0), 0
        );
      }
    }
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }

  function dateKey(d) {
    return d ? [
      d.getFullYear(),
      String(d.getMonth()+1).padStart(2,"0"),
      String(d.getDate()).padStart(2,"0")
    ].join("-") : "";
  }

  function timeKey(d) {
    return d ? `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}` : "";
  }

  function readRows(workbook, sheetName) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) throw new Error(`Missing sheet: ${sheetName}`);
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
  }

  function parseEmployees(workbook) {
    const rows = readRows(workbook, C.employeeSheet);
    const headerIndex = rows.findIndex(r => clean(r[0]) === "الكود");
    if (headerIndex < 0) throw new Error("Could not find employee header row in داتا.");
    const map = new Map();
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.every(v => clean(v) === "")) continue;
      const code = Number(r[0]);
      if (!Number.isFinite(code)) continue;
      map.set(String(code), {
        code,
        name: clean(r[1]),
        job: clean(r[2]),
        department: clean(r[3]),
        weeklyOff: clean(r[4]) || "الجمعة"
      });
    }
    return [...map.values()];
  }

  function parsePunches(workbook) {
    const rows = readRows(workbook, C.punchSheet);
    const headerIndex = rows.findIndex(r => clean(r[1]) === "ID" && clean(r[2]) === "Date/Time");
    if (headerIndex < 0) throw new Error("Could not find ID / Date-Time columns in السحب.");

    const punches = [];
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const r = rows[i];
      const code = Number(r[1]);
      const dt = toDate(r[2]);
      if (!Number.isFinite(code) || !dt) continue;
      punches.push({
        code,
        datetime: dt,
        date: dateKey(dt),
        time: timeKey(dt),
        note: clean(r[5])
      });
    }
    punches.sort((a,b) => a.datetime - b.datetime);
    return punches;
  }

  // The month sheet is informational only in V2.2.
  // It must NOT determine the active attendance cycle.
  function parseWorkbookMonthInfo(workbook) {
    const ws = workbook.Sheets[C.monthSheet];
    if (!ws) return null;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
    return { available: true, rows: rows.slice(0, 12) };
  }

  function parseReportSelection(workbook) {
    const rows = readRows(workbook, C.reportSheet);
    return {
      code: Number(rows?.[1]?.[1]) || null,
      name: clean(rows?.[2]?.[1]),
      job: clean(rows?.[3]?.[1])
    };
  }

  async function parseFile(file) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const employees = parseEmployees(wb);
    const punches = parsePunches(wb);
    const monthInfo = parseWorkbookMonthInfo(wb);
    const reportSelection = parseReportSelection(wb);

    return {
      workbook: wb,
      employees,
      punches,
      monthInfo,
      reportSelection,
      sheets: wb.SheetNames
    };
  }

  return { parseFile, dateKey, timeKey };
})();
