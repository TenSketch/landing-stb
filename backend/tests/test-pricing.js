import assert from "assert";
import { calculateFare, VEHICLE_RATES } from "../../lib/pricing.js";
import { handleEstimateFare } from "../../lib/handlers.js";
import dotenv from "dotenv";
dotenv.config();

console.log("=== Running STB Pricing Tests ===");

// 1. Test calculation values
try {
  // 4-Seater base 40, per km 2.20
  // distance 10km => 40 + 22 = 62.00
  const fare4 = calculateFare("4-Seater", 10);
  assert.strictEqual(fare4, 62.00);
  console.log("✓ 4-Seater calculation for 10km passed: SGD", fare4);

  // 6-Seater base 45, per km 2.50
  // distance 15km => 45 + 37.5 = 82.50
  const fare6 = calculateFare("6-Seater", 15);
  assert.strictEqual(fare6, 82.50);
  console.log("✓ 6-Seater calculation for 15km passed: SGD", fare6);

  // Invalid category
  assert.strictEqual(calculateFare("Invalid-Category", 10), null);
  console.log("✓ Invalid category handling passed");
} catch (e) {
  console.error("✗ Unit tests failed:", e);
  process.exit(1);
}

// 2. Test handleEstimateFare mock / basic validation
try {
  const badRes = await handleEstimateFare({});
  assert.strictEqual(badRes.status, 400);
  console.log("✓ handleEstimateFare missing params validation passed:", badRes.body.error);
} catch (e) {
  console.error("✗ Validation test failed:", e);
  process.exit(1);
}

console.log("=== STB Pricing Tests Passed successfully ===");
