const workshopDb = db.getSiblingDB("mongo_workshop");

function section(title) {
  print("\n=== " + title + " ===");
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEq(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message + " (expected " + expected + ", got " + actual + ")");
  }
}

section("Collection counts");
assertEq(workshopDb.customers.countDocuments(), 5, "Unexpected customer count");
assertEq(workshopDb.products.countDocuments(), 8, "Unexpected product count");
assertEq(workshopDb.orders.countDocuments(), 6, "Unexpected order count");
assertEq(workshopDb.cart_sessions.countDocuments(), 2, "Unexpected cart session count");
print("Counts look correct.");