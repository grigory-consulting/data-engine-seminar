const workshopDb = db.getSiblingDB("mongo_workshop");

print("Resetting mongo_workshop...");
workshopDb.dropDatabase();

workshopDb.createCollection("customers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "customer_id",
        "email",
        "name",
        "address",
        "loyalty_tier",
        "created_at"
      ],
      properties: {
        customer_id: { bsonType: "string" },
        email: { bsonType: "string" },
        loyalty_tier: {
          enum: ["bronze", "silver", "gold", "platinum"]
        },
        name: {
          bsonType: "object",
          required: ["first", "last"],
          properties: {
            first: { bsonType: "string" },
            last: { bsonType: "string" }
          }
        },
        address: {
          bsonType: "object",
          required: ["city", "country"],
          properties: {
            city: { bsonType: "string" },
            country: { bsonType: "string" }
          }
        },
        created_at: { bsonType: "date" }
      }
    }
  }
});

workshopDb.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "sku",
        "name",
        "category",
        "price_eur",
        "inventory",
        "active",
        "created_at"
      ],
      properties: {
        sku: { bsonType: "string" },
        name: { bsonType: "string" },
        category: { bsonType: "string" },
        price_eur: { bsonType: "int", minimum: 1 },
        inventory: {
          bsonType: "object",
          required: ["in_stock", "reorder_level", "warehouse"],
          properties: {
            in_stock: { bsonType: "int", minimum: 0 },
            reorder_level: { bsonType: "int", minimum: 0 },
            warehouse: { bsonType: "string" }
          }
        },
        active: { bsonType: "bool" },
        created_at: { bsonType: "date" }
      }
    }
  }
});

workshopDb.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "order_id",
        "customer_id",
        "status",
        "items",
        "totals",
        "shipping_address",
        "ordered_at"
      ],
      properties: {
        order_id: { bsonType: "string" },
        customer_id: { bsonType: "string" },
        status: {
          enum: ["created", "paid", "packed", "shipped", "delivered", "cancelled"]
        },
        items: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["sku", "name", "category", "quantity", "unit_price_eur"],
            properties: {
              sku: { bsonType: "string" },
              name: { bsonType: "string" },
              category: { bsonType: "string" },
              quantity: { bsonType: "int", minimum: 1 },
              unit_price_eur: { bsonType: "int", minimum: 1 }
            }
          }
        },
        totals: {
          bsonType: "object",
          required: ["subtotal_eur", "shipping_eur", "tax_eur", "grand_total_eur"],
          properties: {
            subtotal_eur: { bsonType: "int", minimum: 0 },
            shipping_eur: { bsonType: "int", minimum: 0 },
            tax_eur: { bsonType: "int", minimum: 0 },
            grand_total_eur: { bsonType: "int", minimum: 0 }
          }
        },
        shipping_address: {
          bsonType: "object",
          required: ["city", "country"],
          properties: {
            city: { bsonType: "string" },
            country: { bsonType: "string" }
          }
        },
        ordered_at: { bsonType: "date" }
      }
    }
  }
});

workshopDb.createCollection("cart_sessions");

const customers = [
  {
    customer_id: "CUST-1001",
    email: "anna.schmidt@example.com",
    loyalty_tier: "gold",
    name: { first: "Anna", last: "Schmidt" },
    address: {
      street: "Warschauer Str. 8",
      city: "Berlin",
      postal_code: "10243",
      country: "DE"
    },
    interests: ["streaming", "audio", "postgres"],
    preferred_channels: ["email", "sms"],
    created_at: new Date("2026-01-12T09:10:00Z")
  },
  {
    customer_id: "CUST-1002",
    email: "lukas.mueller@example.com",
    loyalty_tier: "silver",
    name: { first: "Lukas", last: "Mueller" },
    address: {
      street: "Schanzenstr. 14",
      city: "Hamburg",
      postal_code: "20357",
      country: "DE"
    },
    interests: ["lighting", "video"],
    preferred_channels: ["email"],
    created_at: new Date("2026-01-20T11:00:00Z")
  },
  {
    customer_id: "CUST-1003",
    email: "sofia.weber@example.com",
    loyalty_tier: "platinum",
    name: { first: "Sofia", last: "Weber" },
    address: {
      street: "Leopoldstr. 22",
      city: "Munich",
      postal_code: "80802",
      country: "DE"
    },
    interests: ["analytics", "audio", "books"],
    preferred_channels: ["email", "push"],
    created_at: new Date("2026-02-02T14:30:00Z")
  },
  {
    customer_id: "CUST-1004",
    email: "mila.fischer@example.com",
    loyalty_tier: "bronze",
    name: { first: "Mila", last: "Fischer" },
    address: {
      street: "Aachener Str. 90",
      city: "Cologne",
      postal_code: "50674",
      country: "DE"
    },
    interests: ["books", "keyboards"],
    preferred_channels: ["email"],
    created_at: new Date("2026-02-11T08:45:00Z")
  },
  {
    customer_id: "CUST-1005",
    email: "jonas.keller@example.com",
    loyalty_tier: "gold",
    name: { first: "Jonas", last: "Keller" },
    address: {
      street: "Torstr. 50",
      city: "Berlin",
      postal_code: "10119",
      country: "DE"
    },
    interests: ["streaming", "video", "ml"],
    preferred_channels: ["email", "slack"],
    created_at: new Date("2026-02-18T17:15:00Z")
  }
];

