import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

export interface UndoableAction {
  id: string;
  name: string;
  timestamp?: string;
  category?: 'stock' | 'location' | 'kit' | 'item' | 'price' | 'general';
  details?: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
}

interface UndoRedoContextType {
  past: UndoableAction[];
  future: UndoableAction[];
  addAction: (action: UndoableAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  undoMultiple: (count: number) => Promise<void>;
  redoMultiple: (count: number) => Promise<void>;
  undoSpecificAction: (actionId: string) => Promise<void>;
  undoBatch: (actionIds: string[]) => Promise<void>;
  rollbackTo: (actionIndex: number) => Promise<void>;
  clearHistory: () => void;
  isProcessing: boolean;
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined);

export const UndoRedoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [past, setPast] = useState<UndoableAction[]>([]);
  const [future, setFuture] = useState<UndoableAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addAction = useCallback((action: UndoableAction) => {
    const enrichedAction: UndoableAction = {
      ...action,
      id: action.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: action.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setPast((prev) => [...prev, enrichedAction]);
    setFuture([]); // clear redo future on new forward action
  }, []);

  // 1. Single Undo
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

  // 2. Single Redo
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

  // 3. Batch Undo (Multiple steps)
  const undoMultiple = useCallback(async (count: number) => {
    if (past.length === 0 || isProcessing || count <= 0) return;
    setIsProcessing(true);

    const actualCount = Math.min(count, past.length);
    const actionsToUndo = past.slice(past.length - actualCount).reverse();
    const remainingPast = past.slice(0, past.length - actualCount);
    const undoneList: UndoableAction[] = [];

    try {
      for (const action of actionsToUndo) {
        await action.undo();
        undoneList.push(action);
      }
      setPast(remainingPast);
      setFuture((prev) => [...actionsToUndo, ...prev]);
    } catch (e) {
      console.error('Failed in undoMultiple:', e);
      alert(`Batch Undo failed: ${e}`);
    } finally {
      setIsProcessing(false);
    }
  }, [past, isProcessing]);

  // 4. Batch Redo (Multiple steps forward)
  const redoMultiple = useCallback(async (count: number) => {
    if (future.length === 0 || isProcessing || count <= 0) return;
    setIsProcessing(true);

    const actualCount = Math.min(count, future.length);
    const actionsToRedo = future.slice(0, actualCount);
    const remainingFuture = future.slice(actualCount);

    try {
      for (const action of actionsToRedo) {
        await action.redo();
      }
      setFuture(remainingFuture);
      setPast((prev) => [...prev, ...actionsToRedo]);
    } catch (e) {
      console.error('Failed in redoMultiple:', e);
      alert(`Batch Redo failed: ${e}`);
    } finally {
      setIsProcessing(false);
    }
  }, [future, isProcessing]);

  // 5. Undo Specific Individual Action from the stack
  const undoSpecificAction = useCallback(async (actionId: string) => {
    if (isProcessing) return;
    const targetIdx = past.findIndex(a => a.id === actionId);
    if (targetIdx === -1) return;

    setIsProcessing(true);
    const targetAction = past[targetIdx];
    try {
      await targetAction.undo();
      setPast(prev => prev.filter(a => a.id !== actionId));
      setFuture(prev => [targetAction, ...prev]);
    } catch (e) {
      console.error(`Failed to undo specific action ${targetAction.name}:`, e);
      alert(`Revert failed: ${e}`);
    } finally {
      setIsProcessing(false);
    }
  }, [past, isProcessing]);

  // 6. Undo Selected Batch
  const undoBatch = useCallback(async (actionIds: string[]) => {
    if (actionIds.length === 0 || isProcessing) return;
    setIsProcessing(true);

    const targetSet = new Set(actionIds);
    const actionsToUndo = past.filter(a => targetSet.has(a.id)).reverse();

    try {
      for (const action of actionsToUndo) {
        await action.undo();
      }
      setPast(prev => prev.filter(a => !targetSet.has(a.id)));
      setFuture(prev => [...actionsToUndo, ...prev]);
    } catch (e) {
      console.error('Failed in undoBatch:', e);
      alert(`Batch Revert failed: ${e}`);
    } finally {
      setIsProcessing(false);
    }
  }, [past, isProcessing]);

  // 7. Rollback to Point in Time (Undo all actions after index)
  const rollbackTo = useCallback(async (actionIndex: number) => {
    if (actionIndex < 0 || actionIndex >= past.length || isProcessing) return;
    const actionsToUndoCount = past.length - (actionIndex + 1);
    if (actionsToUndoCount <= 0) return;
    await undoMultiple(actionsToUndoCount);
  }, [past, undoMultiple, isProcessing]);

  // 8. Clear History
  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

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
    <UndoRedoContext.Provider
      value={{
        past,
        future,
        addAction,
        undo,
        redo,
        undoMultiple,
        redoMultiple,
        undoSpecificAction,
        undoBatch,
        rollbackTo,
        clearHistory,
        isProcessing,
      }}
    >
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
