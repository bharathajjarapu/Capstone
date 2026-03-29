/**
 * Direct API checks for VenDot backend (run with Bun).
 * Requires a running API — see Readme.md for connection and ports.
 * Usage: bun run scripts/check.ts  or  bun run check
 * Env: VENDOT_API_URL (default http://localhost:5261 — match Frontend `VITE_API_URL`),
 *      VENDOT_ADMIN_USER, VENDOT_ADMIN_PASS
 */
const baseUrl = (process.env.VENDOT_API_URL ?? "http://localhost:5261").replace(/\/$/, "");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function req(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {}
): Promise<{ status: number; json: unknown; text: string }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, text };
}

async function main() {
  const suffix = Date.now().toString(36);
  const adminUser = process.env.VENDOT_ADMIN_USER ?? "admin";
  const adminPass = process.env.VENDOT_ADMIN_PASS ?? "Admin123!";

  let r = await req("/");
  assert(r.status === 200, `GET / expected 200, got ${r.status}`);
  const root = r.json as { message?: string };
  assert(typeof root?.message === "string", "GET / should return message");

  r = await req("/api/auth/login", { method: "POST", body: { username: adminUser, password: "wrong" } });
  assert(r.status === 401, "bad login should be 401");

  r = await req("/api/auth/login", { method: "POST", body: { username: adminUser, password: adminPass } });
  assert(r.status === 200, "admin login should succeed");
  const adminLogin = r.json as { token: string; role: string };
  const adminToken = adminLogin.token;
  assert(adminLogin.role === "Admin", "admin role");

  r = await req("/api/users", { token: adminToken });
  assert(r.status === 200, "GET /api/users");

  const accUser = `acct_${suffix}`;
  const mgrUser = `mgr_${suffix}`;
  const anlUser = `anl_${suffix}`;
  const tempPw = "TempPass1!";

  r = await req("/api/users", {
    method: "POST",
    token: adminToken,
    body: {
      fullName: "API Accountant",
      username: accUser,
      email: `${accUser}@t.local`,
      role: "Accountant",
      tempPassword: tempPw,
    },
  });
  assert(r.status === 201 || r.status === 200, `create accountant: ${r.status}`);

  r = await req("/api/users", {
    method: "POST",
    token: adminToken,
    body: {
      fullName: "API Manager",
      username: mgrUser,
      email: `${mgrUser}@t.local`,
      role: "Manager",
      tempPassword: tempPw,
    },
  });
  assert(r.status === 201 || r.status === 200, `create manager: ${r.status}`);

  r = await req("/api/users", {
    method: "POST",
    token: adminToken,
    body: {
      fullName: "API Analyst",
      username: anlUser,
      email: `${anlUser}@t.local`,
      role: "Analyst",
      tempPassword: tempPw,
    },
  });
  assert(r.status === 201 || r.status === 200, `create analyst: ${r.status}`);

  async function loginAndSetPassword(u: string, p: string, finalPw: string) {
    let login = await req("/api/auth/login", { method: "POST", body: { username: u, password: p } });
    assert(login.status === 200, `login ${u}`);
    const first = login.json as { token: string; tempPass: boolean };
    assert(first.tempPass === true, "should be temp pass");
    const ch = await req("/api/auth/change-password", {
      method: "POST",
      token: first.token,
      body: { newPassword: finalPw },
    });
    assert(ch.status === 200, `change-password ${u}`);
    return (ch.json as { token: string }).token;
  }

  const finalPw = "FinalPass1!";
  const accToken = await loginAndSetPassword(accUser, tempPw, finalPw);
  const mgrToken = await loginAndSetPassword(mgrUser, tempPw, finalPw);
  const anlToken = await loginAndSetPassword(anlUser, tempPw, finalPw);

  r = await req("/api/payments", { token: adminToken });
  assert(r.status === 403, "admin should not list payments");

  const vendorName = `Vendor_${suffix}`;
  r = await req("/api/vendors", {
    method: "POST",
    token: adminToken,
    body: {
      name: vendorName,
      contactName: "C",
      email: "v@v.local",
      phone: "1",
      address: "A",
    },
  });
  assert(r.status === 201, `create vendor ${r.status}`);
  const vendor = r.json as { id: number };

  r = await req(`/api/vendors/${vendor.id}/accounts`, {
    method: "POST",
    token: adminToken,
    body: {
      bankName: "Bank",
      accountName: "Main",
      accountNo: "123",
      routingNo: "456",
      isDefault: true,
    },
  });
  assert(r.status === 201, "add bank account");
  const account = r.json as { id: number };

  r = await req(`/api/vendors/${vendor.id}/accounts`, { token: accToken });
  assert(r.status === 200, "accountant can list accounts");

  const due = new Date();
  due.setMonth(due.getMonth() + 1);
  const dueStr = due.toISOString().slice(0, 10);

  r = await req("/api/payments", {
    method: "POST",
    token: accToken,
    body: {
      vendorId: vendor.id,
      vendorBankAccountId: account.id,
      invoiceNo: `INV-${suffix}`,
      dueDate: dueStr,
      taxTypeId: 1,
      items: [{ description: "Line", quantity: 1, unitPrice: 100 }],
    },
  });
  assert(r.status === 201, `create payment ${r.status}`);
  const payment = r.json as { id: number };

  r = await req("/api/payments", { token: accToken });
  assert(r.status === 200 && Array.isArray(r.json), "accountant list payments");

  r = await req(`/api/payments/${payment.id}`, { token: mgrToken });
  assert(r.status === 200, "manager get payment");

  r = await req(`/api/payments/${payment.id}/approve`, {
    method: "POST",
    token: mgrToken,
    body: { note: "ok" },
  });
  assert(r.status === 200, "approve");

  r = await req("/api/reports/generate", {
    method: "POST",
    token: anlToken,
    body: { reportType: "Summary", filters: { statuses: ["APPROVED"] } },
  });
  assert(r.status === 200, "generate report");
  const gen = r.json as { id: number };
  const reportId = gen.id;

  let status = "PROCESSING";
  for (let i = 0; i < 30 && status === "PROCESSING"; i++) {
    await new Promise((res) => setTimeout(res, 500));
    r = await req(`/api/reports/${reportId}`, { token: anlToken });
    assert(r.status === 200, "poll report");
    status = (r.json as { status: string }).status;
  }
  assert(status === "READY", `report should be READY, got ${status}`);

  r = await req(`/api/reports/${reportId}/download`, { token: anlToken });
  assert(r.status === 200, "download report");

  r = await req("/api/reports/generate", {
    method: "POST",
    token: adminToken,
    body: { reportType: "Summary", filters: {} },
  });
  assert(r.status === 403, "admin cannot generate (Analyst only)");

  console.log("check: all checks passed.");
}

main().catch((e) => {
  console.error("check failed:", e);
  process.exit(1);
});
