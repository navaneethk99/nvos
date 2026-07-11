import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const vmStatuses = [
  "provisioning",
  "starting",
  "running",
  "stopping",
  "stopped",
  "terminating",
  "terminated",
  "failed",
] as const;

export type VmStatus = (typeof vmStatuses)[number];

export const vmOperatingSystems = ["ubuntu", "windows"] as const;

export type VmOperatingSystem = (typeof vmOperatingSystems)[number];

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const instance = pgTable("instance", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  machineType: text("machine_type").notNull(),
  status: text("status").notNull().default("running"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const virtualMachine = pgTable(
  "virtual_machine",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    plan: text("plan"),
    os: text("os").$type<VmOperatingSystem>().notNull().default("ubuntu"),
    instanceType: text("instance_type").notNull(),
    slug: text("slug").notNull(),
    hostname: text("hostname").notNull(),
    instanceId: text("instance_id"),
    privateIp: text("private_ip"),
    status: text("status").$type<VmStatus>().notNull().default("provisioning"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    stoppedAt: timestamp("stopped_at"),
    terminatedAt: timestamp("terminated_at"),
  },
  (table) => [
    uniqueIndex("virtual_machine_slug_unique").on(table.slug),
    uniqueIndex("virtual_machine_hostname_unique").on(table.hostname),
    uniqueIndex("virtual_machine_instance_id_unique").on(table.instanceId),
    index("virtual_machine_user_id_idx").on(table.userId),
    index("virtual_machine_status_idx").on(table.status),
    index("virtual_machine_user_status_idx").on(table.userId, table.status),
  ],
);
