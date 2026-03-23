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

section("Read queries");
const berlinPremiumCustomers = workshopDb.customers.find(
  {
    "address.city": "Berlin",
    loyalty_tier: { $in: ["gold", "platinum"] }
  },
  {
    _id: 0,
    customer_id: 1,
    email: 1,
    loyalty_tier: 1
  }
).sort({ customer_id: 1 }).toArray();
printjson(berlinPremiumCustomers);
assertEq(berlinPremiumCustomers.length, 2, "Expected two premium customers in Berlin");

const streamingProducts = workshopDb.products.find(
  { tags: "streaming" },
  { _id: 0, sku: 1, name: 1 }
).sort({ sku: 1 }).toArray();
printjson(streamingProducts);
assertEq(streamingProducts.length, 2, "Expected two streaming-related products");

section("Updates and upserts");
const stockUpdate = workshopDb.products.updateOne(
  { sku: "SKU-CAM-01" },
  {
    $inc: { "inventory.in_stock": -1 },
    $set: { last_demo_purchase_at: new Date("2026-03-22T10:00:00Z") },
    $addToSet: { tags: "featured" }
  }
);
assertEq(stockUpdate.matchedCount, 1, "Camera stock update did not match a product");
const updatedCamera = workshopDb.products.findOne(
  { sku: "SKU-CAM-01" },
  { _id: 0, sku: 1, "inventory.in_stock": 1, tags: 1 }
);
printjson(updatedCamera);
assertEq(updatedCamera.inventory.in_stock, 7, "Camera inventory should be decremented to 7");
assertTrue(updatedCamera.tags.includes("featured"), "Camera should be marked as featured");

const orderStatusUpdate = workshopDb.orders.updateOne(
  { order_id: "ORD-2026-0004" },
  {
    $set: { status: "shipped" },
    $push: {
      status_history: {
        status: "shipped",
        at: new Date("2026-03-22T10:05:00Z"),
        note: "Handed to DHL for delivery"
      }
    }
  }
);
assertEq(orderStatusUpdate.matchedCount, 1, "Expected to update ORD-2026-0004");
const updatedOrder = workshopDb.orders.findOne(
  { order_id: "ORD-2026-0004" },
  { _id: 0, order_id: 1, status: 1, status_history: 1 }
);
printjson(updatedOrder);
assertEq(updatedOrder.status, "shipped", "Order should now be shipped");
assertEq(updatedOrder.status_history.length, 4, "Order status history should have four entries");

const cartUpsert = workshopDb.cart_sessions.updateOne(
  { session_id: "cart-live-demo" },
  {
    $set: {
      customer_id: "CUST-1002",
      items: [
        { sku: "SKU-LIGHT-01", quantity: 2 }
      ],
      last_seen_at: new Date("2026-03-22T10:10:00Z"),
      expires_at: new Date("2030-03-22T11:10:00Z")
    }
  },
  { upsert: true }
);
assertEq(cartUpsert.upsertedCount, 1, "Expected one upserted cart session");
assertEq(
  workshopDb.cart_sessions.countDocuments({ session_id: "cart-live-demo" }),
  1,
  "cart-live-demo session should exist"
);

section("Aggregation pipelines");
const categoryRevenue = workshopDb.orders.aggregate([
  { $unwind: "$items" },
  {
    $group: {
      _id: "$items.category",
      units_sold: { $sum: "$items.quantity" },
      revenue_eur: {
        $sum: { $multiply: ["$items.quantity", "$items.unit_price_eur"] }
      }
    }
  },
  { $sort: { revenue_eur: -1 } }
]).toArray();
printjson(categoryRevenue);
assertTrue(categoryRevenue.length >= 5, "Expected at least five categories in the revenue aggregation");
assertEq(categoryRevenue[0]._id, "video", "Video should be the highest-revenue category");

const topCustomers = workshopDb.orders.aggregate([
  {
    $group: {
      _id: "$customer_id",
      total_revenue_eur: { $sum: "$totals.grand_total_eur" },
      order_count: { $sum: 1 }
    }
  },
  { $sort: { total_revenue_eur: -1 } },
  {
    $lookup: {
      from: "customers",
      localField: "_id",
      foreignField: "customer_id",
      as: "customer"
    }
  },
  { $unwind: "$customer" },
  {
    $project: {
      _id: 0,
      customer_id: "$_id",
      customer_name: {
        $concat: ["$customer.name.first", " ", "$customer.name.last"]
      },
      total_revenue_eur: 1,
      order_count: 1
    }
  }
]).toArray();
printjson(topCustomers);
assertEq(topCustomers[0].customer_id, "CUST-1001", "Anna should be the top customer by revenue");

const openOrders = workshopDb.orders.aggregate([
  { $match: { status: { $in: ["paid", "packed", "shipped"] } } },
  {
    $lookup: {
      from: "customers",
      localField: "customer_id",
      foreignField: "customer_id",
      as: "customer"
    }
  },
  { $unwind: "$customer" },
  {
    $project: {
      _id: 0,
      order_id: 1,
      status: 1,
      customer_email: "$customer.email",
      grand_total_eur: "$totals.grand_total_eur"
    }
  },
  { $sort: { grand_total_eur: -1 } }
]).toArray();
printjson(openOrders);
assertEq(openOrders.length, 4, "Expected four open orders after shipping update");

section("Text search");
const searchResult = workshopDb.products.find(
  { $text: { $search: "wireless camera" } },
  {
    _id: 0,
    name: 1,
    score: { $meta: "textScore" }
  }
).sort({ score: { $meta: "textScore" } }).toArray();
printjson(searchResult);
assertTrue(searchResult.length >= 1, "Expected text search to return at least one product");
assertEq(searchResult[0].name, "Wireless Conference Camera", "Text search should rank the camera first");

section("Schema validation");
let validationRejected = false;
try {
  workshopDb.orders.insertOne({
    order_id: "BROKEN-ORDER",
    customer_id: "CUST-1001",
    status: "unknown",
    items: [],
    totals: {
      subtotal_eur: 0,
      shipping_eur: 0,
      tax_eur: 0,
      grand_total_eur: 0
    },
    shipping_address: {
      city: "Berlin",
      country: "DE"
    },
    ordered_at: new Date("2026-03-22T10:30:00Z")
  });
} catch (error) {
  validationRejected = true;
  print("Validation rejected invalid order as expected.");
  print(error.message);
}
assertTrue(validationRejected, "Schema validation should reject the invalid order");

section("Indexes");
const productIndexNames = workshopDb.products.getIndexes().map((index) => index.name);
const orderIndexNames = workshopDb.orders.getIndexes().map((index) => index.name);
const cartIndexNames = workshopDb.cart_sessions.getIndexes().map((index) => index.name);
printjson({
  productIndexNames,
  orderIndexNames,
  cartIndexNames
});
assertTrue(
  productIndexNames.includes("name_text_description_text_tags_text"),
  "Expected text index on products"
);
assertTrue(
  orderIndexNames.includes("status_1_ordered_at_-1"),
  "Expected compound order status index"
);
assertTrue(
  cartIndexNames.includes("expires_at_1"),
  "Expected TTL index on cart sessions"
);

section("Success");
print("All MongoDB tutorial checks passed.");
