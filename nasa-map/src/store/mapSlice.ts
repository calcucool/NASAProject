import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

// Types for Layer cache entry
export interface LayerCacheEntry {
    styleKey: string;
    wmtsLayers: { styleKey: string; time: string }[];
    lastUpdated: number;
}

// Slice state type
export interface MapState {
    layersByDate: Record<string, LayerCacheEntry>;
    layerVisible: boolean;
    styleOptions: Record<string, string>;
}

// Initial state
const initialState: MapState = {
    layersByDate: {},
    layerVisible: true,
    styleOptions: {},
};

// Slice
const mapSlice = createSlice({
    name: "map",
    initialState,
    reducers: {
        initializeMapState: (state) => {
            const now = Date.now();
            for (const date in state.layersByDate) {
                if (now - state.layersByDate[date].lastUpdated > SIX_DAYS_MS) {
                    delete state.layersByDate[date];
                }
            }
        },
        cacheLayersForDate: (
            state,
            action: PayloadAction<{
                date: string;
                styleKey: string;
                wmtsLayers: { styleKey: string; time: string }[];
                lastUpdated: number;
            }>
        ) => {
            const { date, styleKey, wmtsLayers, lastUpdated } = action.payload;
            state.layersByDate[date] = { styleKey, wmtsLayers, lastUpdated };
        },
        setLayerVisible: (state, action: PayloadAction<boolean>) => {
            state.layerVisible = action.payload;
        },
        setStyleOptions: (state, action: PayloadAction<Record<string, string>>) => {
            state.styleOptions = action.payload;
        },
    },
});

// Export actions & reducer
export const { initializeMapState, cacheLayersForDate, setLayerVisible, setStyleOptions } = mapSlice.actions;
export default mapSlice.reducer;
