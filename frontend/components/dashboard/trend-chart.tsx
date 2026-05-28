"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { TrendItem } from "@/lib/api/dashboard";

const chartConfig = {
  count: {
    label: "患者数",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

/**
 * 格式化月份显示：2026-02 → 2月
 */
function formatMonth(monthStr: string): string {
  const parts = monthStr.split('-');
  if (parts.length === 2) {
    return `${parseInt(parts[1])}月`;
  }
  return monthStr;
}

interface TrendChartProps {
  data?: TrendItem[];
  isLoading?: boolean;
}

export function TrendChart({ data = [], isLoading = false }: TrendChartProps) {
  const chartData = data.map(item => ({
    month: formatMonth(item.month),
    count: item.count,
  }));

  // 计算总数
  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  // 计算时间范围描述
  const rangeText = data.length > 0
    ? `${formatMonth(data[0].month)} - ${formatMonth(data[data.length - 1].month)}`
    : '暂无数据';

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle>患者入库趋势</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 pb-2">
        {isLoading ? (
          <div className="flex h-full min-h-[180px] w-full items-center justify-center text-sm text-muted-foreground">加载中...</div>
        ) : chartData.length > 0 ? (
          <div className="flex h-full min-h-[180px] w-full items-stretch">
            <ChartContainer config={chartConfig} className="h-full min-h-0 w-full flex-1 aspect-auto">
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                  top: 8,
                  bottom: 8,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Area
                  dataKey="count"
                  type="natural"
                  fill="var(--color-count)"
                  fillOpacity={0.4}
                  stroke="var(--color-count)"
                />
              </AreaChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-full min-h-[180px] w-full items-center justify-center text-sm text-muted-foreground">
            暂无数据
          </div>
        )}
      </CardContent>
      <CardFooter className="shrink-0">
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              共 {total} 位患者入库 <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              {rangeText}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
