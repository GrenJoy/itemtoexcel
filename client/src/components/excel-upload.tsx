import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Upload, X, Images, Plus } from "lucide-react";

interface ExcelUploadProps {
  mode: 'edit';
  onJobCreated: (jobId: string) => void;
  onProcessingComplete: () => void;
}

export function ExcelUpload({ mode, onJobCreated, onProcessingComplete }: ExcelUploadProps) {
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
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

  const processFiles = async () => {
    if (!selectedExcelFile || selectedImages.length === 0) {
      toast({
        title: "Файлы не выбраны",
        description: "Выберите Excel файл и хотя бы одно изображение",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      
      // Add Excel file
      formData.append('excelFile', selectedExcelFile);
      
      // Add image files
      selectedImages.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/process-with-excel', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onJobCreated(data.jobId);
      
      // Reset form
      setSelectedExcelFile(null);
      setSelectedImages([]);
      
      toast({
        title: "Обработка начата",
        description: `Обновляем Excel файл с ${selectedImages.length} новыми изображениями...`,
      });
    } catch (error) {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить и обработать файлы",
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
          Редактирование Excel файла
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Excel File Upload */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">1. Выберите Excel файл</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => excelInputRef.current?.click()}
              className="border-gray-600 hover:bg-gray-700"
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
        </div>

        {/* Images Upload */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">2. Добавьте новые скриншоты</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => imagesInputRef.current?.click()}
              className="border-gray-600 hover:bg-gray-700"
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
        </div>

        {/* Process Button */}
        <Button
          onClick={processFiles}
          disabled={!selectedExcelFile || selectedImages.length === 0 || uploading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
        >
          {uploading ? "Обрабатываем..." : "Обновить Excel файл"}
        </Button>

        <div className="text-xs text-gray-400 bg-gray-700 rounded-lg p-3">
          <p className="font-medium mb-1">Как это работает:</p>
          <ul className="space-y-1 text-gray-400">
            <li>• Загрузите ваш существующий Excel файл с инвентарем</li>
            <li>• Добавьте новые скриншоты для анализа</li>
            <li>• ИИ найдет новые предметы и обновит количество существующих</li>
            <li>• Обновленный файл будет доступен для скачивания</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}