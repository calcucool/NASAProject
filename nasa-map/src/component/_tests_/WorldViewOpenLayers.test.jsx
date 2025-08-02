

// Now import your component normally
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import configureMockStore, { MockStoreEnhanced } from "redux-mock-store";
import { ThunkMiddleware } from "redux-thunk";
import thunk from "redux-thunk";
import { AnyAction } from "redux";
import { RootState } from "../../store";
import WorldViewOpenLayers from "../WorldViewOpenLayers";
import { setLayerVisible } from "../../store/mapSlice";
import mockAddControl from "ol/Map";



jest.mock("ol/control/Zoom");
jest.mock("ol/View");
jest.mock("ol/layer/Tile");
jest.mock("ol/source/OSM");
jest.mock("ol/source/WMTS");
jest.mock("ol/tilegrid/WMTS");
jest.mock("ol/Map");

const mockStore = configureMockStore < RootState, ThunkMiddleware<RootState, AnyAction>> ([
    thunk as ThunkMiddleware<RootState, AnyAction>
]);

describe("WorldViewOpenLayers Component", () => {
    let store: MockStoreEnhanced<RootState, AnyAction>;

    beforeEach(() => {
        store = mockStore({
            map: {
                layersByDate: {},
                layerVisible: true,
                styleOptions: { "HLS S30 NADIR": "HLS_S30_NADIR" },
                _persist: { version: -1, rehydrated: true },
            },
        });
        mockAddControl.mockClear();
    });

    test("Reset button dispatches setLayerVisible", async () => {
        render(
            <Provider store={store} >
                <WorldViewOpenLayers />
            </Provider>
        );

        fireEvent.click(screen.getByRole("button", { name: /Reset/i }));

        await waitFor(() => {
            const actions = store.getActions();
            expect(actions.some((a: AnyAction) => a.type === setLayerVisible.type)).toBe(true);
        });
    });

    test("Layer visibility toggle dispatches setLayerVisible", async () => {
        render(
            <Provider store={store} >
                <WorldViewOpenLayers />
            </Provider>
        );

        fireEvent.click(screen.getByRole("checkbox"));

        await waitFor(() => {
            const actions = store.getActions();
            expect(actions.some((a: AnyAction) => a.type === setLayerVisible.type)).toBe(true);
        });
    });
});
