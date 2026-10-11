import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
const base = process.env.TEST_APP_URL || 'http://localhost:3001';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Run this test against a disposable local database only.');
function client() {
  let cookie = '';
  return async (path, body, method = 'POST') => {
    const response = await fetch(base + path, { method, redirect: 'manual', headers: { ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
    const cookies = response.headers.getSetCookie(); if (cookies.length) cookie = cookies.map((entry) => entry.split(';')[0]).join('; ');
    const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: response.status, data, location: response.headers.get('location') };
  };
}
async function main() {
  const admin = client();
  assert.equal((await admin('/api/auth/login', { email: 'admin@mykhairat.my', password: 'Admin@12345' })).status, 200);
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Keluarga');
  sheet.addRow(['Nama Wakil', 'Telefon', 'Nama Ahli', 'Hubungan', 'No IC']);
  sheet.addRow(['Audittest Amin', '0123456789', 'Audittest Amin', 'Wakil', '']);
  sheet.addRow(['', '', 'Ahli Anak', 'Anak', '012345678901']);
  const form = new FormData(); form.set('file', new Blob([await workbook.xlsx.writeBuffer()]), 'families.xlsx');
  const parsed = await admin('/api/import/families/preview', form); assert.equal(parsed.status, 200); assert.equal(parsed.data.sheets[0].mapping.wakil, 0); assert.equal(parsed.data.sheets[0].mapping.member, 2);
  const payload = { joinedMonth: '2026-10', families: [{ wakilName: 'Audittest Amin', phone: '0123456789', members: [{ name: 'Audittest Amin', relationship: 'Wakil', ic: '' }, { name: 'Ahli Anak', relationship: 'Anak', ic: '012345678901' }] }, { wakilName: 'Audittest Ali', phone: '', members: [] }] };
  const imported = await admin('/api/import/families', payload); assert.equal(imported.status, 201, JSON.stringify(imported.data));
  const [first, second] = imported.data.accounts; assert.notEqual(first.username, second.username); assert.ok(first.username.startsWith('audittest'));
  assert.equal((await admin('/api/import/families', payload)).status, 409);
  assert.equal((await admin('/api/import/families', { ...payload, families: [{ wakilName: 'Rollback Test', phone: '', members: [] }, payload.families[0]] })).status, 409);
  const directory = await admin('/api/families', undefined, 'GET'); assert.ok(!directory.data.some((family) => family.wakilName === 'Rollback Test'), 'A failed import must roll back every new family');
  const family = await admin('/api/families/' + first.familyId, undefined, 'GET'); assert.equal(family.data.members.length, 2);
  const wakil = client();
  const login = await wakil('/api/auth/login', { email: first.username, password: 'mykhairat' }); assert.equal(login.status, 200); assert.equal(login.data.mustChangePassword, true);
  assert.equal((await wakil('/api/dashboard', undefined, 'GET')).status, 403);
  const gated = await wakil('/app', undefined, 'GET'); assert.equal(gated.status, 307); assert.ok(gated.location.includes('change-password'));
  assert.equal((await wakil('/api/auth/change-password', { currentPassword: 'mykhairat', password: 'mykhairat' })).status, 400);
  assert.equal((await wakil('/api/auth/change-password', { currentPassword: 'wrong', password: 'Updated@123' })).status, 400);
  assert.equal((await wakil('/api/auth/change-password', { currentPassword: 'mykhairat', password: 'Updated@123' })).status, 200);
  assert.equal((await wakil('/api/dashboard', undefined, 'GET')).status, 200);
  const accounts = await admin('/api/users', undefined, 'GET'); const user = accounts.data.find((a) => a.username === first.username);
  assert.equal((await admin('/api/users/' + user.id, { resetDefault: true }, 'PATCH')).status, 200);
  assert.equal((await wakil('/api/dashboard', undefined, 'GET')).status, 401);
  assert.equal((await wakil('/api/auth/login', { email: first.username, password: 'Updated@123' })).status, 401);
  const resetLogin = await wakil('/api/auth/login', { email: first.username, password: 'mykhairat' }); assert.equal(resetLogin.status, 200); assert.equal(resetLogin.data.mustChangePassword, true);
  assert.equal((await wakil('/api/dashboard', undefined, 'GET')).status, 403);
  assert.equal((await wakil('/api/users/' + user.id, { resetDefault: true }, 'PATCH')).status, 403);
  const google = await admin('/api/auth/google', undefined, 'GET'); assert.equal(google.status, 307); assert.ok(google.location.endsWith('/login'));
  for (const account of imported.data.accounts) assert.equal((await admin('/api/families/' + account.familyId, undefined, 'DELETE')).status, 200);
  console.log('Excel parsing, duplicate protection, username collisions, forced password change, reset, session revocation and admin-only access passed.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
