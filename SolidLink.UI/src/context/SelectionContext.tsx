import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SelectionContextType {
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    hoveredId: string | null;
    setHoveredId: (id: string | null) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    return (
        <SelectionContext.Provider value={{ selectedId, setSelectedId, hoveredId, setHoveredId }}>
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
