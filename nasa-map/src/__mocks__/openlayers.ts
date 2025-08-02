// src/__mocks__/openlayers.js
const mockAddControl = jest.fn();

export const mockMapInstance = {
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    addControl: mockAddControl,
    render: jest.fn(),
    getView: jest.fn(() => ({
        animate: jest.fn(),
        setCenter: jest.fn(),
        setZoom: jest.fn(),
    })),
    getViewport: jest.fn(() => ({
        style: {},
    })),
};

jest.mock("ol/Map", () => {
    return jest.fn().mockImplementation(() => mockMapInstance);
});

jest.mock("ol/control/Zoom", () => jest.fn(() => ({})));
jest.mock("ol/View", () => jest.fn());
jest.mock("ol/layer/Tile", () => jest.fn());
jest.mock("ol/source/OSM", () => jest.fn());
jest.mock("ol/source/WMTS", () => jest.fn());
jest.mock("ol/tilegrid/WMTS", () => jest.fn());

export { mockAddControl };
