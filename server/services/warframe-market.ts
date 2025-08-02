import { type WarframeMarketItem } from "@shared/schema";

const WFM_BASE_URL = "https://api.warframe.market/v2";
const HEADERS = {
  'Platform': 'pc',
  'Language': 'ru',
  'User-Agent': 'Warframe-Inventory-Checker/Web-v1'
};

interface WFMItem {
  slug: string;
  i18n: {
    ru: {
      name: string;
    };
  };
}

interface WFMOrderData {
  sell: Array<{ platinum: number }>;
  buy: Array<{ platinum: number }>;
}

let itemsCache: Map<string, WFMItem> = new Map();

export function normalizeString(text: string): string {
  if (!text) return "";
  return text.toLowerCase().replace('ё', 'е').trim()
    .replace(/\s*:\s*/, ': ')
    .replace(/\s+/, ' ');
}

export async function loadItemsCache(): Promise<void> {
  try {
    console.log("Loading items cache from Warframe Market...");
    const response = await fetch(`${WFM_BASE_URL}/items`, {
      headers: HEADERS,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const items = data.data || [];
    
    itemsCache.clear();
    for (const item of items) {
      const itemNameRu = item.i18n?.ru?.name;
      if (itemNameRu) {
        itemsCache.set(normalizeString(itemNameRu), item);
      }
    }
    
    console.log(`Items cache loaded: ${itemsCache.size} items`);
  } catch (error) {
    console.error('Failed to load items cache:', error);
    throw new Error(`Failed to load Warframe Market items: ${error}`);
  }
}

export function findItemSlug(itemName: string): string | null {
  const normalizedName = normalizeString(itemName);
  const item = itemsCache.get(normalizedName);
  return item?.slug || null;
}

export async function getItemPrices(slug: string): Promise<WarframeMarketItem | null> {
  try {
    const url = `${WFM_BASE_URL}/orders/item/${slug}/top`;
    const response = await fetch(url, {
      headers: HEADERS,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const orderData: WFMOrderData = data.data || { sell: [], buy: [] };
    
    const sellPrices = orderData.sell.map(order => order.platinum);
    const buyPrices = orderData.buy.map(order => order.platinum);
    
    const avgSell = sellPrices.length > 0 
      ? Math.round((sellPrices.reduce((a, b) => a + b, 0) / sellPrices.length) * 100) / 100
      : 0;
    
    const avgBuy = buyPrices.length > 0
      ? Math.round((buyPrices.reduce((a, b) => a + b, 0) / buyPrices.length) * 100) / 100
      : 0;

    // Get Russian name from cache
    const cacheItem = Array.from(itemsCache.values()).find(item => item.slug === slug);
    const name = cacheItem?.i18n?.ru?.name || slug;
    
    return {
      slug,
      name,
      sellPrices,
      buyPrices,
      avgSell,
      avgBuy,
      marketUrl: `https://warframe.market/ru/items/${slug}`
    };
  } catch (error) {
    console.error(`Failed to get prices for ${slug}:`, error);
    return null;
  }
}

export async function processItemForMarket(itemName: string): Promise<WarframeMarketItem | null> {
  const slug = findItemSlug(itemName);
  if (!slug) {
    console.log(`Item not found in cache: ${itemName}`);
    return null;
  }
  
  return await getItemPrices(slug);
}

// Initialize cache on module load
loadItemsCache().catch(console.error);
