(() => {
  if (sessionStorage.getItem("sa_role") !== "employee") {
    location.href = "index.html";
    return;
  }

  const code = sessionStorage.getItem("sa_employee_code");
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = v => {
    if (!v) return "—";
    const n = Math.round(v * 60), h = Math.floor(n / 60), m = n % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  };

  document.getElementById("logoutBtn").onclick = () => {
    sessionStorage.clear();
    location.href = "index.html";
  };

  async function getReport() {
    const reports = JSON.parse(localStorage.getItem("sa_employee_reports") || "{}");
    if (reports[String(code)]) return reports[String(code)];
    if (!code) return null;
    try {
      const response = await fetch(`data/employees/${encodeURIComponent(code)}.json`, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  async function render() {
    const report = await getReport();
    if (!report) {
      document.getElementById("employeeName").textContent = `Employee ${code || ""}`;
      document.getElementById("employeeMeta").textContent = "Your attendance report is not available yet.";
      document.getElementById("employeeTable").innerHTML = `<div class="empty">Please contact the site accountant.</div>`;
      return;
    }

    const { employee, rows, cycle } = report;
    document.getElementById("employeeName").textContent = employee.name;
    document.getElementById("employeeMeta").innerHTML = `${esc(employee.job)} • Code ${esc(employee.code)} • ${esc(cycle.startKey)} → ${esc(cycle.endKey)}`;

    const present = rows.filter(r => r.status === "Present").length;
    const holiday = rows.filter(r => r.status === "Weekly holiday").length;
    const review = rows.filter(r => r.review).length;
    const missing = rows.filter(r => r.status === ATTENDANCE_CONFIG.rules.missingPunchLabel).length;
    const late = rows.reduce((a,r)=>a+(r.late||0),0);
    const ot = rows.reduce((a,r)=>a+(r.earlyOT||0)+(r.lateOT||0),0);

    document.getElementById("employeeTable").innerHTML = `
      <div class="employee-welcome"><div class="pulse-dot"></div><div><strong>Welcome, ${esc(employee.name.split(' ')[0])} 👋</strong><span>Your attendance report is ready.</span></div></div>
      <div class="employee-kpis">
        <div class="employee-kpi"><span>Present</span><strong>${present}</strong></div>
        <div class="employee-kpi"><span>Overtime</span><strong>${fmt(ot)}</strong></div>
        <div class="employee-kpi"><span>Total late</span><strong>${fmt(late)}</strong></div>
        <div class="employee-kpi"><span>Missing punch</span><strong>${missing}</strong></div>
        <div class="employee-kpi"><span>Weekly holidays</span><strong>${holiday}</strong></div>
        <div class="employee-kpi"><span>Accountant review</span><strong>${review}</strong></div>
      </div>
      <div class="table-wrap employee-table-wrap"><table><thead><tr>
        <th>Date</th><th>Day</th><th>Arrival</th><th>Departure</th><th>Schedule</th><th>Late</th><th>Early OT</th><th>Late OT</th><th>Status</th>
      </tr></thead><tbody>
        ${rows.map((r,i)=>`<tr style="animation-delay:${Math.min(i*12,600)}ms">
          <td>${esc(r.date)}</td><td>${esc(r.day)}</td><td>${r.first||'—'}</td><td>${r.last||'—'}</td>
          <td>${r.scheduledIn}–${r.scheduledOut}</td><td>${fmt(r.late)}</td><td>${fmt(r.earlyOT)}</td><td>${fmt(r.lateOT)}</td>
          <td><span class="employee-status ${r.status==='Present'?'ok':r.status==='Weekly holiday'?'holiday':r.review?'review':'warn'}">${esc(r.status)}</span></td>
        </tr>`).join('')}
      </tbody></table></div>`;
  }

  render();
})();
