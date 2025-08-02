import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Key } from "lucide-react";

interface APIKeyModalProps {
  open: boolean;
  onClose: () => void;
}

export function APIKeyModal({ open, onClose }: APIKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const storedKey = localStorage.getItem('geminiApiKey') || "";
      setApiKey(storedKey);
    }
  }, [open]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key required",
        description: "Please enter your Gemini API key",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem('geminiApiKey', apiKey.trim());
    toast({
      title: "API Key saved",
      description: "Your API key has been saved locally",
    });
    onClose();
  };

  const handleCancel = () => {
    setApiKey(localStorage.getItem('geminiApiKey') || "");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-white">
            <Key className="text-blue-500 mr-3" />
            Настройка API
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="apiKey" className="text-gray-300">
              Gemini API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Введите ваш API ключ"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 mt-2"
            />
            <p className="text-xs text-gray-400 mt-1">
              Ключ будет сохранен локально и не передается третьим лицам
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Сохранить
            </Button>
            <Button 
              variant="outline"
              onClick={handleCancel}
              className="flex-1 border-gray-600 hover:bg-gray-700"
            >
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
