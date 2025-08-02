import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload, Images, X, FileSpreadsheet, Upload, Plus } from "lucide-react";

interface OnlineEditorProps {
  onJobCreated: (jobId: string) => void;
  onProcessingComplete: () => void;
}

export function OnlineEditor({ onJobCreated, onProcessingComplete }: OnlineEditorProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedExcelFile, setSelectedExcelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [excelLoaded, setExcelLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (imageFiles.length === 0) {
      toast({
        title: "Неверные файлы",
        description: "Выберите только изображения",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-blue-500');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500');
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExcelFile = () => {
    setSelectedExcelFile(null);
  };

  const loadExcelFile = async () => {
    if (!selectedExcelFile) {
      toast({
        title: "Файл не выбран",
        description: "Выберите Excel файл для загрузки",
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
        throw new Error('Excel load failed');
      }

      const data = await response.json();
      onJobCreated(data.jobId);
      setExcelLoaded(true);
      
      toast({
        title: "Excel загружен",
        description: "Теперь можете добавлять скриншоты",
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

  const processImages = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Нет файлов",
        description: "Выберите хотя бы одно изображение",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/add-screenshots', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      const data = await response.json();
      onJobCreated(data.jobId);
      setSelectedFiles([]);
      
      toast({
        title: "Обработка начата",
        description: "Анализируем скриншоты с помощью ИИ...",
      });
    } catch (error) {
      toast({
        title: "Ошибка обработки",
        description: "Не удалось обработать изображения",
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
          <Plus className="text-purple-500 mr-3 text-xl" />
          Онлайн-редактор
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Excel File Section */}
        {!excelLoaded && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">1. Загрузите Excel файл (один раз)</h3>
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
              <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3 mb-3">
                <div className="flex items-center">
                  <FileSpreadsheet className="text-purple-500 mr-3 h-4 w-4" />
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
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center mb-3">
                <p className="text-sm text-gray-400">Excel файл не выбран</p>
              </div>
            )}
            
            <Button
              onClick={loadExcelFile}
              disabled={!selectedExcelFile || uploading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 mb-4"
            >
              {uploading ? "Загружаем Excel..." : "Загрузить Excel"}
            </Button>
            
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleExcelSelect(e.target.files)}
            />
          </div>
        )}

        {/* Images Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">
              {excelLoaded ? "2. Добавляйте скриншоты" : "Сначала загрузите Excel"}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="border-gray-600 hover:bg-gray-700"
              disabled={uploading || !excelLoaded}
            >
              <CloudUpload className="mr-2 h-4 w-4" />
              Выбрать скриншоты
            </Button>
          </div>
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              excelLoaded ? 'border-gray-600 hover:border-purple-500' : 'border-gray-700'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Images className={`mx-auto h-12 w-12 mb-4 ${excelLoaded ? 'text-purple-400' : 'text-gray-600'}`} />
            <p className={`text-lg font-medium mb-2 ${excelLoaded ? 'text-purple-300' : 'text-gray-500'}`}>
              {excelLoaded ? 'Перетащите скриншоты сюда' : 'Сначала загрузите Excel файл'}
            </p>
            <p className={`text-sm ${excelLoaded ? 'text-gray-400' : 'text-gray-600'}`}>
              {excelLoaded ? 'или нажмите кнопку выше' : 'чтобы начать работу'}
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              Выбранные файлы ({selectedFiles.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-700 rounded p-2">
                  <span className="text-sm text-gray-300 truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="text-red-400 hover:text-red-300 h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Process Button */}
        <Button
          onClick={processImages}
          disabled={selectedFiles.length === 0 || uploading || !excelLoaded}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600"
        >
          {uploading ? "Обрабатываем..." : `Обработать скриншоты (${selectedFiles.length})`}
        </Button>

        <div className="text-xs text-gray-400 bg-gray-700 rounded-lg p-3">
          <p className="font-medium mb-1">Как это работает:</p>
          <ul className="space-y-1 text-gray-400">
            <li>• Сначала загрузите Excel файл - он загрузится один раз</li>
            <li>• Затем добавляйте скриншоты сколько угодно раз</li>
            <li>• Каждый новый скриншот добавит предметы к существующим</li>
            <li>• Данные сохраняются до обновления страницы</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}