import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import configureMockStore from "redux-mock-store";
import { thunk } from "redux-thunk";
import WorldView from "../WorldView";
import { setLayerVisible } from "../../store/mapSlice";
import { mockAddControl } from "../../__mocks__/openlayers";

const mockStore = configureMockStore([thunk]);

describe("🌍 WorldView Component", () => {
    let store;

    beforeEach(() => {
        store = mockStore({
            map: {
                layersByDate: {},
                layerVisible: true,
                styleOptions: { "HLS S30 NADIR": "HLS_S30_NADIR" },
            },
        });
        mockAddControl.mockClear();
    });

    test("Reset button dispatches setLayerVisible", async () => {
        render(
            <Provider store={store}>
                <WorldView />
            </Provider>
        );

        fireEvent.click(screen.getByRole("button", { name: /Reset/i }));

        await waitFor(() => {
            const actions = store.getActions();
            expect(actions.some(a => a.type === setLayerVisible.type)).toBe(true);
        });
    });

    test("Layer visibility toggle dispatches setLayerVisible", async () => {
        render(
            <Provider store={store}>
                <WorldView />
            </Provider>
        );

        fireEvent.click(screen.getByRole("checkbox"));

        await waitFor(() => {
            const actions = store.getActions();
            expect(actions.some(a => a.type === setLayerVisible.type)).toBe(true);
        });
    });

});
