import { type InventoryItem, type InsertInventoryItem, type ProcessingJob, type InsertProcessingJob, type UpdateQuantity } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Inventory Items
  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InventoryItem>): Promise<InventoryItem>;
  updateInventoryItemQuantity(update: UpdateQuantity): Promise<InventoryItem>;
  deleteInventoryItem(id: string): Promise<void>;
  findInventoryItemByName(name: string): Promise<InventoryItem | undefined>;
  clearInventory(): Promise<void>;
  
  // Processing Jobs
  getProcessingJob(id: string): Promise<ProcessingJob | undefined>;
  createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  updateProcessingJob(id: string, job: Partial<ProcessingJob>): Promise<ProcessingJob>;
  addProcessingLog(id: string, log: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private inventoryItems: Map<string, InventoryItem>;
  private processingJobs: Map<string, ProcessingJob>;

  constructor() {
    this.inventoryItems = new Map();
    this.processingJobs = new Map();
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values());
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    return this.inventoryItems.get(id);
  }

  async createInventoryItem(insertItem: InsertInventoryItem): Promise<InventoryItem> {
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
    this.inventoryItems.set(id, item);
    return item;
  }

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const existing = this.inventoryItems.get(id);
    if (!existing) {
      throw new Error(`Inventory item with id ${id} not found`);
    }
    const updated: InventoryItem = { ...existing, ...updates };
    this.inventoryItems.set(id, updated);
    return updated;
  }

  async updateInventoryItemQuantity(update: UpdateQuantity): Promise<InventoryItem> {
    const existing = this.inventoryItems.get(update.id);
    if (!existing) {
      throw new Error(`Inventory item with id ${update.id} not found`);
    }
    const updated: InventoryItem = { ...existing, quantity: update.quantity };
    this.inventoryItems.set(update.id, updated);
    return updated;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    this.inventoryItems.delete(id);
  }

  async findInventoryItemByName(name: string): Promise<InventoryItem | undefined> {
    return Array.from(this.inventoryItems.values()).find(
      (item) => item.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
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

  async clearInventory(): Promise<void> {
    this.inventoryItems.clear();
  }
}

export const storage = new MemStorage();
