import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
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
// SEAT LAYOUT ENUMS
// ==========================================================

// How the venue models its audience area.
// GENERAL_ADMISSION : quantity buckets only (festivals, standing)
// SECTION_BASED     : discrete sections, seats optional
// SEAT_SELECTION    : full row/seat geometry if the venue zone
export const seatLayoutTypeEnum = pgEnum("seat_layout_type", [
  "GENERAL_ADMISSION",
  "SECTION_BASED",
  "SEAT_SELECTION",
]);

// Lifecycle of a seat for a specific show.
export const seatStatusEnum = pgEnum("seat_status", [
  "AVAILABLE",
  "HELD",
  "BOOKED",
  "BLOCKED",
]);

// Pricing / tier classification of a seat (drives the ticket type mapping).
export const seatCategoryEnum = pgEnum("seat_category", [
  "REGULAR",
  "PREMIUM",
  "RECLINER",
  "VIP",
  "GOLD",
  "SILVER",
  "WHEELCHAIR",
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

    // URL of the venue seating layout diagram uploaded by the organizer.
    layoutImageUrl: text("layout_image_url"),

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
// SEAT TEMPLATES   (reusable layout blueprints)
// ==========================================================
// A template is a named, reusable recipe for a venue layout
// (e.g. "Movie Hall", "Cricket Stadium"). It defines the
// geometry (sections -> rows -> seats) that a venue CLONES
// into its own per-venue seat layout.
// ==========================================================

export const seatTemplates = pgTable(
  "seat_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: text("name").notNull(),

    description: text("description"),

    type: seatLayoutTypeEnum("type").notNull(),

    // System templates are shipped by us and reusable by any venue.
    isSystem: boolean("is_system").default(false).notNull(),

    // Only relevant for organizer-created templates; null for system ones.
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "cascade",
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("seat_templates_system_idx").on(table.isSystem),
    index("seat_templates_type_idx").on(table.type),
  ],
);

// A named area/block inside a template.
// - SECTION_BASED  : "North Stand", "VIP Box" ...
// - SEAT_SELECTION : "Premium Balcony", "Orchestra" ...
// - GENERAL_ADMISSION : e.g. "VIP", "General" (no seats, only capacity)
export const seatSections = pgTable(
  "seat_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    seatTemplateId: uuid("seat_template_id")
      .references(() => seatTemplates.id, {
        onDelete: "cascade",
      })
      .notNull(),

    name: text("name").notNull(),

    description: text("description"),

    sortOrder: integer("sort_order").default(0).notNull(),

    // true => the section has numbered rows/seats.
    // false => a pure capacity bucket (GA standing / section without seats).
    hasSeats: boolean("has_seats").default(true).notNull(),

    // Aggregated seat capacity for sections / GA buckets.
    capacity: integer("capacity"),
  },
  (table) => [
    index("seat_sections_template_idx").on(table.seatTemplateId),
    index("seat_sections_capacity_idx").on(table.capacity),
  ],
);

// A row of seats inside a section (SEAT_SELECTION only).
export const seatRows = pgTable(
  "seat_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    seatTemplateId: uuid("seat_template_id")
      .references(() => seatTemplates.id, {
        onDelete: "cascade",
      })
      .notNull(),

    sectionId: uuid("section_id")
      .references(() => seatSections.id, {
        onDelete: "cascade",
      })
      .notNull(),

    label: text("label").notNull(), // "A", "B", "C" ...

    seatCount: integer("seat_count").notNull(), // seats in this row

    sortOrder: integer("sort_order").default(0).notNull(),

    // Default tier for all seats in this row (override per seat below).
    category: seatCategoryEnum("category").default("REGULAR").notNull(),
  },
  (table) => [
    index("seat_rows_template_idx").on(table.seatTemplateId),
    index("seat_rows_section_idx").on(table.sectionId),
  ],
);

// An individual seat number within a row (SEAT_SELECTION only).
export const seats = pgTable(
  "seats",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    seatTemplateId: uuid("seat_template_id")
      .references(() => seatTemplates.id, {
        onDelete: "cascade",
      })
      .notNull(),

    rowId: uuid("row_id")
      .references(() => seatRows.id, {
        onDelete: "cascade",
      })
      .notNull(),

    seatNumber: integer("seat_number").notNull(), // 1..N within the row

    category: seatCategoryEnum("category").default("REGULAR").notNull(),

    isWheelchair: boolean("is_wheelchair").default(false).notNull(),

    // Permanently non-sellable (broken / missing seat).
    isBlocked: boolean("is_blocked").default(false).notNull(),

    // Visual gap between sold blocks -> gives rows an aisle.
    isAisle: boolean("is_aisle").default(false).notNull(),

    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    index("seats_template_idx").on(table.seatTemplateId),
    index("seats_row_idx").on(table.rowId),
    uniqueIndex("seats_row_seat_uidx").on(table.rowId, table.seatNumber),
  ],
);

// ==========================================================
// VENUE SEAT LAYOUTS  (per-venue instance of a template)
// ==========================================================
// When an organizer attaches a template to a venue, the system
// CLONES the template geometry here so every venue owns its own
// copy and can tweak it without affecting the reusable template.
// ==========================================================

