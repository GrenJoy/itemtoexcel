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

// Cache for split files
const splitFileCache = new Map<string, {
  lowPriceFile: Buffer;
  highPriceFile: Buffer;
  lowCount: number;
  highCount: number;
}>();

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

  // Load Excel file into database (first time only)
  app.post("/api/load-excel", upload.single('excelFile'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No Excel file provided" });
      }

      // Create processing job
      const job = await storage.createProcessingJob({
        status: "processing",
        totalImages: 0,
        processedImages: 0,
        totalItems: 0,
        processedItems: 0,
        logs: []
      });

      // Load Excel file asynchronously
      const sessionId = req.sessionID;
      loadExcelFileAsync(job.id, sessionId, file).catch(error => {
        console.error('Error loading Excel file:', error);
        storage.updateProcessingJob(job.id, { status: "failed" });
        storage.addProcessingLog(job.id, `Error: ${error instanceof Error ? error.message : String(error)}`);
      });

      res.json({ jobId: job.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to start Excel loading" });
    }
  });

  // Add screenshots to existing inventory (unlimited)
  app.post("/api/add-screenshots", upload.array('images'), async (req, res) => {
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

      // Process images asynchronously (add to existing inventory)
      const sessionId = req.sessionID;
      processImagesAsync(job.id, sessionId, files, 'edit').catch(error => {
        console.error('Error processing images:', error);
        storage.updateProcessingJob(job.id, { status: "failed" });
        storage.addProcessingLog(job.id, `Error: ${error instanceof Error ? error.message : String(error)}`);
      });

      res.json({ jobId: job.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to start image processing" });
    }
  });

  // Update prices from Excel file
  app.post("/api/update-prices", upload.single('excelFile'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No Excel file provided" });
      }

      // Create processing job
      const job = await storage.createProcessingJob({
        status: "processing",
        totalImages: 0,
        processedImages: 0,
        totalItems: 0,
        processedItems: 0,
        logs: []
      });

      // Update prices asynchronously
      const sessionId = req.sessionID;
      updatePricesFromExcelAsync(job.id, sessionId, file).catch(error => {
        console.error('Error updating prices:', error);
        storage.updateProcessingJob(job.id, { status: "failed" });
        storage.addProcessingLog(job.id, `Error: ${error instanceof Error ? error.message : String(error)}`);
      });

      res.json({ jobId: job.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to start price update" });
    }
  });

  // Split Excel file by price
  app.post("/api/split-excel", upload.single('excelFile'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No Excel file provided" });
      }

      // Create processing job
      const job = await storage.createProcessingJob({
        status: "processing",
        totalImages: 0,
        processedImages: 0,
        totalItems: 0,
        processedItems: 0,
        logs: []
      });

      // Split Excel asynchronously
      const sessionId = req.sessionID;
      splitExcelByPriceAsync(job.id, sessionId, file).catch(error => {
        console.error('Error splitting Excel:', error);
        storage.updateProcessingJob(job.id, { status: "failed" });
        storage.addProcessingLog(job.id, `Error: ${error instanceof Error ? error.message : String(error)}`);
      });

      res.json({ jobId: job.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to start Excel split" });
    }
  });

  // Download split files
  app.get("/api/download-split/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const sessionId = req.sessionID;
      
      if (type !== 'low' && type !== 'high') {
        return res.status(400).json({ message: "Invalid file type" });
      }
      
      const splitFiles = splitFileCache.get(sessionId);
      if (!splitFiles) {
        return res.status(404).json({ message: "Split files not found" });
      }
      
      const fileBuffer = type === 'low' ? splitFiles.lowPriceFile : splitFiles.highPriceFile;
      if (!fileBuffer) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const filename = type === 'low' 
        ? 'warframe_inventory_low_price.xlsx'
        : 'warframe_inventory_high_price.xlsx';
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(fileBuffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to download split file" });
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

  // Clear inventory for oneshot and edit modes after Excel export
  app.post("/api/clear-inventory", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      await storage.clearInventory(sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear inventory" });
    }
  });

  // Process images in oneshot mode (auto-clear after export)
  app.post("/api/process-oneshot", upload.array('images'), async (req, res) => {
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

      // Process images asynchronously with mode 'oneshot'
      const sessionId = req.sessionID;
      processImagesAsync(job.id, sessionId, files, 'oneshot').catch(error => {
        console.error('Error processing oneshot images:', error);
        storage.updateProcessingJob(job.id, { status: "failed" });
        storage.addProcessingLog(job.id, `Error: ${error instanceof Error ? error.message : String(error)}`);
      });

      res.json({ jobId: job.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to start oneshot processing" });
    }
  });

  // Process images in online mode (keep data until page refresh)
  app.post("/api/process-online", upload.array('images'), async (req, res) => {
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

      // Process images asynchronously with mode 'online'
      const sessionId = req.sessionID;
      processImagesAsync(job.id, sessionId, files, 'online').catch(error => {
        console.error('Error processing online images:', error);
        storage.updateProcessingJob(job.id, { status: "failed" });
        storage.addProcessingLog(job.id, `Error: ${error instanceof Error ? error.message : String(error)}`);
      });

      res.json({ jobId: job.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to start online processing" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function updatePricesFromExcelAsync(jobId: string, sessionId: string, excelFile: Express.Multer.File) {
  await storage.addProcessingLog(jobId, "Starting price update from Excel file...");
  
  try {
    await storage.addProcessingLog(jobId, `Processing Excel file: ${excelFile.originalname}`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelFile.buffer as any);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      throw new Error("No worksheet found in Excel file");
    }

    // Clear existing inventory first
    await storage.clearInventory(sessionId);
    await storage.addProcessingLog(jobId, "Cleared existing inventory for price update");

    const itemNames: string[] = [];
    const originalData: Array<{
      name: string;
      quantity: number;
      row: number;
    }> = [];

    // Extract item names from column A
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header row
        const itemName = row.getCell(1).value?.toString();
        const quantity = parseInt(row.getCell(2).value?.toString() || '1');
        
        if (itemName) {
          itemNames.push(itemName);
          originalData.push({
            name: itemName,
            quantity,
            row: rowNumber
          });
        }
      }
    });

    await storage.updateProcessingJob(jobId, { 
      totalItems: itemNames.length,
      processedItems: 0 
    });

    await storage.addProcessingLog(jobId, `Found ${itemNames.length} items for price update`);

    let processedCount = 0;
    // Process each item to get market data
    for (const itemData of originalData) {
      try {
        // Get market data for this item
        const marketData = await processItemForMarket(itemData.name);
        
        if (marketData) {
          // Create item in database with updated prices
          await storage.createInventoryItem(sessionId, {
            name: itemData.name,
            slug: marketData.slug,
            quantity: itemData.quantity,
            sellPrices: marketData.sellPrices,
            buyPrices: marketData.buyPrices,
            avgSell: marketData.avgSell,
            avgBuy: marketData.avgBuy,
            marketUrl: marketData.marketUrl,
            category: itemData.name.includes('(Чертеж)') ? 'Чертежи' : 'Prime части'
          });
          
          await storage.addProcessingLog(jobId, `Updated prices for: ${itemData.name} (${marketData.avgSell} платины)`);
        } else {
          // Create item without market data
          await storage.createInventoryItem(sessionId, {
            name: itemData.name,
            slug: null,
            quantity: itemData.quantity,
            sellPrices: [],
            buyPrices: [],
            avgSell: 0,
            avgBuy: 0,
            marketUrl: null,
            category: 'Unknown'
          });
          
          await storage.addProcessingLog(jobId, `Item not found in market: ${itemData.name}`);
        }

        processedCount++;
        await storage.updateProcessingJob(jobId, { processedItems: processedCount });
      } catch (error) {
        await storage.addProcessingLog(jobId, `Error processing ${itemData.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    await storage.updateProcessingJob(jobId, { status: "completed" });
    await storage.addProcessingLog(jobId, `Price update completed! Updated ${processedCount} items.`);
    
  } catch (error) {
    await storage.addProcessingLog(jobId, `Error updating prices: ${error instanceof Error ? error.message : String(error)}`);
    await storage.updateProcessingJob(jobId, { status: "failed" });
  }
}

async function splitExcelByPriceAsync(jobId: string, sessionId: string, excelFile: Express.Multer.File) {
  await storage.addProcessingLog(jobId, "Starting Excel split by price...");
  
  try {
    await storage.addProcessingLog(jobId, `Processing Excel file: ${excelFile.originalname}`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelFile.buffer as any);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      throw new Error("No worksheet found in Excel file");
    }

    // Create two new workbooks for low and high prices
    const lowPriceWorkbook = new ExcelJS.Workbook();
    const highPriceWorkbook = new ExcelJS.Workbook();
    
    const lowPriceWorksheet = lowPriceWorkbook.addWorksheet('Low Price Items');
    const highPriceWorksheet = highPriceWorkbook.addWorksheet('High Price Items');

    // Copy header row to both worksheets
    const headerRow = worksheet.getRow(1);
    const headerValues: any[] = [];
    headerRow.eachCell((cell) => {
      headerValues.push(cell.value);
    });
    
    lowPriceWorksheet.addRow(headerValues);
    highPriceWorksheet.addRow(headerValues);

    let lowPriceCount = 0;
    let highPriceCount = 0;
    let totalRows = 0;

    // Process each row (skip header)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        totalRows++;
        const priceCell = row.getCell(4); // Column D (price column)
        const priceValue = priceCell.value;
        
        // Extract first number from price cell
        let firstPrice = 0;
        if (priceValue) {
          const priceStr = priceValue.toString();
          const priceMatch = priceStr.match(/^\d+/);
          if (priceMatch) {
            firstPrice = parseInt(priceMatch[0]);
          }
        }
        
        // Copy entire row values
        const rowValues: any[] = [];
        row.eachCell((cell, colNumber) => {
          rowValues[colNumber - 1] = cell.value;
        });
        
        // Add to appropriate worksheet based on price
        if (firstPrice <= 10) {
          lowPriceWorksheet.addRow(rowValues);
          lowPriceCount++;
        } else {
          highPriceWorksheet.addRow(rowValues);
          highPriceCount++;
        }
      }
    });

    await storage.updateProcessingJob(jobId, { 
      totalItems: totalRows,
      processedItems: totalRows 
    });

    await storage.addProcessingLog(jobId, `Split completed: ${lowPriceCount} low price items, ${highPriceCount} high price items`);

    // Generate Excel buffers
    const lowPriceBuffer = await lowPriceWorkbook.xlsx.writeBuffer();
    const highPriceBuffer = await highPriceWorkbook.xlsx.writeBuffer();

    // Cache the split files
    splitFileCache.set(sessionId, {
      lowPriceFile: Buffer.from(lowPriceBuffer),
      highPriceFile: Buffer.from(highPriceBuffer),
      lowCount: lowPriceCount,
      highCount: highPriceCount
    });

    await storage.updateProcessingJob(jobId, { status: "completed" });
    await storage.addProcessingLog(jobId, `Excel split completed! Ready to download split files.`);
    
  } catch (error) {
    await storage.addProcessingLog(jobId, `Error splitting Excel: ${error instanceof Error ? error.message : String(error)}`);
    await storage.updateProcessingJob(jobId, { status: "failed" });
  }
}

async function processImagesAsync(jobId: string, sessionId: string, files: Express.Multer.File[], mode: 'oneshot' | 'online' | 'edit' = 'online') {
  await storage.addProcessingLog(jobId, "Starting image analysis...");

  const allItems: Array<{ name: string; quantity: number }> = [];

  // Process each image
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await storage.addProcessingLog(jobId, `Analyzing image ${i + 1}/${files.length}: ${file.originalname}`);

    try {
      const base64Image = file.buffer.toString('base64');
      const items = await analyzeInventoryImage(base64Image);
      allItems.push(...items);

      await storage.updateProcessingJob(jobId, { processedImages: i + 1 });
      await storage.addProcessingLog(jobId, `Found ${items.length} items in ${file.originalname}`);
    } catch (error) {
      await storage.addProcessingLog(jobId, `Error analyzing ${file.originalname}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Count item quantities (combine same items from different screenshots)
  const itemCounts = new Map<string, number>();
  for (const item of allItems) {
    itemCounts.set(item.name, (itemCounts.get(item.name) || 0) + item.quantity);
  }

  await storage.updateProcessingJob(jobId, { 
    totalItems: itemCounts.size,
    processedItems: 0 
  });

  await storage.addProcessingLog(jobId, `Processing ${itemCounts.size} unique items...`);

  let processedCount = 0;
  // Process each unique item
  for (const [itemName, totalQuantity] of Array.from(itemCounts.entries())) {
    try {
      // Check if item already exists
      const existingItem = await storage.findInventoryItemByName(sessionId, itemName);
      
      if (existingItem && mode === 'edit') {
        // Update quantity (add to existing)
        await storage.updateInventoryItemQuantity(sessionId, {
          id: existingItem.id,
          quantity: existingItem.quantity + totalQuantity
        });
        await storage.addProcessingLog(jobId, `Updated quantity for: ${itemName} (+${totalQuantity}, total: ${existingItem.quantity + totalQuantity})`);
      } else if (existingItem) {
        // Replace quantity for non-edit modes
        await storage.updateInventoryItemQuantity(sessionId, {
          id: existingItem.id,
          quantity: totalQuantity
        });
        await storage.addProcessingLog(jobId, `Updated quantity for: ${itemName} (${totalQuantity}x)`);
      } else {
        // Get market data and create new item
        const marketData = await processItemForMarket(itemName);
        
        if (marketData) {
          await storage.createInventoryItem(sessionId, {
            name: itemName,
            slug: marketData.slug,
            quantity: totalQuantity,
            sellPrices: marketData.sellPrices,
            buyPrices: marketData.buyPrices,
            avgSell: marketData.avgSell,
            avgBuy: marketData.avgBuy,
            marketUrl: marketData.marketUrl,
            category: itemName.includes('(Чертеж)') ? 'Чертежи' : 'Prime части'
          });
          await storage.addProcessingLog(jobId, `Added new item: ${itemName} (${totalQuantity}x) - ${marketData.avgSell} платины`);
        } else {
          await storage.createInventoryItem(sessionId, {
            name: itemName,
            slug: null,
            quantity: totalQuantity,
            sellPrices: [],
            buyPrices: [],
            avgSell: 0,
            avgBuy: 0,
            marketUrl: null,
            category: 'Unknown'
          });
          await storage.addProcessingLog(jobId, `Added item (not found in market): ${itemName} (${totalQuantity}x)`);
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

async function loadExcelFileAsync(jobId: string, sessionId: string, excelFile: Express.Multer.File) {
  await storage.addProcessingLog(jobId, "Loading Excel file into database...");
  
  try {
    await storage.addProcessingLog(jobId, `Processing Excel file: ${excelFile.originalname}`);
    
    // Clear existing inventory first
    await storage.clearInventory(sessionId);
    await storage.addProcessingLog(jobId, "Cleared existing inventory");
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelFile.buffer as any);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      throw new Error("No worksheet found in Excel file");
    }

    let loadedCount = 0;
    const totalRows = worksheet.actualRowCount - 1; // Exclude header

    await storage.updateProcessingJob(jobId, { 
      totalItems: totalRows,
      processedItems: 0 
    });

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
          // Create item in database
          storage.createInventoryItem(sessionId, {
            name: itemName,
            slug: slug === 'НЕ НАЙДЕН' ? null : slug,
            quantity,
            sellPrices: sellPrices && sellPrices !== 'Нет' ? sellPrices.split(', ').map(Number) : [],
            buyPrices: buyPrices && buyPrices !== 'Нет' ? buyPrices.split(', ').map(Number) : [],
            avgSell,
            avgBuy,
            marketUrl: marketUrl === 'N/A' ? null : marketUrl,
            category: itemName.includes('(Чертеж)') ? 'Чертежи' : 'Prime части'
          }).then(() => {
            loadedCount++;
            storage.updateProcessingJob(jobId, { processedItems: loadedCount });
            storage.addProcessingLog(jobId, `Loaded: ${itemName} (${quantity}x)`);
          }).catch(error => {
            storage.addProcessingLog(jobId, `Error loading ${itemName}: ${error instanceof Error ? error.message : String(error)}`);
          });
        }
      }
    });

    // Wait a bit for all items to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await storage.updateProcessingJob(jobId, { status: "completed" });
    await storage.addProcessingLog(jobId, `Excel file loaded successfully! ${loadedCount} items imported.`);
    
  } catch (error) {
    await storage.addProcessingLog(jobId, `Error loading Excel file: ${error instanceof Error ? error.message : String(error)}`);
    await storage.updateProcessingJob(jobId, { status: "failed" });
  }
}
