import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit } from "lucide-react";
import type { InventoryItem } from "@shared/schema";

interface EditQuantityModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: () => void;
}

export function EditQuantityModal({ item, onClose, onSave }: EditQuantityModalProps) {
  const [quantity, setQuantity] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    if (quantity < 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity cannot be negative",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/inventory/${item.id}/quantity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      toast({
        title: "Quantity updated",
        description: `Updated quantity for ${item.name}`,
      });
      
      onSave();
      onClose();
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update item quantity",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center text-white">
            <Edit className="text-blue-500 mr-3" />
            Изменить количество
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Предмет</Label>
            <div className="bg-gray-700 rounded-lg px-3 py-2 mt-2">
              <p className="text-white">{item.name}</p>
            </div>
          </div>
          
          <div>
            <Label htmlFor="quantity" className="text-gray-300">
              Количество
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="bg-gray-700 border-gray-600 text-white mt-2"
            />
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {saving ? "Сохраняем..." : "Сохранить"}
            </Button>
            <Button 
              variant="outline"
              onClick={onClose}
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
