import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Upload, X, Images, Plus, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { InventoryItem } from "@shared/schema";

interface ExcelUploadProps {
  mode: 'edit';
  onJobCreated: (jobId: string) => void;
  onProcessingComplete: () => void;
}

export function ExcelUpload({ mode, onJobCreated, onProcessingComplete }: ExcelUploadProps) {
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<'load-excel' | 'add-screenshots'>('load-excel');
  const excelInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Check if inventory has items to determine current step
  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

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

  const handleImagesSelect = (files: FileList | null) => {
    if (!files) return;
    
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (imageFiles.length === 0) {
      toast({
        title: "Неверные файлы",
        description: "Пожалуйста, выберите только изображения",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedImages(prev => [...prev, ...imageFiles]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExcelFile = () => {
    setSelectedExcelFile(null);
  };

  // Auto-detect current step based on inventory
  const currentStep = inventoryItems.length > 0 ? 'add-screenshots' : step;

  const loadExcelFile = async () => {
    if (!selectedExcelFile) {
      toast({
        title: "Файл не выбран",
        description: "Выберите Excel файл",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('excelFile', selectedExcelFile);

      const response = await fetch('/api/load-excel', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onJobCreated(data.jobId);
      
      // Reset form and move to next step
      setSelectedExcelFile(null);
      setStep('add-screenshots');
      
      toast({
        title: "Загрузка начата",
        description: "Загружаем данные из Excel файла в базу...",
      });
    } catch (error) {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить Excel файл",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const addScreenshots = async () => {
    if (selectedImages.length === 0) {
      toast({
        title: "Изображения не выбраны",
        description: "Выберите хотя бы одно изображение",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      
      selectedImages.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/add-screenshots', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onJobCreated(data.jobId);
      
      // Reset images
      setSelectedImages([]);
      
      toast({
        title: "Обработка начата",
        description: `Добавляем ${selectedImages.length} новых скриншотов в инвентарь...`,
      });
    } catch (error) {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить и обработать изображения",
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
          <FileSpreadsheet className="text-green-500 mr-3 text-xl" />
          {currentStep === 'load-excel' ? 'Загрузка Excel файла' : 'Добавление скриншотов'}
        </CardTitle>
        <div className="flex items-center space-x-4 mt-2">
          <div className={`flex items-center ${currentStep === 'load-excel' ? 'text-blue-400' : 'text-green-400'}`}>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2 ${
              currentStep === 'load-excel' ? 'border-blue-400 bg-blue-400' : 'border-green-400 bg-green-400'
            }`}>
              {inventoryItems.length > 0 ? '✓' : '1'}
            </div>
            <span className="text-sm">Excel файл</span>
          </div>
          <ArrowRight className="text-gray-500 h-4 w-4" />
          <div className={`flex items-center ${currentStep === 'add-screenshots' ? 'text-blue-400' : 'text-gray-500'}`}>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2 ${
              currentStep === 'add-screenshots' ? 'border-blue-400 bg-blue-400' : 'border-gray-500'
            }`}>
              {currentStep === 'add-screenshots' ? '∞' : '2'}
            </div>
            <span className="text-sm">Скриншоты</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentStep === 'load-excel' ? (
          // Step 1: Load Excel File
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Выберите Excel файл для загрузки</h3>
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
                  <FileSpreadsheet className="text-green-500 mr-3 h-4 w-4" />
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

            <Button
              onClick={loadExcelFile}
              disabled={!selectedExcelFile || uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
            >
              {uploading ? "Загружаем..." : "Загрузить Excel в базу"}
            </Button>
            
            <div className="text-xs text-gray-400 bg-gray-700 rounded-lg p-3">
              <p className="font-medium mb-1">Шаг 1:</p>
              <p>Загрузите Excel файл с инвентарем в базу данных. Это нужно сделать только один раз.</p>
            </div>
          </div>
        ) : (
          // Step 2: Add Screenshots
          <div>
            <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-sm text-green-400">✓ Excel файл загружен ({inventoryItems.length} предметов в базе)</p>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Добавьте скриншоты</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => imagesInputRef.current?.click()}
                className="border-gray-600 hover:bg-gray-700"
                disabled={uploading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Добавить изображения
              </Button>
            </div>

            {selectedImages.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                {selectedImages.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-center">
                      <Images className="text-blue-500 mr-3 h-4 w-4" />
                      <span className="text-sm text-gray-300">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeImage(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Скриншоты не выбраны</p>
              </div>
            )}

            <input
              ref={imagesInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImagesSelect(e.target.files)}
            />

            <Button
              onClick={addScreenshots}
              disabled={selectedImages.length === 0 || uploading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
            >
              {uploading ? "Обрабатываем..." : `Добавить ${selectedImages.length} скриншотов`}
            </Button>

            <div className="text-xs text-gray-400 bg-gray-700 rounded-lg p-3">
              <p className="font-medium mb-1">Шаг 2 (бесконечный):</p>
              <p>Добавляйте скриншоты сколько угодно раз. Новые предметы создаются, количество существующих увеличивается.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}