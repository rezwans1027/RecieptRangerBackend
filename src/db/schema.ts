import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").unique(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: varchar("clerk_id", { length: 256 }),
  username: text("username").unique(),
  email: varchar("email", { length: 256 }),
  role: integer("role_id").references(() => roles.id),
  onboarded: boolean("onboarded").default(false),
  organization: integer("organization_id").references(() => organizations.id),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});
