import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AppState {
  sidebarOpen: boolean;
  selectedClienteId: string | null;
}

interface AppContextType {
  state: AppState;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedClienteId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    sidebarOpen: true,
    selectedClienteId: null,
  });

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const setSidebarOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, sidebarOpen: open }));
  }, []);

  const setSelectedClienteId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedClienteId: id }));
  }, []);

  return (
    <AppContext.Provider value={{ state, toggleSidebar, setSidebarOpen, setSelectedClienteId }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
