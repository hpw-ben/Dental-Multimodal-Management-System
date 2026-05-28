/**
 * 认证状态管理 Store
 * 使用 Zustand 管理用户登录状态，支持持久化
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import type { User } from '@/lib/api/auth';

interface AuthState {
  // 用户信息
  user: User | null;
  // 是否已认证
  isAuthenticated: boolean;
  // 是否记住登录状态
  rememberMe: boolean;
  
  // Actions
  setUser: (user: User) => void;
  clearUser: () => void;
  setRememberMe: (remember: boolean) => void;
}

/**
 * 认证 Store
 * 使用 persist 中间件将状态持久化到 localStorage
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      rememberMe: false,

      setUser: (user: User) => 
        set({ user, isAuthenticated: true }),

      clearUser: () => 
        set({ user: null, isAuthenticated: false }),

      setRememberMe: (remember: boolean) => 
        set({ rememberMe: remember }),
    }),
    {
      name: 'rdms-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // 只持久化这些字段
      partialize: (state) => ({
        user: state.rememberMe ? state.user : null,
        isAuthenticated: state.rememberMe ? state.isAuthenticated : false,
        rememberMe: state.rememberMe,
      }),
    }
  )
);

/**
 * 追踪 auth-store 的 persist 水合状态
 * 在水合完成前返回 false，防止角色判断 UI 闪现
 *
 * 使用惰性初始值捕获初始水合状态，effect 仅用于订阅后续变更事件。
 */
export const useAuthHydration = (): boolean => {
  const [hydrated, setHydrated] = useState(
    // 惰性读取：组件首次渲染时 localStorage 水合通常已完成
    () => useAuthStore.persist.hasHydrated()
  );

  useEffect(() => {
    // effect 只负责事件订阅，不在 body 内直接 setState
    const unsubHydrate = useAuthStore.persist.onHydrate(() => setHydrated(false));
    const unsubFinish = useAuthStore.persist.onFinishHydration(() => setHydrated(true));

    return () => {
      unsubHydrate();
      unsubFinish();
    };
  }, []);

  return hydrated;
};
