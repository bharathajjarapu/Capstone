## Issues

1. **Login abuse** — `POST /api/auth/login` has no throttling, CAPTCHA, or account lockout. In production this is the main abuse surface; for dev it’s easy to ignore until deploy.

2. **Password rules only on the client** — Change-password can be called with a weak password if someone bypasses the UI. The API should enforce the same (or stricter) rules as the form.

3. **Optional weak admin temp password** — Creating a user with a custom `TempPassword` can be short or guessable; there’s no server-side strength check.

4. **User id from claims** — Controllers use `int.Parse(... ?? "0")` for `userId`. Missing/odd claims can yield `0` or throw; safer pattern is `TryParse` and `401` when invalid.

5. **Failed report jobs are hard to debug** — In `ReportService.ProcessReportAsync`, failures set `FAILED` but the exception isn’t logged there (so you don’t get stack traces in logs unless you add logging or rethrow).

6. **No automated tests** — No API/UI tests; regressions are manual only.

7. **Stateless JWT behavior** — After password change, **old tokens stay valid until they expire** (unless you add revocation, shorter TTL, or refresh-token rotation). That’s how JWT usually works, not a bug, but it’s a security property to be aware of.

---

