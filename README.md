# Site Attendance V3 — GitHub Pages Ready

This version keeps the existing V2 structure and fixes the runtime error that prevented employee reports from being generated.

## What is fixed
- Fixed `data` vs `DATA` runtime error in `accountant.js`.
- Employee reports are saved locally for immediate testing.
- Accountant can export a shared employee portal package as a ZIP.
- Employee portal can load its report from `data/employees/<employee-code>.json` when opened from another device.
- Existing attendance rules are preserved:
  - Sunday–Wednesday: 08:00–16:00
  - Thursday: 08:00–14:00
  - Saturday: 09:00–16:00
  - Friday with no punches: Weekly holiday
  - Friday with punches: normal working day
  - First and last punch only
  - One punch: `Your fingerprint is lost.`
  - No-punch workdays: accountant review
  - Overtime: max 60 minutes before scheduled start + max 60 minutes after scheduled end
  - Attendance cycle: 26th → 25th

## GitHub Pages publishing workflow

1. Upload the whole project to your GitHub repository.
2. Enable GitHub Pages from the repository's Settings → Pages.
3. Open `index.html` through the GitHub Pages URL.
4. Accountant logs in and uploads the real Excel workbook.
5. Select/apply the attendance cycle.
6. Click **Export employee portal package**.
7. Extract the downloaded ZIP.
8. Copy the extracted `data/employees` folder into the repository's `data/employees` folder and commit/push it.
9. Employees can then open the same GitHub Pages site, choose Employee, enter their code and PIN, and their portal will load their individual JSON report.

## Important security limitation

This is still a static GitHub Pages application. The accountant/employee credentials in `config.js` are client-side and therefore are NOT real security. The shared report files are also static files.

For a real production deployment where employees must not be able to access another employee's data, the next step is a backend authentication/database (for example Supabase/Firebase or a small API). Do not use sensitive payroll information in this static version.
