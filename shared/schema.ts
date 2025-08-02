import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug"),
  quantity: integer("quantity").notNull().default(1),
  sellPrices: jsonb("sell_prices").$type<number[]>().default([]),
  buyPrices: jsonb("buy_prices").$type<number[]>().default([]),
  avgSell: real("avg_sell").default(0),
  avgBuy: real("avg_buy").default(0),
  marketUrl: text("market_url"),
  category: text("category"),
});

export const processingJobs = pgTable("processing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  totalImages: integer("total_images").default(0),
  processedImages: integer("processed_images").default(0),
  totalItems: integer("total_items").default(0),
  processedItems: integer("processed_items").default(0),
  logs: jsonb("logs").$type<string[]>().default([]),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
});

export const insertProcessingJobSchema = createInsertSchema(processingJobs).omit({
  id: true,
  createdAt: true,
});

export const updateQuantitySchema = z.object({
  id: z.string(),
  quantity: z.number().min(0),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type ProcessingJob = typeof processingJobs.$inferSelect;
export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;
export type UpdateQuantity = z.infer<typeof updateQuantitySchema>;

export interface ProcessImageRequest {
  images: string[]; // base64 encoded images
}

export interface ProcessImageResponse {
  jobId: string;
}

export interface ProcessWithExcelRequest {
  images: string[]; // base64 encoded images
  excelFile: string; // base64 encoded Excel file
}

export interface ProcessWithExcelResponse {
  jobId: string;
}

export interface WarframeMarketItem {
  slug: string;
  name: string;
  sellPrices: number[];
  buyPrices: number[];
  avgSell: number;
  avgBuy: number;
  marketUrl: string;
}
