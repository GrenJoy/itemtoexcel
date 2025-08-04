import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import type { ProcessingJob } from "@shared/schema";

interface ProcessingStatusProps {
  jobId: string | null;
  onComplete: () => void;
}

export function ProcessingStatus({ jobId, onComplete }: ProcessingStatusProps) {
  const { data: job, refetch } = useQuery<ProcessingJob>({
    queryKey: ["/api/processing", jobId],
    enabled: !!jobId,
    refetchInterval: jobId ? 2000 : false, // Poll every 2 seconds when job is active
  });

  useEffect(() => {
    if (job?.status === "completed") {
      // Force refresh inventory data immediately
      onComplete();
      // Auto-hide after 2 seconds when completed
      setTimeout(() => {
        if (job?.status === "completed") {
          onComplete();
        }
      }, 2000);
    }
  }, [job?.status, onComplete]);

  if (!jobId || !job) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <Clock className="text-blue-500 mr-3 text-xl" />
            <h2 className="text-xl font-semibold text-white">Статус обработки</h2>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400">Ожидание загрузки файлов...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const imageProgress = job.totalImages ? ((job.processedImages || 0) / job.totalImages) * 100 : 0;
  const itemProgress = job.totalItems ? ((job.processedItems || 0) / job.totalItems) * 100 : 0;

  const getStatusIcon = () => {
    switch (job.status) {
      case "completed":
        return <CheckCircle2 className="text-green-500 mr-3 text-xl" />;
      case "failed":
        return <AlertCircle className="text-red-500 mr-3 text-xl" />;
      default:
        return <Clock className="text-blue-500 mr-3 text-xl" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case "completed":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      default:
        return "text-blue-500";
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          {getStatusIcon()}
          <h2 className="text-xl font-semibold text-white">Статус обработки</h2>
        </div>

        <div className="space-y-4">
          {/* Image Analysis Progress */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Анализ изображений</span>
              <span className="text-xs text-gray-400">
                {job.processedImages}/{job.totalImages}
              </span>
            </div>
            <Progress value={imageProgress} className="h-2" />
          </div>

          {/* Price Fetching Progress */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Получение цен</span>
              <span className="text-xs text-gray-400">
                {job.processedItems}/{job.totalItems}
              </span>
            </div>
            <Progress value={itemProgress} className="h-2 bg-green-600" />
          </div>

          {/* Processing Log */}
          <div className="bg-gray-700 rounded-lg p-4 max-h-32 overflow-y-auto custom-scrollbar">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Лог обработки:</h4>
            <div className="text-xs space-y-1">
              {job.logs?.length ? (
                job.logs.map((log, index) => (
                  <p key={index} className="text-gray-400">
                    {log}
                  </p>
                ))
              ) : (
                <p className="text-gray-400">Ожидание логов...</p>
              )}
            </div>
          </div>

          {/* Status Summary */}
          <div className={`text-center p-2 rounded-lg ${getStatusColor()}`}>
            <p className="font-medium">
              {job.status === "completed" && "Обработка завершена успешно!"}
              {job.status === "failed" && "Произошла ошибка при обработке"}
              {job.status === "processing" && "Обработка в процессе..."}
              {job.status === "pending" && "Ожидание начала обработки..."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
