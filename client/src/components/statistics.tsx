import { Card, CardContent } from "@/components/ui/card";
import { Package, Coins, TrendingUp } from "lucide-react";

interface StatisticsProps {
  stats: {
    totalItems: number;
    totalValue: number;
    avgPrice: number;
    uniqueItems: number;
  };
}

export function Statistics({ stats }: StatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Package className="text-white text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-white">{stats.totalItems}</p>
              <p className="text-sm text-gray-400">Всего предметов</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="bg-green-600 p-3 rounded-lg">
              <Coins className="text-white text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-white">{stats.totalValue.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Общая стоимость (платина)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="bg-orange-500 p-3 rounded-lg">
              <TrendingUp className="text-white text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-white">{stats.avgPrice}</p>
              <p className="text-sm text-gray-400">Средняя цена предмета</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
