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

export const users: any = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: varchar("clerk_id", { length: 256 }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: varchar("email", { length: 256 }),
  role: integer("role_id").references(() => roles.id),
  onboarded: boolean("onboarded").default(false),
  organization: integer("organization_id").references(() => organizations.id),
  manager: integer("manager_id").references(() => users.id)
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 256 }).unique(),
  senderEmail: varchar("sender_email", { length: 256 }),
  email: varchar("email", { length: 256 }),
  role: integer("role_id").references(() => roles.id),
  organization: integer("organization_id").references(() => organizations.id),
  accepted: boolean("accepted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
