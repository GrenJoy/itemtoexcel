import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileUpload } from "@/components/file-upload";
import { ExcelUpload } from "@/components/excel-upload";
import { PriceUpdate } from "@/components/price-update";
import { ExcelSplit } from "@/components/excel-split";

import { InventoryTable } from "@/components/inventory-table";
import { ProcessingStatus } from "@/components/processing-status";
import { Statistics } from "@/components/statistics";

import { EditQuantityModal } from "@/components/edit-quantity-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bot, Download, Plus, FileEdit, Trash2, RefreshCw, Split, HelpCircle } from "lucide-react";
import type { InventoryItem } from "@shared/schema";

export default function Home() {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'oneshot' | 'edit' | 'online' | 'price-update' | 'split'>('oneshot');
  const [helpOpen, setHelpOpen] = useState(false);
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
      
      // Auto-clear inventory for oneshot and edit modes
      if (activeTab === 'oneshot' || activeTab === 'edit') {
        try {
          await fetch("/api/clear-inventory", { method: 'POST' });
          refetchInventory();
          toast({
            title: "Export successful",
            description: "Excel файл скачан и данные очищены",
          });
        } catch (clearError) {
          toast({
            title: "Export successful but clear failed",
            description: "Excel файл скачан, но данные не очищены",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Export successful",
          description: "Excel файл успешно скачан",
        });
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Ошибка при экспорте Excel файла",
        variant: "destructive",
      });
    }
  };

  const handleDeleteData = async () => {
    try {
      await fetch("/api/clear-inventory", { method: 'POST' });
      refetchInventory();
      toast({
        title: "Данные удалены",
        description: "Весь инвентарь был успешно очищен",
      });
    } catch (error) {
      toast({
        title: "Ошибка удаления",
        description: "Не удалось очистить данные",
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
                <h1 className="text-xl font-bold text-white">Warframe Items to Excel</h1>
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
                onClick={handleDeleteData}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Data
              </Button>
              <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 border-gray-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Справка</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-blue-400 font-medium">Сделано игроком GrendematriX</p>
                    <p className="text-gray-300 text-sm">
                      Я много тестировал но все же в 1м проценте случаев бывает ошибка при обработке фото 
                      и вместо "Акцельтра" будет "Акцельстра" и так далее.
                    </p>
                    <div className="text-sm text-gray-300">
                      <p className="font-medium">Для связи - предложений - замечаний можете обратится в дисскорд:</p>
                      <p className="text-blue-400 font-mono">grenjoy</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg max-w-2xl">
            <button
              onClick={() => setActiveTab('oneshot')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'oneshot'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Plus className="mr-2 h-4 w-4" />
              Одноразовая
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'edit'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FileEdit className="mr-2 h-4 w-4" />
              Редактировать Excel
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'online'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Bot className="mr-2 h-4 w-4" />
              Онлайн-редактор
            </button>
            <button
              onClick={() => setActiveTab('price-update')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'price-update'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Обновление цен
            </button>
            <button
              onClick={() => setActiveTab('split')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'split'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Split className="mr-2 h-4 w-4" />
              Разделение
            </button>
          </div>
        </div>

        {/* Mode Descriptions */}
        <div className="mb-6">
          {activeTab === 'oneshot' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Одноразовая обработка</h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Загружайте скриншоты, получайте Excel файл, скачивайте и всё очищается. Уникальные данные для каждого пользователя.
              </p>
            </div>
          )}
          {activeTab === 'edit' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Редактирование Excel</h3>
              <p className="text-green-700 dark:text-green-300 text-sm">
                Загрузите существующий Excel файл + новые скриншоты. После скачивания всё очищается.
              </p>
            </div>
          )}
          {activeTab === 'online' && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">Онлайн-редактирование</h3>
              <p className="text-purple-700 dark:text-purple-300 text-sm">
                Постоянное добавление скриншотов. Данные сохраняются до обновления страницы. Можно скачивать несколько раз.
              </p>
            </div>
          )}
          {activeTab === 'price-update' && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Обновление цен</h3>
              <p className="text-orange-700 dark:text-orange-300 text-sm">
                Загрузите Excel файл с названиями предметов. Система обновит цены через Warframe Market API.
              </p>
            </div>
          )}
          {activeTab === 'split' && (
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
              <h3 className="font-semibold text-teal-800 dark:text-teal-200 mb-2">Разделение по цене</h3>
              <p className="text-teal-700 dark:text-teal-300 text-sm">
                Загрузите Excel файл. Предметы от 11 платины перейдут в отдельный файл, до 10 платины останутся в основном.
              </p>
            </div>
          )}
        </div>

        {/* Upload and Processing Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {activeTab === 'oneshot' ? (
            <FileUpload 
              mode="oneshot"
              onJobCreated={setCurrentJobId}
              onProcessingComplete={handleProcessingComplete}
            />
          ) : activeTab === 'edit' ? (
            <ExcelUpload 
              mode="edit"
              onJobCreated={setCurrentJobId}
              onProcessingComplete={handleProcessingComplete}
            />
          ) : activeTab === 'price-update' ? (
            <PriceUpdate
              onJobCreated={setCurrentJobId}
              onProcessingComplete={handleProcessingComplete}
            />
          ) : activeTab === 'split' ? (
            <ExcelSplit
              onJobCreated={setCurrentJobId}
              onProcessingComplete={handleProcessingComplete}
            />
          ) : (
            <FileUpload 
              mode="online"
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
