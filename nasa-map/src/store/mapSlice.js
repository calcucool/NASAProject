import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    selectedStyle: "trueColor",
    selectedDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    lastUpdated: null
};

const mapSlice = createSlice({
    name: "map",
    initialState,
    reducers: {
        setMapState: (state, action) => {
            state.selectedStyle = action.payload.selectedStyle;
            state.selectedDate = action.payload.selectedDate;
            state.lastUpdated = Date.now();
        },
        resetMapState: (state) => {
            state.selectedStyle = "trueColor";
            state.selectedDate = new Date(Date.now() - 86400000 * 2).toISOString();
            state.lastUpdated = null;
        }
    }
});

export const { setMapState, resetMapState } = mapSlice.actions;
export default mapSlice.reducer;
