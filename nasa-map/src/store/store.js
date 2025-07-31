import { configureStore } from "@reduxjs/toolkit";
import mapReducer from "./mapSlice";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";

const persistConfig = {
    key: "map",
    storage
};

const persistedMapReducer = persistReducer(persistConfig, mapReducer);

export const store = configureStore({
    reducer: {
        map: persistedMapReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    'persist/PERSIST',
                    'persist/REHYDRATE',
                    'persist/REGISTER'
                ],
            },
        }),
});

export const persistor = persistStore(store);
