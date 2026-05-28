'use client';

/**
 * TanStack Query Provider
 * 配置 React Query 客户端并包装应用
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // 使用 useState 确保每个客户端实例独立
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 错误时不自动重试
            retry: false,
            // 窗口聚焦时不自动重新获取
            refetchOnWindowFocus: false,
            // 数据过期时间 5 分钟
            staleTime: 5 * 60 * 1000,
          },
          mutations: {
            // 错误时不自动重试
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
