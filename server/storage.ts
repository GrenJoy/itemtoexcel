import { type InventoryItem, type InsertInventoryItem, type ProcessingJob, type InsertProcessingJob, type UpdateQuantity } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Inventory Items
  getInventoryItems(sessionId: string): Promise<InventoryItem[]>;
  getInventoryItem(sessionId: string, id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(sessionId: string, item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(sessionId: string, id: string, item: Partial<InventoryItem>): Promise<InventoryItem>;
  updateInventoryItemQuantity(sessionId: string, update: UpdateQuantity): Promise<InventoryItem>;
  deleteInventoryItem(sessionId: string, id: string): Promise<void>;
  findInventoryItemByName(sessionId: string, name: string): Promise<InventoryItem | undefined>;
  clearInventory(sessionId: string): Promise<void>;
  
  // Processing Jobs
  getProcessingJob(id: string): Promise<ProcessingJob | undefined>;
  createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  updateProcessingJob(id: string, job: Partial<ProcessingJob>): Promise<ProcessingJob>;
  addProcessingLog(id: string, log: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private inventoryItems: Map<string, Map<string, InventoryItem>>; // sessionId -> itemId -> item
  private processingJobs: Map<string, ProcessingJob>;

  constructor() {
    this.inventoryItems = new Map();
    this.processingJobs = new Map();
  }

  private getSessionInventory(sessionId: string): Map<string, InventoryItem> {
    if (!this.inventoryItems.has(sessionId)) {
      this.inventoryItems.set(sessionId, new Map());
    }
    return this.inventoryItems.get(sessionId)!;
  }

  async getInventoryItems(sessionId: string): Promise<InventoryItem[]> {
    const sessionInventory = this.getSessionInventory(sessionId);
    return Array.from(sessionInventory.values());
  }

  async getInventoryItem(sessionId: string, id: string): Promise<InventoryItem | undefined> {
    const sessionInventory = this.getSessionInventory(sessionId);
    return sessionInventory.get(id);
  }

  async createInventoryItem(sessionId: string, insertItem: InsertInventoryItem): Promise<InventoryItem> {
    const id = randomUUID();
    const item: InventoryItem = { 
      ...insertItem, 
      id,
      quantity: insertItem.quantity ?? 1,
      sellPrices: Array.isArray(insertItem.sellPrices) ? insertItem.sellPrices : [],
      buyPrices: Array.isArray(insertItem.buyPrices) ? insertItem.buyPrices : [],
      avgSell: insertItem.avgSell ?? 0,
      avgBuy: insertItem.avgBuy ?? 0
    };
    const sessionInventory = this.getSessionInventory(sessionId);
    sessionInventory.set(id, item);
    return item;
  }

  async updateInventoryItem(sessionId: string, id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const sessionInventory = this.getSessionInventory(sessionId);
    const existing = sessionInventory.get(id);
    if (!existing) {
      throw new Error(`Inventory item with id ${id} not found`);
    }
    const updated: InventoryItem = { ...existing, ...updates };
    sessionInventory.set(id, updated);
    return updated;
  }

  async updateInventoryItemQuantity(sessionId: string, update: UpdateQuantity): Promise<InventoryItem> {
    const sessionInventory = this.getSessionInventory(sessionId);
    const existing = sessionInventory.get(update.id);
    if (!existing) {
      throw new Error(`Inventory item with id ${update.id} not found`);
    }
    const updated: InventoryItem = { ...existing, quantity: update.quantity };
    sessionInventory.set(update.id, updated);
    return updated;
  }

  async deleteInventoryItem(sessionId: string, id: string): Promise<void> {
    const sessionInventory = this.getSessionInventory(sessionId);
    sessionInventory.delete(id);
  }

  async findInventoryItemByName(sessionId: string, name: string): Promise<InventoryItem | undefined> {
    const sessionInventory = this.getSessionInventory(sessionId);
    for (const item of sessionInventory.values()) {
      if (item.name.toLowerCase().trim() === name.toLowerCase().trim()) {
        return item;
      }
    }
    return undefined;
  }

  async clearInventory(sessionId: string): Promise<void> {
    const sessionInventory = this.getSessionInventory(sessionId);
    sessionInventory.clear();
  }

  async getProcessingJob(id: string): Promise<ProcessingJob | undefined> {
    return this.processingJobs.get(id);
  }

  async createProcessingJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    const id = randomUUID();
    const job: ProcessingJob = { 
      ...insertJob, 
      id, 
      status: insertJob.status ?? "pending",
      totalImages: insertJob.totalImages ?? 0,
      processedImages: insertJob.processedImages ?? 0,
      totalItems: insertJob.totalItems ?? 0,
      processedItems: insertJob.processedItems ?? 0,
      logs: Array.isArray(insertJob.logs) ? insertJob.logs : [],
      createdAt: new Date().toISOString() 
    };
    this.processingJobs.set(id, job);
    return job;
  }

  async updateProcessingJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob> {
    const existing = this.processingJobs.get(id);
    if (!existing) {
      throw new Error(`Processing job with id ${id} not found`);
    }
    const updated: ProcessingJob = { ...existing, ...updates };
    this.processingJobs.set(id, updated);
    return updated;
  }

  async addProcessingLog(id: string, log: string): Promise<void> {
    const existing = this.processingJobs.get(id);
    if (!existing) {
      throw new Error(`Processing job with id ${id} not found`);
    }
    const logs = existing.logs || [];
    logs.push(`${new Date().toLocaleTimeString()}: ${log}`);
    const updated: ProcessingJob = { ...existing, logs };
    this.processingJobs.set(id, updated);
  }
}

import { PostgresStorage } from "./storage-postgres";

// Use PostgreSQL storage in production, MemStorage for fallback
export const storage = process.env.DATABASE_URL ? new PostgresStorage() : new MemStorage();