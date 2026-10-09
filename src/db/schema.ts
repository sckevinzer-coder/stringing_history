import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core'

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().default("datetime('now')"),
}, (t) => ({
  nameIdx: index('idx_customers_name').on(t.name),
}))

export const rackets = sqliteTable('rackets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  racketModel: text('racket_model').notNull(),
  nickname: text('nickname'),
  headSize: real('head_size'),
  stringPattern: text('string_pattern'),
  createdAt: text('created_at').notNull().default("datetime('now')"),
}, (t) => ({
  customerIdx: index('idx_rackets_customer_id').on(t.customerId),
  modelIdx: index('idx_rackets_model').on(t.racketModel),
}))

export const strings = sqliteTable('strings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  brand: text('brand').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  shape: text('shape'),
  gauge: text('gauge'),
  color: text('color'),
  stiffnessRa: real('stiffness_ra'),
  tensionLossPct: real('tension_loss_pct'),
  spinPotential: real('spin_potential'),
  cost: real('cost'),
  laborCost: real('labor_cost').notNull().default(10000),
  remainingUses: integer('remaining_uses'),
  memo: text('memo'),
  createdAt: text('created_at').notNull().default("datetime('now')"),
}, (t) => ({
  brandNameIdx: index('idx_strings_brand_model').on(t.brand, t.name),
  categoryIdx: index('idx_strings_category').on(t.category),
}))

export const stringJobs = sqliteTable('string_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  racketId: integer('racket_id').notNull().references(() => rackets.id, { onDelete: 'cascade' }),
  stringType: text('string_type').notNull(),
  stringId: integer('string_id').references(() => strings.id, { onDelete: 'set null' }),
  tensionMain: real('tension_main'),
  tensionCross: real('tension_cross'),
  cutLengthMain: real('cut_length_main'),
  cutLengthCross: real('cut_length_cross'),
  jobDate: text('job_date').notNull(),
  price: real('price'),
  memo: text('memo'),
  createdAt: text('created_at').notNull().default("datetime('now')"),
  updatedAt: text('updated_at').notNull().default("datetime('now')"),
}, (t) => ({
  racketIdx: index('idx_string_jobs_racket_id').on(t.racketId),
  typeIdx: index('idx_string_jobs_string_type').on(t.stringType),
  dateIdx: index('idx_string_jobs_job_date').on(t.jobDate),
  stringIdIdx: index('idx_string_jobs_string_id').on(t.stringId),
}))

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull().default("datetime('now')"),
  expiresAt: text('expires_at').notNull(),
}, (t) => ({
  expIdx: index('idx_sessions_expires_at').on(t.expiresAt),
}))

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type Racket = typeof rackets.$inferSelect
export type NewRacket = typeof rackets.$inferInsert
export type StringJob = typeof stringJobs.$inferSelect
export type NewStringJob = typeof stringJobs.$inferInsert