/**
 * API checks for VenDot (Bun). Requires the backend running (default http://localhost:5261).
 * Env: VENDOT_API_URL, VENDOT_ADMIN_EMAIL, VENDOT_ADMIN_PASS
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

/** GET without parsing JSON (for binary PDF/XLSX bodies). */
async function reqGetStatus(path: string, token?: string): Promise<number> {
  const headers: Record<string, string> = { Accept: "*/*" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, { headers });
  await res.arrayBuffer();
  return res.status;
}

async function main() {
  const suffix = Date.now().toString(36);
  const adminEmail = process.env.VENDOT_ADMIN_EMAIL ?? "admin@ven.local";
  const adminPass = process.env.VENDOT_ADMIN_PASS ?? "Admin123!";

  let r = await req("/");
  assert(r.status === 200, `GET / expected 200, got ${r.status}`);
  const root = r.json as { message?: string };
  assert(typeof root?.message === "string", "GET / should return message");

  r = await req("/api/auth/login", { method: "POST", body: { email: adminEmail, password: "wrong" } });
  assert(r.status === 401, "bad login should be 401");

  r = await req("/api/auth/login", { method: "POST", body: { email: adminEmail, password: adminPass } });
  assert(r.status === 200, "admin login should succeed");
  const adminLogin = r.json as { token: string; role: string };
  const adminToken = adminLogin.token;
  assert(adminLogin.role === "Admin", "admin role");

  r = await req("/api/users", { token: adminToken });
  assert(r.status === 200, "GET /api/users");

  const accUser = `acct_${suffix}`;
  const mgrUser = `mgr_${suffix}`;
  const anlUser = `anl_${suffix}`;

  r = await req("/api/users", {
    method: "POST",
    token: adminToken,
    body: {
      fullName: "Arjun Mehta",
      username: accUser,
      email: `${accUser}@ven.local`,
      role: "Accountant",
    },
  });
  assert(r.status === 201 || r.status === 200, `create accountant: ${r.status}`);
  const accTempPw = (r.json as { generatedTempPassword: string }).generatedTempPassword;
  assert(typeof accTempPw === "string" && accTempPw.length > 0, "generated temp password (accountant)");

  r = await req("/api/users", {
    method: "POST",
    token: adminToken,
    body: {
      fullName: "Kavita Joshi",
      username: mgrUser,
      email: `${mgrUser}@ven.local`,
      role: "Manager",
    },
  });
  assert(r.status === 201 || r.status === 200, `create manager: ${r.status}`);
  const mgrTempPw = (r.json as { generatedTempPassword: string }).generatedTempPassword;
  assert(typeof mgrTempPw === "string" && mgrTempPw.length > 0, "generated temp password (manager)");

  r = await req("/api/users", {
    method: "POST",
    token: adminToken,
    body: {
      fullName: "Siddharth Bose",
      username: anlUser,
      email: `${anlUser}@ven.local`,
      role: "Analyst",
    },
  });
  assert(r.status === 201 || r.status === 200, `create analyst: ${r.status}`);
  const anlTempPw = (r.json as { generatedTempPassword: string }).generatedTempPassword;
  assert(typeof anlTempPw === "string" && anlTempPw.length > 0, "generated temp password (analyst)");

  r = await req("/api/users", {
    method: "POST",
    token: adminToken,
    body: {
      fullName: "Riya Malhotra",
      username: `del_${suffix}`,
      email: `del_${suffix}@ven.local`,
      role: "Accountant",
    },
  });
  assert(r.status === 201 || r.status === 200, "create user for delete test");
  const delId = (r.json as { id: number }).id;
  r = await req(`/api/users/${delId}`, { method: "DELETE", token: adminToken });
  assert(r.status === 204, `soft delete user: ${r.status}`);
  r = await req("/api/users", { token: adminToken });
  assert(r.status === 200, "GET users after delete");
  const userRows = r.json as { username: string; isActive: boolean }[];
  const deletedRow = userRows.find((u) => u.username === `del_${suffix}`);
  assert(deletedRow && deletedRow.isActive === false, "deleted user is inactive");

  r = await req("/api/users", {
    method: "POST",
    token: adminToken,
    body: {
      fullName: "Aditya Khanna",
      username: `rst_${suffix}`,
      email: `rst_${suffix}@ven.local`,
      role: "Accountant",
    },
  });
  assert(r.status === 201 || r.status === 200, "create user for reset test");
  const rstId = (r.json as { id: number }).id;
  r = await req(`/api/users/${rstId}/reset-password`, { method: "PATCH", token: adminToken, body: {} });
  assert(r.status === 200, `admin reset password: ${r.status}`);
  const resetPw = (r.json as { generatedTempPassword: string }).generatedTempPassword;
  assert(typeof resetPw === "string" && resetPw.length > 0, "reset returns generated temp password");

  async function loginAndSetPassword(email: string, p: string, finalPw: string) {
    let loginRes = await req("/api/auth/login", { method: "POST", body: { email, password: p } });
    assert(loginRes.status === 200, `login ${email}`);
    const first = loginRes.json as { token: string; tempPass: boolean };
    assert(first.tempPass === true, "should be temp pass");
    const ch = await req("/api/auth/change-password", {
      method: "POST",
      token: first.token,
      body: { newPassword: finalPw },
    });
    assert(ch.status === 200, `change-password ${email}`);
    return (ch.json as { token: string }).token;
  }

  const finalPw = "FinalPass1!";
  const accToken = await loginAndSetPassword(`${accUser}@ven.local`, accTempPw, finalPw);
  const mgrToken = await loginAndSetPassword(`${mgrUser}@ven.local`, mgrTempPw, finalPw);
  const anlToken = await loginAndSetPassword(`${anlUser}@ven.local`, anlTempPw, finalPw);

  r = await req("/api/payments", { token: adminToken });
  assert(r.status === 403, "admin should not list payments");

  const vendorName = `Dell India Test ${suffix}`;
  r = await req("/api/vendors", {
    method: "POST",
    token: adminToken,
    body: {
      name: vendorName,
      contactName: "Neha Kapoor",
      email: `vendor.${suffix}@ven.local`,
      phone: "+91-98765-43210",
      address: "Tower B, Cyber City, Gurugram 122002, India",
    },
  });
  assert(r.status === 201, `create vendor ${r.status}`);
  const vendor = r.json as { id: number };

  r = await req(`/api/vendors/${vendor.id}/accounts`, {
    method: "POST",
    token: adminToken,
    body: {
      bankName: "HDFC Bank",
      accountName: "Vendor Operating",
      accountNo: "50100987654321",
      routingNo: "HDFC0000999",
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

  r = await req("/api/reports/preview", {
    method: "POST",
    token: anlToken,
    body: { filters: { statuses: ["APPROVED"] } },
  });
  assert(r.status === 200, "preview report data");
  const preview = r.json as { totalCount?: number; items?: unknown[] };
  assert(typeof preview.totalCount === "number", "preview totalCount");
  assert(Array.isArray(preview.items), "preview items array");

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

  const pdfStatus = await reqGetStatus(`/api/reports/${reportId}/download?format=pdf`, anlToken);
  assert(pdfStatus === 200, "download report pdf");
  const xlsxStatus = await reqGetStatus(`/api/reports/${reportId}/download?format=xlsx`, anlToken);
  assert(xlsxStatus === 200, "download report xlsx");

  r = await req("/api/reports/generate", {
    method: "POST",
    token: adminToken,
    body: { reportType: "Summary", filters: {} },
  });
  assert(r.status === 403, "admin cannot generate (Analyst only)");

  console.log("All checks passed.");
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
