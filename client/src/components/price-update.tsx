import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Upload, X, RefreshCw } from "lucide-react";

interface PriceUpdateProps {
  onJobCreated: (jobId: string) => void;
  onProcessingComplete: () => void;
}

export function PriceUpdate({ onJobCreated, onProcessingComplete }: PriceUpdateProps) {
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExcelSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      toast({
        title: "Неверный формат файла",
        description: "Пожалуйста, выберите Excel файл (.xlsx или .xls)",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedExcelFile(file);
  };

  const removeExcelFile = () => {
    setSelectedExcelFile(null);
  };

  const updatePrices = async () => {
    if (!selectedExcelFile) {
      toast({
        title: "Файл не выбран",
        description: "Выберите Excel файл с названиями предметов",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('excelFile', selectedExcelFile);

      const response = await fetch('/api/update-prices', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Price update failed');
      }

      const data = await response.json();
      onJobCreated(data.jobId);
      
      // Reset form
      setSelectedExcelFile(null);
      
      toast({
        title: "Обновление начато",
        description: "Обновляем цены предметов через Warframe Market API...",
      });
    } catch (error) {
      toast({
        title: "Ошибка обновления",
        description: "Не удалось обновить цены",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <RefreshCw className="text-orange-500 mr-3 text-xl" />
          Обновление цен
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Excel File Upload */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Выберите Excel файл</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => excelInputRef.current?.click()}
              className="border-gray-600 hover:bg-gray-700"
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Выбрать Excel
            </Button>
          </div>
          
          {selectedExcelFile ? (
            <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
              <div className="flex items-center">
                <FileSpreadsheet className="text-orange-500 mr-3 h-4 w-4" />
                <span className="text-sm text-gray-300">{selectedExcelFile.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeExcelFile}
                className="text-red-400 hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-400">Excel файл не выбран</p>
            </div>
          )}
          
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => handleExcelSelect(e.target.files)}
          />
        </div>

        {/* Update Button */}
        <Button
          onClick={updatePrices}
          disabled={!selectedExcelFile || uploading}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600"
        >
          {uploading ? "Обновляем цены..." : "Обновить цены"}
        </Button>

        <div className="text-xs text-gray-400 bg-gray-700 rounded-lg p-3">
          <p className="font-medium mb-1">Как это работает:</p>
          <ul className="space-y-1 text-gray-400">
            <li>• Загрузите Excel файл с названиями предметов в столбце A</li>
            <li>• Система получит актуальные цены через Warframe Market API</li>
            <li>• Цены будут обновлены в столбце D (цены продажи)</li>
            <li>• Обновленный файл будет доступен для скачивания</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}