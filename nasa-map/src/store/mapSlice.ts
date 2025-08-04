import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

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

const mapSlice = createSlice({
    name: "map",
    initialState,
    reducers: {
        initializeMapState: (state) => {
            const now = Date.now();

            // Remove entries older than 6 days
            for (const key in state.layersByDate) {
                if (now - state.layersByDate[key].lastUpdated > SIX_DAYS_MS) {
                    delete state.layersByDate[key];
                }
            }

            // Parse ranges into objects for merging (handle old single-date keys)
            const parsedRanges = Object.keys(state.layersByDate)
                .map(key => {
                    let [start, end] = key.split("_");

                    // Auto-convert single-date keys to start=end
                    if (!end) {
                        end = start;
                    }

                    const startDate = new Date(start);
                    const endDate = new Date(end);

                    // Skip invalid keys
                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                        console.warn(`Skipping invalid cache key: ${key}`);
                        delete state.layersByDate[key];
                        return null;
                    }

                    return {
                        key,
                        start: startDate.getTime(),
                        end: endDate.getTime(),
                        lastUpdated: state.layersByDate[key].lastUpdated,
                        entry: state.layersByDate[key]
                    };
                })
                .filter(Boolean) as {
                    key: string;
                    start: number;
                    end: number;
                    lastUpdated: number;
                    entry: LayerCacheEntry;
                }[];

            // Sort ranges by start date
            parsedRanges.sort((a, b) => a.start - b.start);

            const mergedRanges: typeof parsedRanges = [];

            // Merge overlapping ranges
            for (const range of parsedRanges) {
                if (
                    mergedRanges.length > 0 &&
                    range.start <= mergedRanges[mergedRanges.length - 1].end
                ) {
                    const last = mergedRanges[mergedRanges.length - 1];

                    // Merge date boundaries
                    last.end = Math.max(last.end, range.end);

                    // Keep most recent data
                    if (range.lastUpdated > last.lastUpdated) {
                        last.lastUpdated = range.lastUpdated;
                        last.entry = range.entry;
                    }
                } else {
                    mergedRanges.push({ ...range });
                }
            }

            // Rebuild layersByDate from merged ranges
            state.layersByDate = {};
            for (const r of mergedRanges) {
                const mergedKey = `${new Date(r.start).toISOString()}_${new Date(r.end).toISOString()}`;
                state.layersByDate[mergedKey] = {
                    ...r.entry,
                    lastUpdated: r.lastUpdated
                };
            }

            // Enforce cache size limit (keep newest)
            let keys = Object.keys(state.layersByDate);
            if (keys.length > MAX_CACHE_ENTRIES) {
                keys.sort((a, b) =>
                    state.layersByDate[b].lastUpdated - state.layersByDate[a].lastUpdated
                );
                keys = keys.slice(0, MAX_CACHE_ENTRIES);

                const trimmed: Record<string, LayerCacheEntry> = {};
                keys.forEach(k => (trimmed[k] = state.layersByDate[k]));
                state.layersByDate = trimmed;
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

export const { initializeMapState, cacheLayersForDate, setLayerVisible, setStyleOptions } = mapSlice.actions;
export default mapSlice.reducer;
