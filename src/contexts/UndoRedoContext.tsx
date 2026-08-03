import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

export interface UndoableAction {
  id: string;
  name: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
}

interface UndoRedoContextType {
  past: UndoableAction[];
  future: UndoableAction[];
  addAction: (action: UndoableAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  isProcessing: boolean;
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined);

export const UndoRedoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [past, setPast] = useState<UndoableAction[]>([]);
  const [future, setFuture] = useState<UndoableAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addAction = useCallback((action: UndoableAction) => {
    setPast((prev) => [...prev, action]);
    setFuture([]); // clear future on new action
  }, []);

  const undo = useCallback(async () => {
    if (past.length === 0 || isProcessing) return;
    setIsProcessing(true);
    
    const action = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    try {
      await action.undo();
      setPast(newPast);
      setFuture((prev) => [action, ...prev]);
    } catch (e) {
      console.error(`Failed to undo action ${action.name}:`, e);
      alert(`Undo failed: ${e}`);
    } finally {
      setIsProcessing(false);
    }
  }, [past, isProcessing]);

  const redo = useCallback(async () => {
    if (future.length === 0 || isProcessing) return;
    setIsProcessing(true);
    
    const action = future[0];
    const newFuture = future.slice(1);
    
    try {
      await action.redo();
      setFuture(newFuture);
      setPast((prev) => [...prev, action]);
    } catch (e) {
      console.error(`Failed to redo action ${action.name}:`, e);
      alert(`Redo failed: ${e}`);
    } finally {
      setIsProcessing(false);
    }
  }, [future, isProcessing]);

  // Handle global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <UndoRedoContext.Provider value={{ past, future, addAction, undo, redo, isProcessing }}>
      {children}
    </UndoRedoContext.Provider>
  );
};

export const useUndoRedo = () => {
  const context = useContext(UndoRedoContext);
  if (context === undefined) {
    throw new Error('useUndoRedo must be used within an UndoRedoProvider');
  }
  return context;
};
