(() => {
  const role = document.getElementById("role");
  const username = document.getElementById("username");
  const label = document.getElementById("userLabel");
  const msg = document.getElementById("loginMsg");

  function sync() {
    if (role.value === "employee") {
      label.firstChild.textContent = "Employee code";
      username.placeholder = "Employee code";
      username.value = "7636";
    } else {
      label.firstChild.textContent = "Username";
      username.placeholder = "Username";
      username.value = "accountant";
    }
  }
  role.addEventListener("change", sync);
  sync();

  document.getElementById("loginForm").addEventListener("submit", e => {
    e.preventDefault();
    const r = role.value;
    const u = username.value.trim();
    const p = document.getElementById("password").value;

    if (r === "accountant" && u === ATTENDANCE_CONFIG.auth.accountantUsername && p === ATTENDANCE_CONFIG.auth.accountantPassword) {
      sessionStorage.setItem("sa_role", "accountant");
      location.href = "accountant.html";
      return;
    }
    if (r === "employee" && u && ATTENDANCE_CONFIG.auth.employeePasswords[String(u)] === p) {
      sessionStorage.setItem("sa_role", "employee");
      sessionStorage.setItem("sa_employee_code", u);
      location.href = "employee.html";
      return;
    }
    msg.textContent = "Invalid prototype credentials.";
    msg.className = "message error";
  });
})();