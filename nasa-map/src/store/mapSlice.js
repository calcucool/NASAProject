import { createSlice } from "@reduxjs/toolkit";

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

const initialState = {
    layersByDate: {},    // Cached WMTS config per date
    layerVisible: true,  // Persisted visibility toggle
    styleOptions: {}     // Persisted Styles
};

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
        cacheLayersForDate: (state, action) => {
            const { date, styleKey, wmtsLayers, lastUpdated } = action.payload;
            state.layersByDate[date] = { styleKey, wmtsLayers, lastUpdated };
        },
        setLayerVisible: (state, action) => {
            state.layerVisible = action.payload;
        },
        setStyleOptions: (state, action) => {
            state.styleOptions = action.payload;
        }
    }
});

export const { initializeMapState, cacheLayersForDate, setLayerVisible, setStyleOptions } = mapSlice.actions;
export default mapSlice.reducer;
