import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// ==========================================================
// ENUMS
// ==========================================================

export const roleEnum = pgEnum("role", ["ADMIN", "ORGANIZER", "AUDIENCE"]);

export const eventStatusEnum = pgEnum("event_status", [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "COMPLETED",
]);

export const showStatusEnum = pgEnum("show_status", [
  "SCHEDULED",
  "SOLD_OUT",
  "CANCELLED",
  "COMPLETED",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "REFUNDED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

// ==========================================================
// USERS
// ==========================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    clerkId: text("clerk_id").notNull().unique(),

    email: text("email").notNull().unique(),

    firstName: text("first_name"),

    lastName: text("last_name"),

    imageUrl: text("image_url"),

    role: roleEnum("role"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("users_clerk_idx").on(table.clerkId),
    index("users_role_idx").on(table.role),
  ],
);

// ==========================================================
// CATEGORIES
// Movies
// Concerts
// Sports
// Events
// ==========================================================

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: text("name").notNull(),

    slug: text("slug").notNull().unique(),

    imageUrl: text("image_url"),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("categories_slug_idx").on(table.slug)],
);

// ==========================================================
// VENUES
// ==========================================================

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizerId: uuid("organizer_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),

    name: text("name").notNull(),

    slug: text("slug").notNull().unique(),

    description: text("description"),

    imageUrl: text("image_url"),

    address: text("address").notNull(),

    city: text("city").notNull(),

    state: text("state").notNull(),

    country: text("country").default("India").notNull(),

    postalCode: text("postal_code"),

    latitude: text("latitude"),

    longitude: text("longitude"),

    capacity: integer("capacity"),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("venues_organizer_idx").on(table.organizerId),
    index("venues_city_idx").on(table.city),
  ],
);

// ==========================================================
// EVENTS
// ==========================================================

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizerId: uuid("organizer_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),

    categoryId: uuid("category_id")
      .references(() => categories.id, {
        onDelete: "restrict",
      })
      .notNull(),

    venueId: uuid("venue_id")
      .references(() => venues.id, {
        onDelete: "cascade",
      })
      .notNull(),

    title: text("title").notNull(),

    slug: text("slug").notNull().unique(),

    description: text("description"),

    bannerUrl: text("banner_url"),

    language: text("language"),

    duration: integer("duration"),

    ageRestriction: text("age_restriction"),

    status: eventStatusEnum("status").default("DRAFT").notNull(),

    isFeatured: boolean("is_featured").default(false).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("events_organizer_idx").on(table.organizerId),

    index("events_category_idx").on(table.categoryId),

    index("events_venue_idx").on(table.venueId),

    index("events_status_idx").on(table.status),
  ],
);

// ==========================================================
// EVENT IMAGES
// ==========================================================

export const eventImages = pgTable(
  "event_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    eventId: uuid("event_id")
      .references(() => events.id, {
        onDelete: "cascade",
      })
      .notNull(),

    imageUrl: text("image_url").notNull(),

    altText: text("alt_text"),

    sortOrder: integer("sort_order").default(0).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("event_images_event_idx").on(table.eventId)],
);

// ==========================================================
// SHOWS
// ==========================================================

export const shows = pgTable(
  "shows",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    eventId: uuid("event_id")
      .references(() => events.id, {
        onDelete: "cascade",
      })
      .notNull(),

    showDate: timestamp("show_date", {
      withTimezone: true,
    }).notNull(),

    startTime: timestamp("start_time", {
      withTimezone: true,
    }).notNull(),

    endTime: timestamp("end_time", {
      withTimezone: true,
    }),

    totalSeats: integer("total_seats").notNull(),

    availableSeats: integer("available_seats").notNull(),

    status: showStatusEnum("status").default("SCHEDULED").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("shows_event_idx").on(table.eventId),
    index("shows_date_idx").on(table.showDate),
  ],
);

// ==========================================================
// TICKET TYPES
// ==========================================================

export const ticketTypes = pgTable(
  "ticket_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    showId: uuid("show_id")
      .references(() => shows.id, {
        onDelete: "cascade",
      })
      .notNull(),

    name: text("name").notNull(),

    description: text("description"),

    price: integer("price").notNull(),

    quantity: integer("quantity").notNull(),

    remainingQuantity: integer("remaining_quantity").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("ticket_types_show_idx").on(table.showId)],
);

// ==========================================================
// BOOKINGS
// ==========================================================

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bookingNumber: text("booking_number").notNull().unique(),

    audienceId: uuid("audience_id")
      .references(() => users.id, {
        onDelete: "restrict",
      })
      .notNull(),

    showId: uuid("show_id")
      .references(() => shows.id, {
        onDelete: "restrict",
      })
      .notNull(),

    bookingStatus: bookingStatusEnum("booking_status")
      .default("PENDING")
      .notNull(),

    paymentStatus: paymentStatusEnum("payment_status")
      .default("PENDING")
      .notNull(),

    subtotal: integer("subtotal").notNull(),

    discountAmount: integer("discount_amount").default(0).notNull(),

    taxAmount: integer("tax_amount").default(0).notNull(),

    totalAmount: integer("total_amount").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bookings_user_idx").on(table.audienceId),
    index("bookings_show_idx").on(table.showId),
    index("bookings_status_idx").on(table.bookingStatus),
  ],
);

// ==========================================================
// BOOKING TICKETS
// ==========================================================

export const bookingTickets = pgTable("booking_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),

  bookingId: uuid("booking_id")
    .references(() => bookings.id, {
      onDelete: "cascade",
    })
    .notNull(),

  ticketTypeId: uuid("ticket_type_id")
    .references(() => ticketTypes.id, {
      onDelete: "restrict",
    })
    .notNull(),

  // Snapshot
  ticketTypeName: text("ticket_type_name").notNull(),

  unitPrice: integer("unit_price").notNull(),

  ticketNumber: text("ticket_number").notNull().unique(),

  qrCode: text("qr_code"),

  seatNumber: text("seat_number"),

  attendeeName: text("attendee_name"),

  checkedIn: boolean("checked_in").default(false).notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

// ==========================================================
// PAYMENTS
// ==========================================================

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bookingId: uuid("booking_id")
      .references(() => bookings.id, {
        onDelete: "cascade",
      })
      .notNull(),

    provider: text("provider").notNull(),

    providerPaymentId: text("provider_payment_id"),

    providerOrderId: text("provider_order_id"),

    amount: integer("amount").notNull(),

    status: paymentStatusEnum("status").default("PENDING").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("payments_booking_idx").on(table.bookingId)],
);

// ==========================================================
// FAVORITES
// ==========================================================

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    audienceId: uuid("audience_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),

    eventId: uuid("event_id")
      .references(() => events.id, {
        onDelete: "cascade",
      })
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("favorites_user_idx").on(table.audienceId),
    index("favorites_event_idx").on(table.eventId),
  ],
);

// ==========================================================
// REVIEWS
// ==========================================================

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    audienceId: uuid("audience_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),

    eventId: uuid("event_id")
      .references(() => events.id, {
        onDelete: "cascade",
      })
      .notNull(),

    rating: integer("rating").notNull(),

    title: text("title"),

    content: text("content"),

    verifiedAttendance: boolean("verified_attendance").default(false).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("reviews_event_idx").on(table.eventId),
    index("reviews_user_idx").on(table.audienceId),
  ],
);