const products = [
  {
    sku: "SKU-CAM-01",
    name: "Wireless Conference Camera",
    category: "video",
    brand: "StreamForge",
    price_eur: 249,
    tags: ["streaming", "camera", "wireless"],
    description: "Compact 4K conference camera for hybrid workshops and live demos.",
    inventory: { in_stock: 8, reorder_level: 3, warehouse: "berlin-1" },
    active: true,
    created_at: new Date("2026-01-05T10:00:00Z")
  },
  {
    sku: "SKU-MIC-01",
    name: "Podcast Starter Microphone",
    category: "audio",
    brand: "WaveCast",
    price_eur: 129,
    tags: ["audio", "streaming", "microphone"],
    description: "USB microphone with warm voice profile for teaching and recording.",
    inventory: { in_stock: 14, reorder_level: 5, warehouse: "berlin-1" },
    active: true,
    created_at: new Date("2026-01-05T10:10:00Z")
  },
  {
    sku: "SKU-LIGHT-01",
    name: "Softbox Desk Light",
    category: "lighting",
    brand: "StudioBloom",
    price_eur: 89,
    tags: ["lighting", "studio", "video"],
    description: "Adjustable desk light for tutorial videos and calls.",
    inventory: { in_stock: 20, reorder_level: 6, warehouse: "berlin-2" },
    active: true,
    created_at: new Date("2026-01-06T08:00:00Z")
  },
  {
    sku: "SKU-BOOK-01",
    name: "Practical Data Pipelines",
    category: "books",
    brand: "Seminar Press",
    price_eur: 39,
    tags: ["books", "data-engineering", "etl"],
    description: "Hands-on guide to ETL design, orchestration, and observability.",
    inventory: { in_stock: 50, reorder_level: 10, warehouse: "berlin-3" },
    active: true,
    created_at: new Date("2026-01-08T09:00:00Z")
  },
  {
    sku: "SKU-HOODIE-01",
    name: "Data Engineer Hoodie",
    category: "apparel",
    brand: "Seminar Merch",
    price_eur: 59,
    tags: ["apparel", "hoodie", "merch"],
    description: "Comfort hoodie for late-night pipeline debugging.",
    inventory: { in_stock: 25, reorder_level: 8, warehouse: "berlin-3" },
    active: true,
    created_at: new Date("2026-01-10T07:45:00Z")
  },
  {
    sku: "SKU-KEY-01",
    name: "Mechanical Coding Keyboard",
    category: "hardware",
    brand: "KeyNorth",
    price_eur: 149,
    tags: ["keyboard", "hardware", "office"],
    description: "Tactile keyboard built for coding workshops and data labs.",
    inventory: { in_stock: 10, reorder_level: 4, warehouse: "berlin-2" },
    active: true,
    created_at: new Date("2026-01-12T12:00:00Z")
  },
  {
    sku: "SKU-DUCK-01",
    name: "Rubber Debug Duck",
    category: "accessories",
    brand: "QuackOps",
    price_eur: 12,
    tags: ["accessories", "debugging", "desk"],
    description: "Classic rubber duck for explaining bugs out loud.",
    inventory: { in_stock: 100, reorder_level: 20, warehouse: "berlin-3" },
    active: true,
    created_at: new Date("2026-01-15T08:30:00Z")
  },
  {
    sku: "SKU-STICKER-01",
    name: "Lakehouse Sticker Pack",
    category: "accessories",
    brand: "Seminar Merch",
    price_eur: 9,
    tags: ["stickers", "merch", "desk"],
    description: "Notebook stickers for Spark, Airflow, dbt, and Kafka fans.",
    inventory: { in_stock: 120, reorder_level: 25, warehouse: "berlin-3" },
    active: true,
    created_at: new Date("2026-01-15T08:35:00Z")
  }
];

