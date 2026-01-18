import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface SelectionContextType {
    selectedIds: string[];
    hoveredId: string | null;
    anchorId: string | null;
    setHover: (id: string | null) => void;
    clearSelection: () => void;
    setSelection: (ids: string[], anchorId?: string | null) => void;
    selectSingle: (id: string) => void;
    toggleSelection: (id: string) => void;
    rangeSelect: (id: string, orderedIds: string[]) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [anchorId, setAnchorId] = useState<string | null>(null);

    const setHover = useCallback((id: string | null) => {
        setHoveredId(id);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds([]);
        setAnchorId(null);
    }, []);

    const setSelection = useCallback((ids: string[], nextAnchorId: string | null = null) => {
        const uniqueIds = Array.from(new Set(ids));
        setSelectedIds(uniqueIds);
        setAnchorId(nextAnchorId);
    }, []);

    const selectSingle = useCallback((id: string) => {
        setSelectedIds([id]);
        setAnchorId(id);
    }, []);

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const hasId = prev.includes(id);
            const next = hasId ? prev.filter(item => item !== id) : [...prev, id];
            setAnchorId(hasId ? next[0] ?? null : id);
            return next;
        });
    }, []);

    const rangeSelect = useCallback((id: string, orderedIds: string[]) => {
        if (!anchorId) {
            selectSingle(id);
            return;
        }
        const startIndex = orderedIds.indexOf(anchorId);
        const endIndex = orderedIds.indexOf(id);
        if (startIndex === -1 || endIndex === -1) {
            selectSingle(id);
            return;
        }
        const [start, end] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        const range = orderedIds.slice(start, end + 1);
        setSelectedIds(range);
        setAnchorId(id);
    }, [anchorId, selectSingle]);

    const value = useMemo(() => ({
        selectedIds,
        hoveredId,
        anchorId,
        setHover,
        clearSelection,
        setSelection,
        selectSingle,
        toggleSelection,
        rangeSelect
    }), [selectedIds, hoveredId, anchorId, setHover, clearSelection, setSelection, selectSingle, toggleSelection, rangeSelect]);

    return (
        <SelectionContext.Provider value={value}>
            {children}
        </SelectionContext.Provider>
    );
};

export const useSelection = () => {
    const context = useContext(SelectionContext);
    if (context === undefined) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
};