export const venueSeatLayouts = pgTable(
  "venue_seat_layouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    venueId: uuid("venue_id")
      .references(() => venues.id, {
        onDelete: "cascade",
      })
      .notNull()
      .unique(),

    sourceTemplateId: uuid("source_template_id")
      .references(() => seatTemplates.id, {
        onDelete: "restrict",
      })
      .notNull(),

    type: seatLayoutTypeEnum("type").notNull(),

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
  (table) => [index("venue_seat_layouts_venue_idx").on(table.venueId)],
);

export const venueSeatSections = pgTable(
  "venue_seat_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    seatLayoutId: uuid("seat_layout_id")
      .references(() => venueSeatLayouts.id, {
        onDelete: "cascade",
      })
      .notNull(),

    name: text("name").notNull(),

    description: text("description"),

    sortOrder: integer("sort_order").default(0).notNull(),

    hasSeats: boolean("has_seats").default(true).notNull(),

    capacity: integer("capacity"),
  },
  (table) => [index("venue_seat_sections_layout_idx").on(table.seatLayoutId)],
);

export const venueSeatRows = pgTable(
  "venue_seat_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    seatLayoutId: uuid("seat_layout_id")
      .references(() => venueSeatLayouts.id, {
        onDelete: "cascade",
      })
      .notNull(),

    sectionId: uuid("section_id")
      .references(() => venueSeatSections.id, {
        onDelete: "cascade",
      })
      .notNull(),

    label: text("label").notNull(),

    seatCount: integer("seat_count").notNull(),

    sortOrder: integer("sort_order").default(0).notNull(),

    category: seatCategoryEnum("category").default("REGULAR").notNull(),
  },
  (table) => [
    index("venue_seat_rows_layout_idx").on(table.seatLayoutId),
    index("venue_seat_rows_section_idx").on(table.sectionId),
  ],
);

export const venueSeats = pgTable(
  "venue_seats",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    seatLayoutId: uuid("seat_layout_id")
      .references(() => venueSeatLayouts.id, {
        onDelete: "cascade",
      })
      .notNull(),

    rowId: uuid("row_id")
      .references(() => venueSeatRows.id, {
        onDelete: "cascade",
      })
      .notNull(),

    seatNumber: integer("seat_number").notNull(),

    category: seatCategoryEnum("category").default("REGULAR").notNull(),

    isWheelchair: boolean("is_wheelchair").default(false).notNull(),

    isBlocked: boolean("is_blocked").default(false).notNull(),

    isAisle: boolean("is_aisle").default(false).notNull(),

    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    index("venue_seats_layout_idx").on(table.seatLayoutId),
    index("venue_seats_row_idx").on(table.rowId),
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

    // Which venue seat layout this show renders its seat map from.
    // Alleen relevant for SECTION_BASED / SEAT_SELECTION shows.
    seatLayoutId: uuid("seat_layout_id")
      .references(() => venueSeatLayouts.id, {
        onDelete: "restrict",
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
// SHOW SEATS   (materialized per-show seat availability + holds)
// ==========================================================
// This is the source of truth for what the audience sees and
// interacts with. One row per physical seat per show. The
// status field drives AVAILABLE / HELD / BOOKED / BLOCKED and
// heldUntil drives the booking countdown / seat lock expiry.
// ==========================================================

export const showSeats = pgTable(
  "show_seats",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    showId: uuid("show_id")
      .references(() => shows.id, {
        onDelete: "cascade",
      })
      .notNull(),

    venueSeatId: uuid("venue_seat_id")
      .references(() => venueSeats.id, {
        onDelete: "cascade",
      })
      .notNull(),

    label: text("label").notNull(), // e.g. "A18"

    category: seatCategoryEnum("category").default("REGULAR").notNull(),

    // Snapshot of the winning ticket price for this seat.
    price: integer("price").notNull(),

    // Maps the seat to a ticket type (name only, price snapshotted above).
    ticketTypeId: uuid("ticket_type_id")
      .references(() => ticketTypes.id, {
        onDelete: "restrict",
      }),

    status: seatStatusEnum("status").default("AVAILABLE").notNull(),

    // Whose session currently holds the seat (lock).
    heldBy: uuid("held_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // When the hold expires -> countdown deadline on the client.
    heldUntil: timestamp("held_until", { withTimezone: true }),

    // Opaque token proving the caller owns the hold (prevents racing).
    heldToken: text("held_token"),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("show_seats_show_idx").on(table.showId),
    index("show_seats_status_idx").on(table.status),
    index("show_seats_held_until_idx").on(table.heldUntil),
    uniqueIndex("show_seats_show_venue_uidx").on(table.showId, table.venueSeatId),
    uniqueIndex("show_seats_token_uidx").on(table.heldToken),
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

    // Optional: which seat category this ticket type maps to
    // (used by SEAT_SELECTION shows to price individual seats).
    seatCategory: seatCategoryEnum("seat_category"),

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