const orders = [
  {
    order_id: "ORD-2026-0001",
    customer_id: "CUST-1001",
    ordered_at: new Date("2026-03-01T09:00:00Z"),
    status: "delivered",
    shipping_address: { city: "Berlin", country: "DE" },
    items: [
      {
        sku: "SKU-CAM-01",
        name: "Wireless Conference Camera",
        category: "video",
        quantity: 1,
        unit_price_eur: 249
      },
      {
        sku: "SKU-LIGHT-01",
        name: "Softbox Desk Light",
        category: "lighting",
        quantity: 2,
        unit_price_eur: 89
      }
    ],
    totals: {
      subtotal_eur: 427,
      shipping_eur: 8,
      tax_eur: 81,
      grand_total_eur: 516
    },
    payment: {
      method: "card",
      paid_at: new Date("2026-03-01T09:02:00Z")
    },
    status_history: [
      { status: "created", at: new Date("2026-03-01T09:00:00Z"), note: "Checkout complete" },
      { status: "paid", at: new Date("2026-03-01T09:02:00Z"), note: "Card authorized" },
      { status: "packed", at: new Date("2026-03-01T12:00:00Z"), note: "Packed in warehouse" },
      { status: "shipped", at: new Date("2026-03-02T07:30:00Z"), note: "Carrier pickup" },
      { status: "delivered", at: new Date("2026-03-03T13:00:00Z"), note: "Delivered to customer" }
    ]
  },
  {
    order_id: "ORD-2026-0002",
    customer_id: "CUST-1002",
    ordered_at: new Date("2026-03-02T10:20:00Z"),
    status: "paid",
    shipping_address: { city: "Hamburg", country: "DE" },
    items: [
      {
        sku: "SKU-MIC-01",
        name: "Podcast Starter Microphone",
        category: "audio",
        quantity: 1,
        unit_price_eur: 129
      },
      {
        sku: "SKU-DUCK-01",
        name: "Rubber Debug Duck",
        category: "accessories",
        quantity: 2,
        unit_price_eur: 12
      }
    ],
    totals: {
      subtotal_eur: 153,
      shipping_eur: 6,
      tax_eur: 30,
      grand_total_eur: 189
    },
    payment: {
      method: "paypal",
      paid_at: new Date("2026-03-02T10:22:00Z")
    },
    status_history: [
      { status: "created", at: new Date("2026-03-02T10:20:00Z"), note: "Checkout complete" },
      { status: "paid", at: new Date("2026-03-02T10:22:00Z"), note: "PayPal approved" }
    ]
  },
  {
    order_id: "ORD-2026-0003",
    customer_id: "CUST-1003",
    ordered_at: new Date("2026-03-03T15:45:00Z"),
    status: "packed",
    shipping_address: { city: "Munich", country: "DE" },
    items: [
      {
        sku: "SKU-BOOK-01",
        name: "Practical Data Pipelines",
        category: "books",
        quantity: 2,
        unit_price_eur: 39
      },
      {
        sku: "SKU-KEY-01",
        name: "Mechanical Coding Keyboard",
        category: "hardware",
        quantity: 1,
        unit_price_eur: 149
      }
    ],
    totals: {
      subtotal_eur: 227,
      shipping_eur: 7,
      tax_eur: 44,
      grand_total_eur: 278
    },
    payment: {
      method: "invoice",
      paid_at: new Date("2026-03-03T16:00:00Z")
    },
    status_history: [
      { status: "created", at: new Date("2026-03-03T15:45:00Z"), note: "Checkout complete" },
      { status: "paid", at: new Date("2026-03-03T16:00:00Z"), note: "Invoice generated" },
      { status: "packed", at: new Date("2026-03-04T08:15:00Z"), note: "Packed in warehouse" }
    ]
  },
  {
    order_id: "ORD-2026-0004",
    customer_id: "CUST-1005",
    ordered_at: new Date("2026-03-04T08:10:00Z"),
    status: "packed",
    shipping_address: { city: "Berlin", country: "DE" },
    items: [
      {
        sku: "SKU-CAM-01",
        name: "Wireless Conference Camera",
        category: "video",
        quantity: 1,
        unit_price_eur: 249
      },
      {
        sku: "SKU-MIC-01",
        name: "Podcast Starter Microphone",
        category: "audio",
        quantity: 1,
        unit_price_eur: 129
      },
      {
        sku: "SKU-HOODIE-01",
        name: "Data Engineer Hoodie",
        category: "apparel",
        quantity: 1,
        unit_price_eur: 59
      }
    ],
    totals: {
      subtotal_eur: 437,
      shipping_eur: 8,
      tax_eur: 84,
      grand_total_eur: 529
    },
    payment: {
      method: "card",
      paid_at: new Date("2026-03-04T08:11:00Z")
    },
    status_history: [
      { status: "created", at: new Date("2026-03-04T08:10:00Z"), note: "Checkout complete" },
      { status: "paid", at: new Date("2026-03-04T08:11:00Z"), note: "Card authorized" },
      { status: "packed", at: new Date("2026-03-04T12:40:00Z"), note: "Packed in warehouse" }
    ]
  },
  {
    order_id: "ORD-2026-0005",
    customer_id: "CUST-1004",
    ordered_at: new Date("2026-03-05T17:30:00Z"),
    status: "cancelled",
    shipping_address: { city: "Cologne", country: "DE" },
    items: [
      {
        sku: "SKU-BOOK-01",
        name: "Practical Data Pipelines",
        category: "books",
        quantity: 1,
        unit_price_eur: 39
      },
      {
        sku: "SKU-STICKER-01",
        name: "Lakehouse Sticker Pack",
        category: "accessories",
        quantity: 3,
        unit_price_eur: 9
      }
    ],
    totals: {
      subtotal_eur: 66,
      shipping_eur: 5,
      tax_eur: 13,
      grand_total_eur: 84
    },
    payment: {
      method: "card",
      paid_at: new Date("2026-03-05T17:31:00Z")
    },
    status_history: [
      { status: "created", at: new Date("2026-03-05T17:30:00Z"), note: "Checkout complete" },
      { status: "paid", at: new Date("2026-03-05T17:31:00Z"), note: "Card authorized" },
      { status: "cancelled", at: new Date("2026-03-05T18:00:00Z"), note: "Customer cancellation" }
    ]
  },
  {
    order_id: "ORD-2026-0006",
    customer_id: "CUST-1001",
    ordered_at: new Date("2026-03-06T13:10:00Z"),
    status: "paid",
    shipping_address: { city: "Berlin", country: "DE" },
    items: [
      {
        sku: "SKU-KEY-01",
        name: "Mechanical Coding Keyboard",
        category: "hardware",
        quantity: 1,
        unit_price_eur: 149
      },
      {
        sku: "SKU-DUCK-01",
        name: "Rubber Debug Duck",
        category: "accessories",
        quantity: 2,
        unit_price_eur: 12
      },
      {
        sku: "SKU-STICKER-01",
        name: "Lakehouse Sticker Pack",
        category: "accessories",
        quantity: 1,
        unit_price_eur: 9
      }
    ],
    totals: {
      subtotal_eur: 182,
      shipping_eur: 6,
      tax_eur: 36,
      grand_total_eur: 224
    },
    payment: {
      method: "bank_transfer",
      paid_at: new Date("2026-03-06T13:30:00Z")
    },
    status_history: [
      { status: "created", at: new Date("2026-03-06T13:10:00Z"), note: "Checkout complete" },
      { status: "paid", at: new Date("2026-03-06T13:30:00Z"), note: "Transfer confirmed" }
    ]
  }
];

