window.AttendanceEngine = (() => {
  const R = ATTENDANCE_CONFIG.rules;

  function minutes(hhmmss) {
    const [h,m,s] = hhmmss.split(":").map(Number);
    return h*60 + m + (s || 0)/60;
  }

  function fmtMinutes(value) {
    if (value === null || value === undefined || value === "" || value === 0) return "";
    const total = Math.max(0, Math.round(value * 60));
    const h = Math.floor(total/60);
    const m = total % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  }

  function localDateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function parseMonthValue(monthValue) {
    const [year, month] = String(monthValue || "").split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) return null;
    return { year, month };
  }

  // The company's attendance cycle is always:
  // 26th of the selected month -> 25th of the following month.
  function createCycle(monthValue) {
    const parsed = parseMonthValue(monthValue);
    if (!parsed) return null;
    const start = new Date(parsed.year, parsed.month - 1, 26, 0, 0, 0, 0);
    const end = new Date(parsed.year, parsed.month, 25, 23, 59, 59, 999);
    return {
      monthValue,
      label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      start,
      end,
      startKey: localDateKey(start),
      endKey: localDateKey(end)
    };
  }

  function cycleMonthFromDate(date) {
    if (!(date instanceof Date) || isNaN(date)) return "";
    // A date on/after the 26th belongs to the cycle named by that month.
    // A date on/before the 25th belongs to the previous month's cycle.
    const cycleMonth = date.getDate() >= 26 ? date.getMonth() : date.getMonth() - 1;
    const d = new Date(date.getFullYear(), cycleMonth, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function cycleCandidates(punches) {
    return [...new Set((punches || []).map(p => cycleMonthFromDate(p.datetime)).filter(Boolean))].sort();
  }

  function clampEndToToday(cycle) {
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return cycle.end > todayEnd ? todayEnd : cycle.end;
  }

  function dayName(date) {
    return WEEKDAY_EN[date.getDay()];
  }

  function scheduleFor(date) {
    const d = dayName(date);
    if (d === "friday") return { ...R.friday, label: "Friday" };
    return { ...(R.regular[d] || R.regular.sunday), label: d };
  }

  function dateRange(start, end) {
    const out = [];
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (d <= last) {
      out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  // Read raw punches and build FIRST/LAST groups only for the selected cycle.
  function groupPunches(punches, cycle) {
    const groups = new Map();
    if (!cycle) return groups;

    const start = cycle.start;
    const end = cycle.end;

    for (const p of punches || []) {
      if (p.datetime < start || p.datetime > end) continue;
      const key = `${p.code}|${p.date}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }

    const result = new Map();
    for (const [key, arr] of groups) {
      arr.sort((a,b) => a.datetime - b.datetime);
      result.set(key, {
        code: arr[0].code,
        date: arr[0].date,
        first: arr[0],
        last: arr[arr.length - 1],
        count: arr.length,
        all: arr
      });
    }
    return result;
  }

  function analyzeDay(employee, date, group) {
    const sched = scheduleFor(date);
    const first = group?.first?.time || "";
    const last = group?.last?.time || "";
    const punchCount = group?.count || 0;

    const base = {
      code: employee.code,
      name: employee.name,
      date: localDateKey(date),
      day: sched.label,
      first,
      last,
      scheduledIn: sched.in,
      scheduledOut: sched.out,
      punchCount,
      late: 0,
      earlyLeave: 0,
      earlyOT: 0,
      lateOT: 0,
      status: "",
      review: false
    };

    // Friday is the weekly holiday ONLY when there are no punches.
    // If punches exist, Friday is treated exactly like a normal workday.
    if (!group && date.getDay() === 5) {
      base.status = "Weekly holiday";
      base.review = false;
      return base;
    }

    // Other no-punch workdays stay under accountant control.
    if (!group) {
      base.status = R.noPunchLabel;
      base.review = true;
      return base;
    }

    // Exactly one punch = missing fingerprint.
    if (punchCount === 1) {
      base.status = R.missingPunchLabel;
      return base;
    }

    const inMin = minutes(first);
    const outMin = minutes(last);
    const schedIn = minutes(sched.in + ":00");
    const schedOut = minutes(sched.out + ":00");

    if (inMin > schedIn) base.late = inMin - schedIn;
    if (outMin < schedOut) base.earlyLeave = schedOut - outMin;

    // Maximum one hour before arrival and one hour after departure.
    if (inMin < schedIn) base.earlyOT = Math.min(schedIn - inMin, R.overtime.maxBeforeMinutes);
    if (outMin > schedOut) base.lateOT = Math.min(outMin - schedOut, R.overtime.maxAfterMinutes);

    base.status = "Present";
    return base;
  }

  function analyzeEmployee(employee, data) {
    if (!employee || !data?.cycle) return [];
    const end = clampEndToToday(data.cycle);
    if (end < data.cycle.start) return [];
    const groups = data.grouped || groupPunches(data.punches, data.cycle);
    return dateRange(data.cycle.start, end).map(date => {
      const key = `${employee.code}|${localDateKey(date)}`;
      return analyzeDay(employee, date, groups.get(key));
    });
  }

  function summary(rows) {
    return rows.reduce((s,r) => {
      if (r.status === "Present") s.present++;
      if (r.status === R.noPunchLabel) s.review++;
      if (r.status === R.missingPunchLabel) s.missing++;
      s.late += r.late || 0;
      s.earlyLeave += r.earlyLeave || 0;
      s.earlyOT += r.earlyOT || 0;
      s.lateOT += r.lateOT || 0;
      return s;
    }, {present:0,review:0,missing:0,late:0,earlyLeave:0,earlyOT:0,lateOT:0});
  }

  return {
    analyzeEmployee,
    summary,
    fmtMinutes,
    scheduleFor,
    createCycle,
    cycleMonthFromDate,
    cycleCandidates,
    groupPunches,
    localDateKey
  };
})();
