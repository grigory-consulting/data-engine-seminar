

load("/workshop/scripts/seed_demo.js");

const tutorialDb = db.getSiblingDB("mongo_workshop");

function section(title) {
  print("\n=== " + title + " ===");
}

function show(label, value) {
  print("\n" + label);
  printjson(value);
}


section("1. Explore the data model");
show("Collections", tutorialDb.getCollectionNames());
