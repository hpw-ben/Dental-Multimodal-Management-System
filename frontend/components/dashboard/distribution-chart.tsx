"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { DistributionItem } from "@/lib/api/dashboard";

/**
 * 预定义的颜色列表
 */
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface DistributionChartProps {
  data?: DistributionItem[];
  isLoading?: boolean;
}

export function DistributionChart({ data = [], isLoading = false }: DistributionChartProps) {
  // 动态生成 chartConfig 和 chartData
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      count: { label: "患者数" },
    };
    data.forEach((item, index) => {
      const key = `item_${index}`;
      config[key] = {
        label: item.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
    return config;
  }, [data]);

  const chartData = React.useMemo(() => {
    return data.map((item, index) => ({
      name: `item_${index}`,
      displayName: item.name,
      count: item.count,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [data]);

  const total = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0)
  }, [chartData])

  // 找出最多的诊断
  const topDiagnosis = data.length > 0
    ? data.reduce((max, item) => item.count > max.count ? item : max, data[0])
    : null;

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="shrink-0 items-center pb-2">
        <CardTitle>全库患者分布</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 pb-2">
        {isLoading ? (
          <div className="flex h-full min-h-[180px] w-full items-center justify-center text-sm text-muted-foreground">加载中...</div>
        ) : chartData.length > 0 ? (
          <div className="flex h-full min-h-[180px] w-full items-center justify-center">
            <ChartContainer
              config={chartConfig}
              className="h-full min-h-0 w-full flex-1 aspect-auto"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="88%"
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-[clamp(1.375rem,3vw,2.5rem)] font-bold"
                            >
                              {total.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 30}
                              className="fill-muted-foreground text-[clamp(0.6875rem,1.2vw,0.8125rem)]"
                            >
                              总患者数
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-full min-h-[180px] w-full items-center justify-center text-sm text-muted-foreground">
            暂无诊断数据
          </div>
        )}
      </CardContent>
      <CardFooter className="shrink-0 flex-col gap-2 text-sm">
        {topDiagnosis && (
          <div className="flex items-center gap-2 font-medium leading-none">
            「{topDiagnosis.name}」占比最高 ({total > 0 ? Math.round(topDiagnosis.count / total * 100) : 0}%)
          </div>
        )}
        <div className="leading-none text-muted-foreground">
          基于多模态数据库的实时统计
        </div>
      </CardFooter>
    </Card>
  )
}
