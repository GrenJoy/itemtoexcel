import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInventoryItemSchema, updateQuantitySchema, type ProcessImageRequest, type ProcessImageResponse } from "@shared/schema";
import { analyzeInventoryImage } from "./services/gemini";
import { processItemForMarket, loadItemsCache } from "./services/warframe-market";
import multer from "multer";
import ExcelJS from "exceljs";
import { z } from "zod";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Warframe Market cache
  try {
    await loadItemsCache();
  } catch (error) {
    console.error('Failed to initialize Warframe Market cache:', error);
  }

  // Get all inventory items
  app.get("/api/inventory", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      const items = await storage.getInventoryItems(sessionId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  // Process images with optional Excel file upload
  app.post("/api/process-with-excel", upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'excelFile', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const imageFiles = files.images || [];
      const excelFiles = files.excelFile || [];

      if (imageFiles.length === 0) {
        return res.status(400).json({ message: "No images provided" });
      }

      // Create processing job
      const job = await storage.createProcessingJob({
        status: "processing",
        totalImages: imageFiles.length,
        processedImages: 0,
        totalItems: 0,
        processedItems: 0,
        logs: []
      });

      // Process images and Excel file asynchronously
      const sessionId = req.sessionID;
      processImagesWithExcelAsync(job.id, sessionId, imageFiles, excelFiles[0]).catch(error => {
        console.error('Error processing images with Excel:', error);
        storage.updateProcessingJob(job.id, { status: "failed" });
        storage.addProcessingLog(job.id, `Error: ${error instanceof Error ? error.message : String(error)}`);
      });

      res.json({ jobId: job.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to start image processing with Excel" });
    }
  });

  // Process uploaded images (original endpoint)
  app.post("/api/process-images", upload.array('images'), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No images provided" });
      }

      // Create processing job
      const job = await storage.createProcessingJob({
        status: "processing",
        totalImages: files.length,
        processedImages: 0,
        totalItems: 0,
        processedItems: 0,
        logs: []
      });

      // Process images asynchronously
      const sessionId = req.sessionID;
      processImagesAsync(job.id, sessionId, files).catch(error => {
        console.error('Error processing images:', error);
        storage.updateProcessingJob(job.id, { status: "failed" });
        storage.addProcessingLog(job.id, `Error: ${error.message}`);
      });

      res.json({ jobId: job.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to start image processing" });
    }
  });

  // Get processing job status
  app.get("/api/processing/:jobId", async (req, res) => {
    try {
      const job = await storage.getProcessingJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job status" });
    }
  });

  // Update item quantity
  app.patch("/api/inventory/:id/quantity", async (req, res) => {
    try {
      const validation = updateQuantitySchema.safeParse({
        id: req.params.id,
        quantity: req.body.quantity
      });

      if (!validation.success) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const sessionId = req.sessionID;
      const updated = await storage.updateInventoryItemQuantity(sessionId, validation.data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update item quantity" });
    }
  });

  // Delete inventory item
  app.delete("/api/inventory/:id", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      await storage.deleteInventoryItem(sessionId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // Export to Excel
  app.get("/api/export/excel", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      const items = await storage.getInventoryItems(sessionId);
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Warframe Inventory');

      // Add headers
      worksheet.addRow([
        'Название',
        'Количество', 
        'Slug',
        'Цены продажи',
        'Цены покупки',
        'Средняя продажа',
        'Средняя покупка',
        'Ссылка'
      ]);

      // Add data
      for (const item of items) {
        worksheet.addRow([
          item.name,
          item.quantity,
          item.slug || 'НЕ НАЙДЕН',
          item.sellPrices?.join(', ') || 'Нет',
          item.buyPrices?.join(', ') || 'Нет',
          item.avgSell || 0,
          item.avgBuy || 0,
          item.marketUrl || 'N/A'
        ]);
      }

      // Style headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1e3a8a' }
      };

      // Auto-size columns
      worksheet.columns.forEach((column, index) => {
        if (column) {
          let maxLength = 0;
          column.eachCell?.({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength + 2;
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=warframe_inventory.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Excel export error:', error);
      res.status(500).json({ message: "Failed to export Excel file" });
    }
  });

  // Get inventory statistics
  app.get("/api/inventory/stats", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      const items = await storage.getInventoryItems(sessionId);
      
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = items.reduce((sum, item) => sum + ((item.avgSell || 0) * item.quantity), 0);
      const avgPrice = totalItems > 0 ? totalValue / totalItems : 0;

      res.json({
        totalItems,
        totalValue: Math.round(totalValue * 100) / 100,
        avgPrice: Math.round(avgPrice * 100) / 100,
        uniqueItems: items.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function processImagesAsync(jobId: string, sessionId: string, files: Express.Multer.File[]) {
  await storage.addProcessingLog(jobId, "Starting image analysis...");

  const allItemNames: string[] = [];

  // Process each image
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await storage.addProcessingLog(jobId, `Analyzing image ${i + 1}/${files.length}: ${file.originalname}`);

    try {
      const base64Image = file.buffer.toString('base64');
      const items = await analyzeInventoryImage(base64Image);
      allItemNames.push(...items);

      await storage.updateProcessingJob(jobId, { processedImages: i + 1 });
      await storage.addProcessingLog(jobId, `Found ${items.length} items in ${file.originalname}`);
    } catch (error) {
      await storage.addProcessingLog(jobId, `Error analyzing ${file.originalname}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Count item quantities
  const itemCounts = new Map<string, number>();
  for (const itemName of allItemNames) {
    itemCounts.set(itemName, (itemCounts.get(itemName) || 0) + 1);
  }

  await storage.updateProcessingJob(jobId, { 
    totalItems: itemCounts.size,
    processedItems: 0 
  });

  await storage.addProcessingLog(jobId, `Processing ${itemCounts.size} unique items...`);

  let processedCount = 0;
  // Process each unique item
  for (const [itemName, quantity] of Array.from(itemCounts.entries())) {
    try {
      // Check if item already exists
      const existingItem = await storage.findInventoryItemByName(sessionId, itemName);
      
      if (existingItem) {
        // Update quantity
        await storage.updateInventoryItemQuantity(sessionId, {
          id: existingItem.id,
          quantity: existingItem.quantity + quantity
        });
        await storage.addProcessingLog(jobId, `Updated quantity for: ${itemName} (+${quantity})`);
      } else {
        // Get market data and create new item
        const marketData = await processItemForMarket(itemName);
        
        if (marketData) {
          await storage.createInventoryItem({
            name: itemName,
            slug: marketData.slug,
            quantity,
            sellPrices: marketData.sellPrices,
            buyPrices: marketData.buyPrices,
            avgSell: marketData.avgSell,
            avgBuy: marketData.avgBuy,
            marketUrl: marketData.marketUrl,
            category: itemName.includes('(Чертеж)') ? 'Чертежи' : 'Prime части'
          });
          await storage.addProcessingLog(jobId, `Added new item: ${itemName} (${quantity}x)`);
        } else {
          await storage.createInventoryItem({
            name: itemName,
            slug: null,
            quantity,
            sellPrices: [],
            buyPrices: [],
            avgSell: 0,
            avgBuy: 0,
            marketUrl: null,
            category: 'Unknown'
          });
          await storage.addProcessingLog(jobId, `Added item (not found in market): ${itemName} (${quantity}x)`);
        }
      }

      processedCount++;
      await storage.updateProcessingJob(jobId, { processedItems: processedCount });
    } catch (error) {
      await storage.addProcessingLog(jobId, `Error processing ${itemName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await storage.updateProcessingJob(jobId, { status: "completed" });
  await storage.addProcessingLog(jobId, "Processing completed successfully!");
}

async function processImagesWithExcelAsync(jobId: string, sessionId: string, imageFiles: Express.Multer.File[], excelFile?: Express.Multer.File) {
  await storage.addProcessingLog(jobId, "Starting image analysis with Excel integration...");

  // Load existing Excel data if provided
  let existingData: Map<string, any> = new Map();
  if (excelFile) {
    try {
      await storage.addProcessingLog(jobId, `Loading existing Excel file: ${excelFile.originalname}`);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(excelFile.buffer);
      const worksheet = workbook.getWorksheet(1);
      
      if (worksheet) {
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) { // Skip header row
            const itemName = row.getCell(1).value?.toString();
            const quantity = parseInt(row.getCell(2).value?.toString() || '0');
            const slug = row.getCell(3).value?.toString();
            const sellPrices = row.getCell(4).value?.toString();
            const buyPrices = row.getCell(5).value?.toString();
            const avgSell = parseFloat(row.getCell(6).value?.toString() || '0');
            const avgBuy = parseFloat(row.getCell(7).value?.toString() || '0');
            const marketUrl = row.getCell(8).value?.toString();
            
            if (itemName) {
              existingData.set(itemName, {
                quantity,
                slug,
                sellPrices: sellPrices && sellPrices !== 'Нет' ? sellPrices.split(', ').map(Number) : [],
                buyPrices: buyPrices && buyPrices !== 'Нет' ? buyPrices.split(', ').map(Number) : [],
                avgSell,
                avgBuy,
                marketUrl
              });
            }
          }
        });
        await storage.addProcessingLog(jobId, `Loaded ${existingData.size} items from Excel file`);
      }
    } catch (error) {
      await storage.addProcessingLog(jobId, `Error loading Excel file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const allItemNames: string[] = [];

  // Process each image
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    await storage.addProcessingLog(jobId, `Analyzing image ${i + 1}/${imageFiles.length}: ${file.originalname}`);

    try {
      const base64Image = file.buffer.toString('base64');
      const items = await analyzeInventoryImage(base64Image);
      allItemNames.push(...items);

      await storage.updateProcessingJob(jobId, { processedImages: i + 1 });
      await storage.addProcessingLog(jobId, `Found ${items.length} items in ${file.originalname}`);
    } catch (error) {
      await storage.addProcessingLog(jobId, `Error analyzing ${file.originalname}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Count item quantities
  const itemCounts = new Map<string, number>();
  for (const itemName of allItemNames) {
    itemCounts.set(itemName, (itemCounts.get(itemName) || 0) + 1);
  }

  await storage.updateProcessingJob(jobId, { 
    totalItems: itemCounts.size,
    processedItems: 0 
  });

  await storage.addProcessingLog(jobId, `Processing ${itemCounts.size} unique items...`);

  // Clear existing inventory data from storage
  await storage.clearInventory(sessionId);
  
  // First, load all existing Excel data into storage
  for (const [itemName, data] of existingData.entries()) {
    try {
      await storage.createInventoryItem(sessionId, {
        name: itemName,
        slug: data.slug === 'НЕ НАЙДЕН' ? null : data.slug,
        quantity: data.quantity,
        sellPrices: data.sellPrices,
        buyPrices: data.buyPrices,
        avgSell: data.avgSell,
        avgBuy: data.avgBuy,
        marketUrl: data.marketUrl === 'N/A' ? null : data.marketUrl,
        category: itemName.includes('(Чертеж)') ? 'Чертежи' : 'Prime части'
      });
    } catch (error) {
      await storage.addProcessingLog(jobId, `Error loading existing item ${itemName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  let processedCount = 0;
  // Process each unique item from new screenshots
  for (const [itemName, quantity] of Array.from(itemCounts.entries())) {
    try {
      // Check if item already exists (from Excel or previous processing)
      const existingItem = await storage.findInventoryItemByName(sessionId, itemName);
      
      if (existingItem) {
        // Update quantity (add to existing)
        await storage.updateInventoryItemQuantity(sessionId, {
          id: existingItem.id,
          quantity: existingItem.quantity + quantity
        });
        await storage.addProcessingLog(jobId, `Updated existing item: ${itemName} (+${quantity}, total: ${existingItem.quantity + quantity})`);
      } else {
        // Get market data and create new item
        const marketData = await processItemForMarket(itemName);
        
        if (marketData) {
          await storage.createInventoryItem({
            name: itemName,
            slug: marketData.slug,
            quantity,
            sellPrices: marketData.sellPrices,
            buyPrices: marketData.buyPrices,
            avgSell: marketData.avgSell,
            avgBuy: marketData.avgBuy,
            marketUrl: marketData.marketUrl,
            category: itemName.includes('(Чертеж)') ? 'Чертежи' : 'Prime части'
          });
          await storage.addProcessingLog(jobId, `Added new item: ${itemName} (${quantity}x)`);
        } else {
          await storage.createInventoryItem({
            name: itemName,
            slug: null,
            quantity,
            sellPrices: [],
            buyPrices: [],
            avgSell: 0,
            avgBuy: 0,
            marketUrl: null,
            category: 'Unknown'
          });
          await storage.addProcessingLog(jobId, `Added item (not found in market): ${itemName} (${quantity}x)`);
        }
      }

      processedCount++;
      await storage.updateProcessingJob(jobId, { processedItems: processedCount });
    } catch (error) {
      await storage.addProcessingLog(jobId, `Error processing ${itemName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await storage.updateProcessingJob(jobId, { status: "completed" });
  await storage.addProcessingLog(jobId, "Processing with Excel integration completed successfully!");
}
