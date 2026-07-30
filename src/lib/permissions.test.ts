import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSuperadmin,
  canAccessStaffPanel,
  canAccessBusinessPanel,
  canEditListing,
  writableListingFields,
  resolveOwnerStatusTransition,
  postLoginPath,
  isSafeCallbackPath,
} from "./permissions";

const superadmin = { id: "u1", email: "boss@example.com", role: "superadmin" as const };
const owner = { id: "u2", email: "owner@example.com", role: "business" as const };
const otherOwner = { id: "u3", email: "other@example.com", role: "business" as const };
const legacyAdmin = { id: "u4", email: "legacy@example.com", role: "admin" as const };
const tourist = { id: "u5", email: "tourist@example.com", role: "tourist" as const };

const place = { _id: "p1", ownerId: "u2", status: "active" };

test("isSuperadmin recognises only the superadmin role", () => {
  assert.equal(isSuperadmin(superadmin), true);
  assert.equal(isSuperadmin(owner), false);
  assert.equal(isSuperadmin(legacyAdmin), false);
  assert.equal(isSuperadmin(null), false);
  assert.equal(isSuperadmin(undefined), false);
});

test("staff panel admits superadmin only", () => {
  assert.equal(canAccessStaffPanel(superadmin), true);
  assert.equal(canAccessStaffPanel(legacyAdmin), false, "deprecated admin role must be locked out");
  assert.equal(canAccessStaffPanel(owner), false);
  assert.equal(canAccessStaffPanel(tourist), false);
  assert.equal(canAccessStaffPanel(null), false);
});

test("business panel admits business owners and superadmins", () => {
  assert.equal(canAccessBusinessPanel(owner), true);
  assert.equal(canAccessBusinessPanel(superadmin), true);
  assert.equal(canAccessBusinessPanel(legacyAdmin), false);
  assert.equal(canAccessBusinessPanel(tourist), false);
  assert.equal(canAccessBusinessPanel(null), false);
});

test("canEditListing allows the owner and any superadmin, refuses everyone else", () => {
  assert.equal(canEditListing(owner, place), true);
  assert.equal(canEditListing(superadmin, place), true);
  assert.equal(canEditListing(otherOwner, place), false, "another owner must not edit this listing");
  assert.equal(canEditListing(tourist, place), false);
  assert.equal(canEditListing(legacyAdmin, place), false);
  assert.equal(canEditListing(null, place), false);
  assert.equal(canEditListing(owner, null), false);
});

test("canEditListing compares owner ids as strings", () => {
  const objectIdish = { toString: () => "u2" };
  assert.equal(canEditListing(owner, { _id: "p9", ownerId: objectIdish, status: "active" }), true);
});

test("superadmin gets strictly more writable fields than an owner", () => {
  const ownerFields = writableListingFields(false);
  const staffFields = writableListingFields(true);
  for (const f of ownerFields) assert.ok(staffFields.includes(f), `${f} missing for superadmin`);
  for (const f of ["featured", "paid", "ownerId", "rating"]) {
    assert.ok(staffFields.includes(f), `${f} must be superadmin-writable`);
    assert.ok(!ownerFields.includes(f), `${f} must NOT be owner-writable`);
  }
  assert.ok(ownerFields.includes("name"));
  assert.ok(ownerFields.includes("images"));
  assert.ok(ownerFields.includes("services"));
  assert.ok(!ownerFields.includes("status"), "status is governed by resolveOwnerStatusTransition");
});

test("owner status transitions: only submit and withdraw", () => {
  assert.equal(resolveOwnerStatusTransition("draft", "pending"), "pending");
  assert.equal(resolveOwnerStatusTransition("rejected", "pending"), "pending");
  assert.equal(resolveOwnerStatusTransition("pending", "draft"), "draft");
  assert.equal(resolveOwnerStatusTransition("active", "draft"), null, "cannot unpublish a live listing");
  assert.equal(resolveOwnerStatusTransition("pending", "active"), null, "cannot self-activate");
  assert.equal(resolveOwnerStatusTransition("draft", "approved"), null, "cannot self-approve");
  assert.equal(resolveOwnerStatusTransition("draft", 42), null, "non-string is ignored");
  assert.equal(resolveOwnerStatusTransition("draft", undefined), null);
});

test("postLoginPath routes each role to its home", () => {
  assert.equal(postLoginPath("superadmin"), "/superadmin");
  assert.equal(postLoginPath("business"), "/business");
  assert.equal(postLoginPath("tourist"), "/trips");
  assert.equal(postLoginPath("admin"), "/trips", "deprecated role lands on the tourist page");
  assert.equal(postLoginPath(undefined), "/trips");
  assert.equal(postLoginPath(null), "/trips");
});

test("isSafeCallbackPath admits only same-origin relative paths", () => {
  assert.equal(isSafeCallbackPath("/en/deals"), true);
  assert.equal(isSafeCallbackPath("/trips"), true);
  assert.equal(isSafeCallbackPath("https://evil.example.com"), false);
  assert.equal(isSafeCallbackPath("//evil.example.com"), false, "protocol-relative URLs resolve as absolute in browsers");
  assert.equal(isSafeCallbackPath("http://x.com"), false);
  assert.equal(isSafeCallbackPath("javascript:alert(1)"), false);
  assert.equal(isSafeCallbackPath(""), false);
  assert.equal(isSafeCallbackPath("deals"), false, "bare relative path with no leading slash is rejected");
});
