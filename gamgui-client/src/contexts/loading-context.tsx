import { createContext, use, useCallback, useMemo, useState } from "react";

type LoadingState = {
  login: boolean;
  navigation: boolean;
  general: boolean;
};

type LoadingContextType = {
  loading: LoadingState;
  setLoading: (key: keyof LoadingState, value: boolean) => void;
  isAnyLoading: boolean;
};

const DEFAULT_LOADING_STATE: LoadingState = {
  login: false,
  navigation: false,
  general: false,
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoadingState] = useState<LoadingState>(DEFAULT_LOADING_STATE);

  const setLoading = useCallback((key: keyof LoadingState, value: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const isAnyLoading = useMemo(() => {
    return Object.values(loading).some(Boolean);
  }, [loading]);

  const contextValue = useMemo(
    () => ({
      loading,
      setLoading,
      isAnyLoading,
    }),
    [loading, setLoading, isAnyLoading],
  );

  return (
    <LoadingContext value={contextValue}>
      {children}
    </LoadingContext>
  );
};

export function useLoading() {
  const context = use(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}
