/*
Run the full tutorial as a single mongosh script:

docker compose up -d --wait
docker compose exec mongodb mongosh -u admin -p admin123 --authenticationDatabase admin --file /workshop/scripts/tutorial_walkthrough.js

This script resets and seeds the workshop database first, then walks through
the same hands-on flow that the README explains step by step.
*/

/*
Sprecherhinweis:
- Dieses Script ist als Moderationshilfe gedacht.
- Ich kann es live komplett ausfuehren oder einzelne Bloecke gezielt zeigen.
- Die Kommentare darunter sind Formulierungen, die ich den Teilnehmenden so
  oder aehnlich sagen kann.
*/

load("/workshop/scripts/seed_demo.js");

const tutorialDb = db.getSiblingDB("mongo_workshop");

function section(title) {
  print("\n=== " + title + " ===");
}

function show(label, value) {
  print("\n" + label);
  printjson(value);
}

/*
Sprecherhinweis:
- Wir starten nicht mit Theorie, sondern schauen uns direkt echte Dokumente an.
- Wichtig ist hier: MongoDB speichert zusammengehoerige Daten oft gemeinsam in
  einem Dokument, zum Beispiel Adresse beim Kunden oder Positionen in einer
  Bestellung.
- Genau daran sieht man den Unterschied zur stark normalisierten SQL-Welt.
*/
section("1. Explore the data model");
show("Collections", tutorialDb.getCollectionNames());
show("One customer", tutorialDb.customers.findOne({}, { _id: 0 }));
show("One product", tutorialDb.products.findOne({}, { _id: 0 }));
show("One order", tutorialDb.orders.findOne({}, { _id: 0 }));
show("One cart session", tutorialDb.cart_sessions.findOne({}, { _id: 0 }));

/*
Sprecherhinweis:
- In diesem Block sehen wir typische Lesezugriffe: Filtern, Projektion und
  Sortierung.
- Ich wuerde betonen, dass MongoDB-Abfragen fuer API- und Anwendungsfaelle oft
  sehr natuerlich lesbar sind.
- Besonders wichtig: Wir holen nicht immer das ganze Dokument, sondern nur die
  Felder, die wir wirklich brauchen.
*/
// section("2. Basic reads");
// show(
//   "Premium customers from Berlin",
//   tutorialDb.customers.find(
//     {
//       "address.city": "Berlin",
//       loyalty_tier: { $in: ["gold", "platinum"] }
//     },
//     {
//       _id: 0,
//       customer_id: 1,
//       email: 1,
//       loyalty_tier: 1
//     }
//   ).sort({ customer_id: 1 }).toArray()
// );

// show(
//   "Active audio products",
//   tutorialDb.products.find(
//     { category: "audio", active: true },
//     { _id: 0, sku: 1, name: 1, price_eur: 1 }
//   ).sort({ price_eur: -1 }).toArray()
// );

// show(
//   "Products tagged for streaming",
//   tutorialDb.products.find(
//     { tags: "streaming" },
//     { _id: 0, sku: 1, name: 1, tags: 1 }
//   ).sort({ sku: 1 }).toArray()
// );

/*
Sprecherhinweis:
- Jetzt gehen wir auf typische Schreibzugriffe: Update, Array-Operationen und
  Upsert.
- Das ist didaktisch wichtig, weil man daran sehr gut sieht, dass MongoDB
  nicht nur "JSON speichern" ist, sondern gezielte partielle Updates kann.
- Besonders den Upsert betonen: falls das Dokument fehlt, wird es in einem
  Schritt angelegt.
*/
// section("3. Updates and upserts");
// tutorialDb.products.updateOne(
//   { sku: "SKU-CAM-01" },
//   {
//     $inc: { "inventory.in_stock": -1 },
//     $set: { last_demo_purchase_at: new Date("2026-03-22T10:00:00Z") },
//     $addToSet: { tags: "featured" }
//   }
// );

// show(
//   "Updated camera inventory",
//   tutorialDb.products.findOne(
//     { sku: "SKU-CAM-01" },
//     { _id: 0, sku: 1, tags: 1, "inventory.in_stock": 1, last_demo_purchase_at: 1 }
//   )
// );

// tutorialDb.orders.updateOne(
//   { order_id: "ORD-2026-0004" },
//   {
//     $set: { status: "shipped" },
//     $push: {
//       status_history: {
//         status: "shipped",
//         at: new Date("2026-03-22T10:05:00Z"),
//         note: "Packed and handed to carrier"
//       }
//     }
//   }
// );

// show(
//   "Updated order state",
//   tutorialDb.orders.findOne(
//     { order_id: "ORD-2026-0004" },
//     { _id: 0, order_id: 1, status: 1, status_history: 1 }
//   )
// );

// tutorialDb.cart_sessions.updateOne(
//   { session_id: "cart-live-demo" },
//   {
//     $set: {
//       customer_id: "CUST-1002",
//       items: [
//         { sku: "SKU-LIGHT-01", quantity: 2 }
//       ],
//       last_seen_at: new Date("2026-03-22T10:10:00Z"),
//       expires_at: new Date("2030-03-22T11:10:00Z")
//     }
//   },
//   { upsert: true }
// );

// show(
//   "Upserted cart session",
//   tutorialDb.cart_sessions.findOne(
//     { session_id: "cart-live-demo" },
//     { _id: 0 }
//   )
// );

