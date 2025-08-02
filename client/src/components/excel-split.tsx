import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Upload, X, Split, Download } from "lucide-react";

interface ExcelSplitProps {
  onJobCreated: (jobId: string) => void;
  onProcessingComplete: () => void;
}

export function ExcelSplit({ onJobCreated, onProcessingComplete }: ExcelSplitProps) {
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [splitResults, setSplitResults] = useState<{
    lowPriceFile?: string;
    highPriceFile?: string;
    lowCount?: number;
    highCount?: number;
  } | null>(null);
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
    setSplitResults(null);
  };

  const removeExcelFile = () => {
    setSelectedExcelFile(null);
    setSplitResults(null);
  };

  const splitExcel = async () => {
    if (!selectedExcelFile) {
      toast({
        title: "Файл не выбран",
        description: "Выберите Excel файл для разделения",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('excelFile', selectedExcelFile);

      const response = await fetch('/api/split-excel', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Excel split failed');
      }

      const data = await response.json();
      onJobCreated(data.jobId);
      setSplitResults(data.results);
      
      toast({
        title: "Разделение начато",
        description: "Разделяем Excel файл по цене (до 11 и от 12 платины)...",
      });
    } catch (error) {
      toast({
        title: "Ошибка разделения",
        description: "Не удалось разделить Excel файл",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (fileType: 'low' | 'high') => {
    try {
      const response = await fetch(`/api/download-split/${fileType}`);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileType === 'low' 
        ? "warframe_inventory_low_price.xlsx"
        : "warframe_inventory_high_price.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Файл скачан",
        description: `${fileType === 'low' ? 'Низкие цены' : 'Высокие цены'} файл успешно скачан`,
      });
    } catch (error) {
      toast({
        title: "Ошибка скачивания",
        description: "Не удалось скачать файл",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <Split className="text-teal-500 mr-3 text-xl" />
          Разделение по цене
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
                <FileSpreadsheet className="text-teal-500 mr-3 h-4 w-4" />
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

        {/* Split Button */}
        <Button
          onClick={splitExcel}
          disabled={!selectedExcelFile || uploading}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600"
        >
          {uploading ? "Разделяем файл..." : "Разделить по цене"}
        </Button>

        {/* Download Results */}
        {splitResults && (
          <div className="space-y-3 border-t border-gray-600 pt-4">
            <h4 className="text-sm font-medium text-gray-300">Результаты разделения:</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => downloadFile('low')}
                variant="outline"
                className="flex items-center justify-center bg-green-900/20 border-green-600 text-green-400 hover:bg-green-900/30"
              >
                <Download className="mr-2 h-4 w-4" />
                До 10 платины
                {splitResults.lowCount && (
                  <span className="ml-1 text-xs">({splitResults.lowCount})</span>
                )}
              </Button>
              
              <Button
                onClick={() => downloadFile('high')}
                variant="outline"
                className="flex items-center justify-center bg-red-900/20 border-red-600 text-red-400 hover:bg-red-900/30"
              >
                <Download className="mr-2 h-4 w-4" />
                От 11 платины
                {splitResults.highCount && (
                  <span className="ml-1 text-xs">({splitResults.highCount})</span>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-400 bg-gray-700 rounded-lg p-3">
          <p className="font-medium mb-1">Как это работает:</p>
          <ul className="space-y-1 text-gray-400">
            <li>• Загрузите Excel файл с ценами в столбце D</li>
            <li>• Система разделит предметы: до 10 платины и от 11 платины</li>
            <li>• Каждый файл будет сжат без пустых строк</li>
            <li>• Скачайте оба файла отдельно</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}