const cartSessions = [
  {
    session_id: "cart-001",
    customer_id: "CUST-1002",
    items: [
      { sku: "SKU-LIGHT-01", quantity: 1 },
      { sku: "SKU-DUCK-01", quantity: 1 }
    ],
    last_seen_at: new Date("2026-03-20T09:00:00Z"),
    expires_at: new Date("2030-03-20T10:00:00Z")
  },
  {
    session_id: "cart-002",
    customer_id: "CUST-1005",
    items: [
      { sku: "SKU-CAM-01", quantity: 1 }
    ],
    last_seen_at: new Date("2026-03-20T09:15:00Z"),
    expires_at: new Date("2030-03-20T10:15:00Z")
  }
];

workshopDb.customers.insertMany(customers);
workshopDb.products.insertMany(products);
workshopDb.orders.insertMany(orders);
workshopDb.cart_sessions.insertMany(cartSessions);

workshopDb.customers.createIndex({ customer_id: 1 }, { unique: true });
workshopDb.customers.createIndex({ email: 1 }, { unique: true });
workshopDb.customers.createIndex({ "address.city": 1, loyalty_tier: 1 });

workshopDb.products.createIndex({ sku: 1 }, { unique: true });
workshopDb.products.createIndex({ category: 1, price_eur: -1 });
workshopDb.products.createIndex({
  name: "text",
  description: "text",
  tags: "text"
});

workshopDb.orders.createIndex({ order_id: 1 }, { unique: true });
workshopDb.orders.createIndex({ customer_id: 1, ordered_at: -1 });
workshopDb.orders.createIndex({ status: 1, ordered_at: -1 });
workshopDb.orders.createIndex({ "items.sku": 1 });

workshopDb.cart_sessions.createIndex({ session_id: 1 }, { unique: true });
workshopDb.cart_sessions.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

print("Seed complete.");
print("Collections: " + workshopDb.getCollectionNames().join(", "));
print("customers=" + workshopDb.customers.countDocuments());
print("products=" + workshopDb.products.countDocuments());
print("orders=" + workshopDb.orders.countDocuments());
print("cart_sessions=" + workshopDb.cart_sessions.countDocuments());
