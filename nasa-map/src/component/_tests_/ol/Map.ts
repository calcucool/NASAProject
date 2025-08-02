export const mockAddControl = jest.fn();

export default jest.fn().mockImplementation(() => ({
    addControl: mockAddControl,
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    render: jest.fn(),
    getView: jest.fn(() => ({
        animate: jest.fn(),
        setCenter: jest.fn(),
        setZoom: jest.fn(),
    })),
    getViewport: jest.fn(() => ({ style: {} })),
}));