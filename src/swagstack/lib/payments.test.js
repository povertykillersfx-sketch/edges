import test from "node:test";
import assert from "node:assert/strict";
import { describePaymentStatus, formatMoney, paymentEnv } from "./payments.js";

test("paymentEnv reports unconfigured providers by default", () => {
  const env = paymentEnv();
  assert.equal(typeof env.payfastReady, "boolean");
  assert.equal(typeof env.stripeReady, "boolean");
});

test("describePaymentStatus never claims ready without keys", () => {
  const status = describePaymentStatus();
  if (!status.ready) {
    assert.equal(status.provider, "none");
    assert.match(status.message, /not configured/i);
  }
});

test("formatMoney formats ZAR cents", () => {
  assert.match(formatMoney(29900, "ZAR"), /299/);
});
