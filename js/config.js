window.ATTENDANCE_CONFIG = {
  auth: {
    accountantUsername: "accountant",
    accountantPassword: "1234",
    // DEMO ONLY. These passwords are visible to anyone who can inspect the JS.
    // Production will use real authentication + server-side password hashing.
    employeePasswords: {
      "7636": "1234"
    }
  },

  workbook: {
    monthSheet: "الشهر",
    employeeSheet: "داتا",
    punchSheet: "السحب",
    reportSheet: "1"
  },

  rules: {
    // Company schedule as explained by the accountant:
    // Sun-Wed 08:00-16:00, Thu 08:00-14:00, Sat 09:00-16:00.
    regular: {
      sunday:    { in: "08:00", out: "16:00" },
      monday:    { in: "08:00", out: "16:00" },
      tuesday:   { in: "08:00", out: "16:00" },
      wednesday: { in: "08:00", out: "16:00" },
      thursday:  { in: "08:00", out: "14:00" },
      saturday:  { in: "09:00", out: "16:00" }
    },
    friday: { in: "08:00", out: "16:00" },
    overtime: {
      maxBeforeMinutes: 60,
      maxAfterMinutes: 60
    },
    missingPunchLabel: "Your fingerprint is lost.",
    noPunchLabel: "ACCOUNTANT_REVIEW",
    fridayNoPunchLabel: "ACCOUNTANT_REVIEW"
  }
};

window.WEEKDAY_EN = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
window.WEEKDAY_AR = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
