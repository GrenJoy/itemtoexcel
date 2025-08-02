import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileUpload } from "@/components/file-upload";
import { InventoryTable } from "@/components/inventory-table";
import { ProcessingStatus } from "@/components/processing-status";
import { Statistics } from "@/components/statistics";
import { APIKeyModal } from "@/components/api-key-modal";
import { EditQuantityModal } from "@/components/edit-quantity-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bot, Download, Settings } from "lucide-react";
import type { InventoryItem } from "@shared/schema";

export default function Home() {
  const [showAPIModal, setShowAPIModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
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
    setCurrentJobId(null);
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowAPIModal(true)}
                className="border-gray-600 hover:bg-gray-700"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload and Processing Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <FileUpload 
            onJobCreated={setCurrentJobId}
            onProcessingComplete={handleProcessingComplete}
          />
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
      </div>

      {/* Modals */}
      <APIKeyModal
        open={showAPIModal}
        onClose={() => setShowAPIModal(false)}
      />

      <EditQuantityModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={refetchInventory}
      />
    </div>
  );
}
