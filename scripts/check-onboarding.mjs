import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { createDecipheriv, scryptSync } from "node:crypto";
const base = process.env.TEST_APP_URL || "http://localhost:3001";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Run this test against a disposable local database only.",
);
function client() {
  let cookie = "";
  return async (path, body, method = "POST") => {
    const response = await fetch(base + path, {
      method,
      redirect: "manual",
      headers: {
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length)
      cookie = cookies.map((entry) => entry.split(";")[0]).join("; ");
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return {
      status: response.status,
      data,
      location: response.headers.get("location"),
    };
  };
}
async function main() {
  const admin = client();
  assert.equal(
    (
      await admin("/api/auth/login", {
        email: "admin@mykhairat.my",
        password: "Admin@12345",
      })
    ).status,
    200,
  );
  const previous = await admin("/api/families", undefined, "GET");
  for (const f of previous.data.filter((f) =>
    ["Audittest Amin", "Audittest Ali", "Rollback Test"].includes(f.wakilName),
  ))
    await admin("/api/families/" + f.familyId, undefined, "DELETE");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Keluarga");
  sheet.addRow(["Nama Wakil", "Telefon", "Nama Ahli", "Hubungan", "No IC"]);
  sheet.addRow(["Audittest Amin", "0123456789", "Audittest Amin", "Wakil", ""]);
  sheet.addRow(["", "", "Ahli Anak", "Anak", "012345678901"]);
  const form = new FormData();
  form.set(
    "file",
    new Blob([await workbook.xlsx.writeBuffer()]),
    "families.xlsx",
  );
  const parsed = await admin("/api/import/families/preview", form);
  assert.equal(parsed.status, 200);
  assert.equal(parsed.data.sheets[0].mapping.wakil, 0);
  assert.equal(parsed.data.sheets[0].mapping.member, 2);
  const payload = {
    joinedMonth: "2026-10",
    families: [
      {
        wakilName: "Audittest Amin",
        phone: "0123456789",
        members: [
          { name: "Audittest Amin", relationship: "Wakil", ic: "" },
          { name: "Ahli Anak", relationship: "Anak", ic: "012345678901" },
        ],
      },
      { wakilName: "Audittest Ali", phone: "", members: [] },
    ],
  };
  const imported = await admin("/api/import/families", payload);
  assert.equal(imported.status, 201, JSON.stringify(imported.data));
  const [first, second] = imported.data.accounts;
  assert.notEqual(first.username, second.username);
  assert.ok(first.username.startsWith("audittest"));
  assert.equal((await admin("/api/import/families", payload)).status, 409);
  assert.equal(
    (
      await admin("/api/import/families", {
        ...payload,
        families: [
          { wakilName: "Rollback Test", phone: "", members: [] },
          payload.families[0],
        ],
      })
    ).status,
    409,
  );
  const directory = await admin("/api/families", undefined, "GET");
  assert.ok(
    !directory.data.some((family) => family.wakilName === "Rollback Test"),
    "A failed import must roll back every new family",
  );
  const family = await admin(
    "/api/families/" + first.familyId,
    undefined,
    "GET",
  );
  assert.equal(family.data.members.length, 2);
  const wakil = client();
  assert.equal(
    (
      await wakil("/api/auth/login", {
        email: first.username,
        password: "mykhairat",
      })
    ).status,
    403,
    "Default credentials alone must not activate a wakil",
  );
  const login = await wakil("/api/auth/login", {
    email: first.username,
    password: "mykhairat",
    activationCode: first.activationCode,
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.mustChangePassword, true);
  assert.equal((await wakil("/api/dashboard", undefined, "GET")).status, 403);
  const gated = await wakil("/app", undefined, "GET");
  assert.ok(gated.status === 307 || gated.status === 200);
  assert.ok((gated.location || gated.data).includes("change-password"));
  assert.equal(
    (
      await wakil("/api/auth/change-password", {
        currentPassword: "mykhairat",
        password: "mykhairat",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await wakil("/api/auth/change-password", {
        currentPassword: "wrong",
        password: "Updated@123",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await wakil("/api/auth/change-password", {
        currentPassword: "mykhairat",
        password: "Updated@123",
      })
    ).status,
    200,
  );
  assert.equal((await wakil("/api/dashboard", undefined, "GET")).status, 200);
  const accounts = await admin("/api/users", undefined, "GET");
  const user = accounts.data.find((a) => a.username === first.username);
  const reset = await admin(
    "/api/users/" + user.id,
    { resetDefault: true },
    "PATCH",
  );
  assert.equal(reset.status, 200);
  assert.equal((await wakil("/api/dashboard", undefined, "GET")).status, 401);
  assert.equal(
    (
      await wakil("/api/auth/login", {
        email: first.username,
        password: "Updated@123",
      })
    ).status,
    401,
  );
  const resetLogin = await wakil("/api/auth/login", {
    email: first.username,
    password: "mykhairat",
    activationCode: reset.data.activationCode,
  });
  assert.equal(resetLogin.status, 200);
  assert.equal(resetLogin.data.mustChangePassword, true);
  assert.equal((await wakil("/api/dashboard", undefined, "GET")).status, 403);
  assert.equal(
    (await wakil("/api/users/" + user.id, { resetDefault: true }, "PATCH"))
      .status,
    403,
  );
  const google = await admin("/api/auth/google", undefined, "GET");
  assert.equal(google.status, 307);
  assert.ok(google.location.endsWith("/login"));
  const now = new Date();
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
  })
    .format(now)
    .slice(0, 7);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const unique = Date.now().toString();
  const created = await admin("/api/families", {
    wakilName: "Upgrade Fixture " + unique,
    wakilPhone: "0123456789",
    familyStatus: "Active",
    joinedMonth: month,
    openingBalance: 0,
    notes: "Fixture only",
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const fid = created.data.family.familyId;
  assert.equal(
    created.data.members.length,
    1,
    "A normal family form includes its wakil once",
  );
  assert.equal(
    (
      await admin("/api/members", {
        familyId: fid,
        memberName: "Fixture child",
        relationship: "Anak",
        memberStatus: "Aktif",
        icNumber: "010101010101",
      })
    ).status,
    201,
  );
  let fixture = await admin("/api/families/" + fid, undefined, "GET");
  assert.equal(
    fixture.data.snapshots.find((r) => r.month === month).expected,
    10,
  );
  assert.equal(
    fixture.data.snapshots.find((r) => r.month === month).confirmed,
    false,
  );
  assert.ok(
    fixture.data.members
      .find((m) => m.memberName === "Fixture child")
      .icNumber.includes("•"),
    "IC responses must be masked",
  );
  assert.equal(
    (
      await admin("/api/assessments", {
        familyId: fid,
        month,
        expected: 10,
        count: 2,
        reason: "Verified fixture family at onboarding",
      })
    ).status,
    200,
  );
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT5sAAAAASUVORK5CYII=";
  const evidence = await admin("/api/upload", { familyId: fid, dataUrl: png });
  assert.equal(evidence.status, 201);
  const payment = await admin("/api/payments/manual", {
    familyId: fid,
    paymentMonthYear: month,
    amountPaid: 10,
    transactionReference: "AUD-PAY-" + unique,
    paymentDate: date,
    markApproved: false,
    entryNote: "Receipt from WhatsApp fixture",
    receiptId: evidence.data.receiptId,
  });
  assert.equal(payment.status, 201, JSON.stringify(payment.data));
  const review = await Promise.all([
    admin("/api/payments/" + payment.data.paymentId + "/approve"),
    admin("/api/payments/" + payment.data.paymentId + "/reject", {
      reason: "Concurrent fixture review",
    }),
  ]);
  assert.deepEqual(
    review.map((r) => r.status).sort(),
    [200, 409],
    "Exactly one reviewer wins",
  );
  const reviewed = await admin(
    "/api/payments/" + payment.data.paymentId,
    undefined,
    "GET",
  );
  if (reviewed.data.approvalStatus === "Rejected")
    assert.equal(
      (
        await admin("/api/payments/manual", {
          familyId: fid,
          paymentMonthYear: month,
          amountPaid: 10,
          transactionReference: "AUD-PAY-RETRY-" + unique,
          paymentDate: date,
          markApproved: true,
          entryNote: "Verified cash fixture",
        })
      ).status,
      201,
    );
  assert.equal(
    (
      await admin("/api/members", {
        familyId: fid,
        memberName: "Next month child",
        relationship: "Anak",
        memberStatus: "Aktif",
      })
    ).status,
    201,
  );
  fixture = await admin("/api/families/" + fid, undefined, "GET");
  assert.equal(
    fixture.data.snapshots.find((r) => r.month === month).expected,
    10,
    "Adding members preserves locked current assessments",
  );
  const before = await admin("/api/fund", undefined, "GET");
  const claimant = fixture.data.members.find((m) => m.relationship === "Wakil");
  const warded = await admin("/api/claims", {
    familyId: fid,
    memberId: claimant.memberId,
    claimDate: date,
    claimType: "Warded",
    amount: 200,
    recipientName: "Fixture recipient",
    recipientAccount: "Fixture bank account",
    receiptId: evidence.data.receiptId,
    eventReference: "ADM-" + unique,
    notes: "Critical admission fixture",
  });
  assert.equal(warded.status, 201, JSON.stringify(warded.data));
  assert.equal(
    (await admin("/api/fund", undefined, "GET")).data.summary.balance,
    before.data.summary.balance,
    "Submitted claims do not change cash",
  );
  assert.equal(
    (
      await admin(
        "/api/claims/" + warded.data.claimId,
        { status: "Reviewed", note: "Medical proof verified" },
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await admin(
        "/api/claims/" + warded.data.claimId,
        { status: "Approved", note: "Approved by family policy" },
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await admin(
        "/api/claims/" + warded.data.claimId,
        {
          status: "Paid",
          note: "Bank transfer verified",
          paidDate: date,
          reference: "AUD-OUT-" + unique,
          receiptId: evidence.data.receiptId,
        },
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal(
    (await admin("/api/fund", undefined, "GET")).data.summary.balance,
    before.data.summary.balance - 200,
    "Only paid claims reduce cash",
  );
  const treasurer = await admin("/api/users", {
    name: "Fixture treasurer",
    email: "treasurer" + unique + "@test.invalid",
    password: "Fixture@12345",
    accessProfile: "treasurer",
  });
  assert.equal(treasurer.status, 201);
  const low = client();
  assert.equal(
    (
      await low("/api/auth/login", {
        email: "treasurer" + unique + "@test.invalid",
        password: "Fixture@12345",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await low("/api/auth/change-password", {
        currentPassword: "Fixture@12345",
        password: "Changed@12345",
      })
    ).status,
    200,
  );
  assert.equal(
    (await low("/api/payments/" + payment.data.paymentId + "/approve")).status,
    403,
  );
  assert.equal((await low("/api/users", undefined, "GET")).status, 403);
  assert.equal(
    (
      await low("/api/fund", {
        kind: "Donation",
        date,
        amount: 1,
        reference: "DENIED",
        note: "Must not write",
      })
    ).status,
    403,
  );
  const legacy = await admin("/api/families", {
    wakilName: "Legacy Fixture " + unique,
    wakilPhone: "0123456789",
    familyStatus: "Active",
    joinedMonth: "2025-01",
    openingBalance: 0,
    notes: "Historical fixture",
  });
  assert.equal(legacy.status, 201);
  const lid = legacy.data.family.familyId;
  const csv =
    "Family ID,Tarikh,Bulan,Jumlah,Rujukan,Caruman Sebenar,Bilangan Ahli\n" +
    lid +
    ",2025-01-08,2025-01,5,HIST-" +
    unique +
    ",5,1";
  const f = new FormData();
  f.set("file", new Blob([csv]), "legacy.csv");
  const preview = await admin("/api/import/transactions", f);
  assert.equal(preview.status, 200, JSON.stringify(preview.data));
  assert.equal(preview.data.errors.length, 0);
  assert.equal(preview.data.total, 5);
  assert.equal(
    (
      await admin("/api/import/transactions", {
        rows: preview.data.rows,
        confirm: true,
        note: "Historical source verified in fixture",
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await admin("/api/import/transactions", {
        rows: preview.data.rows,
        confirm: true,
        note: "Duplicate fixture import rejected",
      })
    ).status,
    409,
  );
  const passphrase = "Test backup passphrase only 2026";
  const backup = await admin("/api/backup", { passphrase });
  assert.equal(backup.status, 200);
  assert.equal(backup.data.format, "mykhairat-encrypted-v1");
  assert.ok(!JSON.stringify(backup.data).includes("010101010101"));
  const cipher = createDecipheriv(
    "aes-256-gcm",
    scryptSync(passphrase, Buffer.from(backup.data.salt, "base64"), 32),
    Buffer.from(backup.data.iv, "base64"),
  );
  cipher.setAuthTag(Buffer.from(backup.data.tag, "base64"));
  const clearBackup = Buffer.concat([
    cipher.update(Buffer.from(backup.data.data, "base64")),
    cipher.final(),
  ]);
  const decoded = JSON.parse(
    (backup.data.compression === "gzip"
      ? gunzipSync(clearBackup)
      : clearBackup
    ).toString(),
  );
  assert.ok(
    decoded.tables.members
      .find((m) => m.member_name === "Fixture child")
      .ic_number.startsWith("enc:v1:"),
    "IC is encrypted at rest",
  );
  console.log(
    "Atomic review, preserved assessments, cash claim lifecycle, permissions, historical import and encrypted backup passed.",
  );
  for (const account of imported.data.accounts)
    assert.equal(
      (await admin("/api/families/" + account.familyId, undefined, "DELETE"))
        .status,
      200,
    );
  console.log(
    "Excel parsing, duplicate protection, username collisions, forced password change, reset, session revocation and admin-only access passed.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
