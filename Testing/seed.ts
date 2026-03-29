/**
 * Inserts roles, tax types, users (@ven.local), vendors, and bank accounts after migrations.
 * Uses sqlcmd -E (Windows integrated security) to match local SQL Server + dotnet ef.
 */
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import bcrypt from "bcryptjs";
import { getConnectionString } from "./connection.ts";

const rounds = 11;
const devPassword = "Admin123!";

function parseServerAndDatabase(cs: string): { server: string; database: string } {
  const serverM = /Server=([^;]+)/i.exec(cs);
  const dbM = /Database=([^;]+)/i.exec(cs);
  if (!serverM?.[1] || !dbM?.[1]) throw new Error("Connection string must include Server= and Database=");
  return { server: serverM[1].trim(), database: dbM[1].trim() };
}

async function main() {
  const cs = getConnectionString();
  const { server, database } = parseServerAndDatabase(cs);
  const pwHash = bcrypt.hashSync(devPassword, rounds);
  const esc = pwHash.replace(/'/g, "''");

  const sql = `
SET NOCOUNT ON;
SET IDENTITY_INSERT Roles ON;
INSERT INTO Roles (Id, Name) VALUES
  (1, N'Admin'),
  (2, N'Accountant'),
  (3, N'Manager'),
  (4, N'Analyst');
SET IDENTITY_INSERT Roles OFF;

SET IDENTITY_INSERT TaxTypes ON;
INSERT INTO TaxTypes (Id, Name, Rate, Description, IsActive) VALUES
  (1, N'None', 0, N'No tax', 1),
  (2, N'GST', 0.10, N'Goods and Services Tax 10%', 1),
  (3, N'VAT', 0.15, N'Value Added Tax 15%', 1),
  (4, N'WHT', 0.05, N'Withholding Tax 5%', 1);
SET IDENTITY_INSERT TaxTypes OFF;

INSERT INTO Users (FullName, Username, Email, PasswordHash, TempPass, IsActive, RoleId) VALUES
  (N'Rajesh Krishnan', N'admin', N'admin@ven.local', N'${esc}', 0, 1, 1),
  (N'Priya Sharma', N'acct1', N'accountant1@ven.local', N'${esc}', 0, 1, 2),
  (N'Vikram Iyer', N'acct2', N'accountant2@ven.local', N'${esc}', 0, 1, 2),
  (N'Ananya Reddy', N'mgr1', N'manager1@ven.local', N'${esc}', 0, 1, 3),
  (N'Karthik Nair', N'mgr2', N'manager2@ven.local', N'${esc}', 0, 1, 3),
  (N'Deepika Menon', N'anl1', N'analyst1@ven.local', N'${esc}', 0, 1, 4),
  (N'Rohit Saxena', N'anl2', N'analyst2@ven.local', N'${esc}', 0, 1, 4);

INSERT INTO Vendors (Name, ContactName, Email, Phone, Address, IsActive, CreatedAt) VALUES
  (N'Dell India Pvt Ltd', N'Sunita Desai', N'ap.dell@procurement.ven.local', N'+91-22-6123-4000', N'Plot 3, Mindspace, Malad West, Mumbai 400064', 1, SYSUTCDATETIME()),
  (N'HP India Sales Pvt Ltd', N'Rahul Verma', N'vendor.hp@supply.ven.local', N'+91-80-2563-3555', N'Embassy Tech Village, Bellandur, Bengaluru 560103', 1, SYSUTCDATETIME()),
  (N'Cisco Systems India Pvt Ltd', N'Meera Krishnamurthy', N'india.ar@cisco.ven.local', N'+91-124-432-1000', N'C-DAC IT Park, Sector 62, Noida 201309', 1, SYSUTCDATETIME());

INSERT INTO VendorBankAccounts (VendorId, BankName, AccountName, AccountNo, RoutingNo, SwiftCode, IsDefault) VALUES
  (1, N'HDFC Bank', N'Dell India Operating', N'50100123456789', N'HDFC0000123', N'HDFCINBB', 1),
  (1, N'ICICI Bank', N'Dell India GST Reserve', N'123456789012', N'ICIC0000456', NULL, 0),
  (2, N'State Bank of India', N'HP India Collections', N'345678901234', N'SBIN0007890', N'SBININBB', 1),
  (3, N'Axis Bank', N'Cisco India Ops', N'987654321098', N'UTIB0001234', NULL, 1);
`;

  const tmp = join(import.meta.dir, "tmp-seed.sql");
  writeFileSync(tmp, sql, "utf8");

  const sqlcmd = process.env.SQLCMD ?? "sqlcmd";
  const r = await $`${sqlcmd} -S ${server} -d ${database} -E -C -b -i ${tmp}`.quiet();
  unlinkSync(tmp);

  if (r.exitCode !== 0) {
    console.error(r.stderr.toString());
    process.exit(1);
  }

  console.log("Roles, tax types, users, vendors, and bank accounts inserted.");
  console.log(`  Password for all seeded users: ${devPassword}`);
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
