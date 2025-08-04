import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { inventoryItems, processingJobs, type InventoryItem, type InsertInventoryItem, type ProcessingJob, type InsertProcessingJob, type UpdateQuantity } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { IStorage } from "./storage";

const sql = neon(process.env.DATABASE_URL! );
const db = drizzle(sql);

export class PostgresStorage implements IStorage {
  // Inventory Items
  async getInventoryItems(sessionId: string): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems).where(eq(inventoryItems.sessionId, sessionId));
  }

  async getInventoryItem(sessionId: string, id: string): Promise<InventoryItem | undefined> {
    const result = await db.select().from(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.sessionId, sessionId)))
      .limit(1);
    return result[0];
  }

  async createInventoryItem(sessionId: string, item: InsertInventoryItem): Promise<InventoryItem> {
    const id = randomUUID();
    const newItem = {
      ...item,
      id,
      sessionId,
      quantity: item.quantity ?? 1,
      sellPrices: Array.isArray(item.sellPrices) ? item.sellPrices : [],
      buyPrices: Array.isArray(item.buyPrices) ? item.buyPrices : [],
      avgSell: item.avgSell ?? 0,
      avgBuy: item.avgBuy ?? 0
    };
    
    const result = await db.insert(inventoryItems).values([newItem]).returning();
    return result[0];
  }

  async updateInventoryItem(sessionId: string, id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const result = await db.update(inventoryItems)
      .set(updates)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.sessionId, sessionId)))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Inventory item with id ${id} not found`);
    }
    return result[0];
  }

  async updateInventoryItemQuantity(sessionId: string, update: UpdateQuantity): Promise<InventoryItem> {
    const result = await db.update(inventoryItems)
      .set({ quantity: update.quantity })
      .where(and(eq(inventoryItems.id, update.id), eq(inventoryItems.sessionId, sessionId)))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Inventory item with id ${update.id} not found`);
    }
    return result[0];
  }

  async deleteInventoryItem(sessionId: string, id: string): Promise<void> {
    await db.delete(inventoryItems)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.sessionId, sessionId)));
  }

  async findInventoryItemByName(sessionId: string, name: string): Promise<InventoryItem | undefined> {
    const result = await db.select().from(inventoryItems)
      .where(and(eq(inventoryItems.name, name), eq(inventoryItems.sessionId, sessionId)))
      .limit(1);
    return result[0];
  }

  async clearInventory(sessionId: string): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.sessionId, sessionId));
  }

  // Processing Jobs
  async getProcessingJob(id: string): Promise<ProcessingJob | undefined> {
    const result = await db.select().from(processingJobs)
      .where(eq(processingJobs.id, id))
      .limit(1);
    return result[0];
  }

  async createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob> {
    const id = randomUUID();
    const newJob = {
      ...job,
      id,
      status: job.status ?? "pending",
      totalImages: job.totalImages ?? 0,
      processedImages: job.processedImages ?? 0,
      totalItems: job.totalItems ?? 0,
      processedItems: job.processedItems ?? 0,
      logs: Array.isArray(job.logs) ? job.logs : []
    };
    
    const result = await db.insert(processingJobs).values([newJob]).returning();
    return result[0];
  }

  async updateProcessingJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob> {
    const result = await db.update(processingJobs)
      .set(updates)
      .where(eq(processingJobs.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Processing job with id ${id} not found`);
    }
    return result[0];
  }

  async addProcessingLog(id: string, log: string): Promise<void> {
    const existing = await this.getProcessingJob(id);
    if (!existing) {
      throw new Error(`Processing job with id ${id} not found`);
    }
    
    const logs = existing.logs || [];
    logs.push(`${new Date().toLocaleTimeString()}: ${log}`);
    
    await db.update(processingJobs)
      .set({ logs })
      .where(eq(processingJobs.id, id));
  }
}