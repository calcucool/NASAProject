import { configureStore } from "@reduxjs/toolkit";
import mapReducer from "./mapSlice";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore, PersistConfig } from "redux-persist";

// Persist config type
const persistConfig: PersistConfig<ReturnType<typeof mapReducer>> = {
    key: "map",
    storage,
};

// Create persisted reducer
const persistedMapReducer = persistReducer(persistConfig, mapReducer);

// Configure store
export const store = configureStore({
    reducer: {
        map: persistedMapReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    "persist/PERSIST",
                    "persist/REHYDRATE",
                    "persist/REGISTER",
                ],
            },
        }),
});

// Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