/*
Sprecherhinweis:
- Hier sieht man den Punkt, an dem MongoDB in Workshops oft besonders gut
  ankommt: Aggregationen fuer Reporting und Analyse.
- Ich wuerde sagen: Die Pipeline denkt in Stufen, jede Stufe transformiert das
  Ergebnis der vorherigen.
- $unwind macht Arrays flach, $group verdichtet Daten, $lookup verbindet
  Collections, also aehnlich zu einem Join.
*/
// section("4. Aggregation pipeline");
// show(
//   "Revenue by product category",
//   tutorialDb.orders.aggregate([
//     { $unwind: "$items" },
//     {
//       $group: {
//         _id: "$items.category",
//         units_sold: { $sum: "$items.quantity" },
//         revenue_eur: {
//           $sum: { $multiply: ["$items.quantity", "$items.unit_price_eur"] }
//         }
//       }
//     },
//     { $sort: { revenue_eur: -1 } }
//   ]).toArray()
// );

// show(
//   "Top customers by revenue",
//   tutorialDb.orders.aggregate([
//     {
//       $group: {
//         _id: "$customer_id",
//         total_revenue_eur: { $sum: "$totals.grand_total_eur" },
//         order_count: { $sum: 1 }
//       }
//     },
//     { $sort: { total_revenue_eur: -1 } },
//     {
//       $lookup: {
//         from: "customers",
//         localField: "_id",
//         foreignField: "customer_id",
//         as: "customer"
//       }
//     },
//     { $unwind: "$customer" },
//     {
//       $project: {
//         _id: 0,
//         customer_id: "$_id",
//         customer_name: {
//           $concat: ["$customer.name.first", " ", "$customer.name.last"]
//         },
//         total_revenue_eur: 1,
//         order_count: 1
//       }
//     }
//   ]).toArray()
// );

// show(
//   "Open orders enriched with customer data",
//   tutorialDb.orders.aggregate([
//     { $match: { status: { $in: ["paid", "packed", "shipped"] } } },
//     {
//       $lookup: {
//         from: "customers",
//         localField: "customer_id",
//         foreignField: "customer_id",
//         as: "customer"
//       }
//     },
//     { $unwind: "$customer" },
//     {
//       $project: {
//         _id: 0,
//         order_id: 1,
//         status: 1,
//         customer_email: "$customer.email",
//         city: "$shipping_address.city",
//         grand_total_eur: "$totals.grand_total_eur"
//       }
//     },
//     { $sort: { grand_total_eur: -1 } }
//   ]).toArray()
// );

/*
Sprecherhinweis:
- Das hier ist die einfache Volltextsuche direkt in MongoDB.
- Ich wuerde dazu sagen: Fuer viele operative Anwendungsfaelle reicht das
  voellig aus, ohne dass man sofort Elasticsearch oder OpenSearch braucht.
- Gleichzeitig kann man erwaehnen, dass spezialisierte Suchsysteme trotzdem
  sinnvoll sein koennen, wenn Relevanzlogik komplex wird.
*/
// section("5. Text search");
// show(
//   "Text search for 'wireless camera'",
//   tutorialDb.products.find(
//     { $text: { $search: "wireless camera" } },
//     {
//       _id: 0,
//       name: 1,
//       score: { $meta: "textScore" }
//     }
//   ).sort({ score: { $meta: "textScore" } }).toArray()
// );

/*
Sprecherhinweis:
- Ein haeufiges Missverstaendnis ist: MongoDB haette gar kein Schema.
- Praeziser ist: Das Schema ist flexibler, aber wir koennen trotzdem Regeln
  erzwingen.
- Genau das zeigen wir hier mit JSON Schema Validation.
*/
// section("6. Schema validation");
// try {
//   tutorialDb.orders.insertOne({
//     order_id: "BROKEN-ORDER",
//     customer_id: "CUST-1001",
//     status: "unknown",
//     items: [],
//     totals: {
//       subtotal_eur: 0,
//       shipping_eur: 0,
//       tax_eur: 0,
//       grand_total_eur: 0
//     },
//     shipping_address: {
//       city: "Berlin",
//       country: "DE"
//     },
//     ordered_at: new Date("2026-03-22T10:30:00Z")
//   });
//   print("Unexpected: invalid order was inserted.");
// } catch (error) {
//   print("Validation rejected invalid order as expected.");
//   print(error.message);
// }

/*
Sprecherhinweis:
- Spaetestens hier sollte man den Bogen zu Performance schlagen.
- Ohne passende Indizes werden viele Abfragen teuer, auch in MongoDB.
- Zeigen wuerde ich: eindeutige Indizes, kombinierte Indizes, Textindex und
  TTL-Index fuer automatisch ablaufende Session-Daten.
*/
// section("7. Indexes");
// show("Customer indexes", tutorialDb.customers.getIndexes());
// show("Product indexes", tutorialDb.products.getIndexes());
// show("Order indexes", tutorialDb.orders.getIndexes());
// show("Cart session indexes", tutorialDb.cart_sessions.getIndexes());

/*
Sprecherhinweis:
- Zum Abschluss wuerde ich nochmal zusammenfassen: Dokumentenmodell, CRUD,
  Aggregation, Validierung und Indizes sind die Kernbausteine.
- Danach kann man offen diskutieren, fuer welche Use Cases MongoDB stark ist
  und wo relationale Systeme weiter die bessere Wahl sind.
*/
// section("Done");
// print("Tutorial walkthrough finished.");
// print("You can now continue exploring with:");
// print("use mongo_workshop");
