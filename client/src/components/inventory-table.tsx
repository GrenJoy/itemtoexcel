import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Warehouse, Search, ExternalLink, Edit, Trash2, Box, ScrollText } from "lucide-react";
import type { InventoryItem } from "@shared/schema";

interface InventoryTableProps {
  items: InventoryItem[];
  loading: boolean;
  onEditQuantity: (item: InventoryItem) => void;
  onRefresh: () => void;
}

export function InventoryTable({ items, loading, onEditQuantity, onRefresh }: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const { toast } = useToast();

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      onRefresh();
      toast({
        title: "Item deleted",
        description: "Item has been removed from inventory",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const openMarketLink = (url: string | null) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const getItemIcon = (category: string | null) => {
    if (category === "Чертежи") {
      return <ScrollText className="text-green-500 h-4 w-4" />;
    }
    return <Box className="text-blue-500 h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-8 w-full bg-gray-700" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <div className="flex items-center">
          <Warehouse className="text-blue-500 mr-3 text-xl" />
          <h2 className="text-xl font-semibold text-white">Инвентарь</h2>
          <Badge variant="secondary" className="ml-3 bg-blue-600 text-white">
            {items.length} предметов
          </Badge>
        </div>
        
        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input
              placeholder="Поиск предметов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white pl-10"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="all">Все категории</SelectItem>
              <SelectItem value="Prime части">Prime части</SelectItem>
              <SelectItem value="Чертежи">Чертежи</SelectItem>
              <SelectItem value="Unknown">Неизвестные</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full inventory-table">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-6 text-sm font-medium text-gray-300">Название</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Кол-во</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Цена продажи</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Цена покупки</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Средняя продажа</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-300">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {paginatedItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-700 transition-colors duration-150">
                <td className="py-3 px-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center mr-3">
                      {getItemIcon(item.category)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.category || "Unknown"}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant="secondary" className="bg-gray-600 text-white">
                    {item.quantity}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-green-400 font-medium">
                    {item.sellPrices?.length ? item.sellPrices.join(', ') : 'Нет'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-blue-400 font-medium">
                    {item.buyPrices?.length ? item.buyPrices.join(', ') : 'Нет'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-white font-medium">{item.avgSell || 0}</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {item.marketUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openMarketLink(item.marketUrl)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditQuantity(item)}
                      className="text-yellow-400 hover:text-yellow-300"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-6 border-t border-gray-700">
        <div className="text-sm text-gray-400">
          Показано {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} из {filteredItems.length} предметов
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="border-gray-600 hover:bg-gray-700"
          >
            Предыдущая
          </Button>
          
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            const page = i + 1;
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={currentPage === page ? "bg-blue-600" : "border-gray-600 hover:bg-gray-700"}
              >
                {page}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="border-gray-600 hover:bg-gray-700"
          >
            Следующая
          </Button>
        </div>
      </div>
    </Card>
  );
}
