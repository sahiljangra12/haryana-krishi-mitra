import test from "node:test";
import assert from "node:assert/strict";
import { KVKS, kvkFor, INSTITUTES, SCHEMES, PROBLEMS, payStatus, ledgerTotals, buyerRecord, cleanSales, STORE_KINDS, mapSearch } from "../docs/js/directory.js";
import { DISTRICTS } from "../docs/js/districts.js";

test("KVK list: 18 centres as on ICAR's page, each in a district the app knows", () => {
  assert.equal(KVKS.length, 18);
  for (const k of KVKS) { assert.ok(DISTRICTS.find((d) => d.name === k.district), k.district); assert.match(k.addr, /\d{6}$/); }
  assert.equal(new Set(KVKS.map((k) => k.district)).size, 18);
});
test("every district gets a KVK: its own, or the nearest listed one, said plainly", () => {
  const karnal = kvkFor("Karnal", DISTRICTS); assert.equal(karnal.own, true); assert.match(karnal.kvk.addr, /NDRI/);
  const missing = DISTRICTS.filter((d) => !KVKS.find((k) => k.district === d.name)).map((d) => d.name).sort();
  assert.deepEqual(missing, ["Charkhi Dadri", "Nuh", "Palwal", "Panchkula"]);
  const pkl = kvkFor("Panchkula", DISTRICTS); assert.equal(pkl.own, false); assert.equal(pkl.kvk.district, "Ambala"); assert.ok(pkl.km > 10 && pkl.km < 80);
  assert.equal(kvkFor("Palwal", DISTRICTS).kvk.district, "Faridabad");
  assert.equal(kvkFor("Atlantis", DISTRICTS), null);
});
test("directory entries are complete and point to https pages", () => {
  for (const i of INSTITUTES) { assert.match(i.url, /^https:\/\//); assert.ok(i.en && i.hi && i.does.en && i.does.hi); }
  for (const s of SCHEMES) { assert.match(s.url, /^https:\/\//); assert.ok(s.gives.hi && s.who.hi && s.how.hi && s.src); }
  for (const p of PROBLEMS) { for (const id of p.inst) assert.ok(INSTITUTES.find((i) => i.id === id), id); for (const id of p.schemes) assert.ok(SCHEMES.find((s) => s.id === id), id); assert.ok(p.go.length); }
  assert.match(mapSearch("cold storage near Karnal, Haryana"), /query=cold%20storage/);
  assert.deepEqual(Object.keys(STORE_KINDS), ["grain", "potato", "fresh", "flower"]);
});
test("payment status: on time, late, due, overdue", () => {
  const t = "2026-11-27";
  assert.deepEqual(payStatus({ dueDate: "2026-11-20", paidDate: "2026-11-19" }, t), { state: "paid_on_time", days: 0 });
  assert.deepEqual(payStatus({ dueDate: "2026-11-20", paidDate: "2026-11-25" }, t), { state: "paid_late", days: 5 });
  assert.deepEqual(payStatus({ dueDate: "2026-12-02" }, t), { state: "due", days: 5 });
  assert.deepEqual(payStatus({ dueDate: "2026-11-17" }, t), { state: "overdue", days: 10 });
  assert.equal(payStatus({}, t).state, "no_date"); assert.equal(payStatus({ paidDate: "2026-11-01" }, t).state, "paid");
});
test("ledger totals and one buyer's record, from the farmer's own entries only", () => {
  const t = "2026-11-27", sales = [
    { buyer: "Ram Traders", amount: 50000, dueDate: "2026-11-10", paidDate: "2026-11-20" },
    { buyer: "ram traders ", amount: 30000, dueDate: "2026-11-17" },
    { buyer: "Shyam & Co", amount: 20000, dueDate: "2026-12-05" },
    { buyer: "Ram Traders", amount: 10000, dueDate: "2026-10-01", paidDate: "2026-10-01" },
  ];
  assert.deepEqual(ledgerTotals(sales, t), { received: 60000, pending: 50000, overdue: 30000, overdueCount: 1 });
  assert.deepEqual(buyerRecord(sales, "Ram Traders", t), { sales: 3, late: 2, onTime: 1 });
  assert.equal(cleanSales([{ amount: 0 }, { amount: "500", saleDate: "27/11/2026", dueDate: "2026-12-01" }, null]).length, 1);
  assert.equal(cleanSales([{ amount: "500", saleDate: "27/11/2026" }])[0].saleDate, "");
});
