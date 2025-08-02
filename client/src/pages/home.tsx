import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileUpload } from "@/components/file-upload";
import { ExcelUpload } from "@/components/excel-upload";
import { InventoryTable } from "@/components/inventory-table";
import { ProcessingStatus } from "@/components/processing-status";
import { Statistics } from "@/components/statistics";

import { EditQuantityModal } from "@/components/edit-quantity-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bot, Download, Plus, FileEdit } from "lucide-react";
import type { InventoryItem } from "@shared/schema";

export default function Home() {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'excel'>('new');
  const { toast } = useToast();

  const { data: inventoryItems = [], isLoading: loadingInventory, refetch: refetchInventory } = useQuery({
    queryKey: ["/api/inventory"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/inventory/stats"],
  });

  const handleExportExcel = async () => {
    try {
      const response = await fetch("/api/export/excel");
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "warframe_inventory.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export successful",
        description: "Inventory has been exported to Excel file",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export inventory to Excel",
        variant: "destructive",
      });
    }
  };

  const handleProcessingComplete = () => {
    refetchInventory();
    // Small delay to allow user to see completion status
    setTimeout(() => {
      setCurrentJobId(null);
    }, 2000);
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Bot className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Warframe Inventory Tracker</h1>
                <p className="text-sm text-gray-400">AI-powered inventory management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleExportExcel}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <div className="text-xs text-gray-400">
                Сделано игроком GrendematriX
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg max-w-md">
            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'new'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Plus className="mr-2 h-4 w-4" />
              Новый инвентарь
            </button>
            <button
              onClick={() => setActiveTab('excel')}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'excel'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FileEdit className="mr-2 h-4 w-4" />
              Редактировать Excel
            </button>
          </div>
        </div>

        {/* Upload and Processing Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {activeTab === 'new' ? (
            <FileUpload 
              onJobCreated={setCurrentJobId}
              onProcessingComplete={handleProcessingComplete}
            />
          ) : (
            <ExcelUpload 
              onJobCreated={setCurrentJobId}
              onProcessingComplete={handleProcessingComplete}
            />
          )}
          <ProcessingStatus 
            jobId={currentJobId}
            onComplete={handleProcessingComplete}
          />
        </div>

        {/* Inventory Table */}
        <InventoryTable
          items={inventoryItems as InventoryItem[]}
          loading={loadingInventory}
          onEditQuantity={setEditingItem}
          onRefresh={refetchInventory}
        />

        {/* Statistics */}
        {stats && <Statistics stats={stats as { totalItems: number; totalValue: number; avgPrice: number; uniqueItems: number; }} />}
        
        {/* Footer */}
        <footer className="mt-12 text-center py-8 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            Создано игроком <span className="text-blue-400 font-medium">GrendematriX</span> для сообщества Warframe
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Powered by Google Gemini AI • Warframe Market API • React + TypeScript
          </p>
        </footer>
      </div>

      {/* Modals */}
      <EditQuantityModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={refetchInventory}
      />
    </div>
  );
}
