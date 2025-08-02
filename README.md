# 🌍 NASA HLS World Viewer

**Live App:** [World View App](https://heartfelt-jalebi-6947b2.netlify.app/)

![NASA HLS World Viewer](./nasaImg.png)

A **React + TypeScript** web application for exploring NASA satellite imagery using two rendering engines: **OpenLayers** and **DeckGL**.

---

## Map Engines

This project features two parallel implementations, each accessible via a dedicated route:

- **OpenLayers** (`/openlayers`)  
  The full-featured, production-ready map viewer using OpenLayers, with NASA Harmonized Landsat Sentinel‑2 (HLS) imagery and all standard functionalities.

- **DeckGL** (`/deckgl`)  
  An alternative map viewer built with DeckGL. Currently supports VIIRS and MODIS imagery layers with core UI features like date and event selection.  
  *Note:* This implementation is a work in progress and does not yet have full feature parity with the OpenLayers version.

Users can switch between these two rendering engines via their respective routes for comparison or preference.

---

## OpenLayers Features

- **Date Selection**  
  Pick a date to reload NASA HLS WMTS imagery (defaults to two days before today).

- **Event Selection**  
  Choose events from a preloaded JSON file; the map pans and zooms smoothly to the event location with an animated pulse marker.

- **Style Switching**  
  Switch between available NASA GIBS styles:  
  - `OPERA L3 DYNAMIC`  
  - `HLS MGRS GRANULE`  
  - `HLS L30 NADIR`  
  - `HLS S30 NADIR`  
  - `OPERA L3 DIST-ALERT-HLS`  
  - `OPERA L3 DIST-ANN-HLS`

- **Layer Visibility Toggle**  
  Show or hide the HLS layer over the OSM base map.

- **Reset Button**  
  Resets date, style, visibility, and event selection to defaults, zooming back to the world view.

- **Toast Notifications**  
  Displays success or error messages when imagery tiles load or fail.

- **Custom Zoom Controls**  
  Large, user-friendly zoom buttons positioned at the bottom-left.

- **Responsive UI**  
  Built with **Material UI (MUI)** for dropdowns and controls, fully responsive across devices.

---

## DeckGL Features (Work in Progress)

- Supports date selection, event markers, and style switching UI similar to OpenLayers.
- Currently displays NASA VIIRS and MODIS satellite imagery layers instead of HLS.
- Basic layer visibility toggle and reset controls implemented.
- Actively being developed to add full HLS support and match OpenLayers functionality.

---

## TypeScript Migration

The project is being incrementally migrated from JavaScript to TypeScript for stronger type safety and maintainability.

- All `.js` and `.jsx` files are being renamed to `.ts` and `.tsx` respectively.  
- A `tsconfig.json` file has been added to configure TypeScript with React.  
- Type definitions (`@types/react`, `@types/react-dom`, `@types/redux`, `@types/react-redux`, `@types/ol`) are installed.  
- Migration is incremental — JavaScript files will continue working alongside TypeScript until fully converted (`"allowJs": true` in `tsconfig.json`).  
- Components and utilities are gradually receiving explicit type annotations.

---

## Tech Stack

- **React + TypeScript** — Frontend framework & type safety  
- **Redux Toolkit + React Redux** — State management & caching  
- **OpenLayers** — Primary map rendering engine  
- **DeckGL** — Secondary map rendering engine (work in progress)  
- **NASA GIBS WMTS** — Imagery source  
- **Material UI (MUI)** — UI components  
- **React DatePicker** — Date selection  
- **React Toastify** — Notifications  
- **Jest + React Testing Library** — Unit testing  
- **Docker** — Containerized production deployment  

---

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/calcucool/NASAProject.git
cd nasa-map
npm install
```

## Running the Application

```bash
npm start
```

## Once the server starts, open in your browser:

```bash
http://localhost:3000
```

## Running Tests
```bash
npm test -- WorldViewOpenLayers
```

## Docker Deployment  

The application can be built and deployed using Docker for production hosting.

### **Build the Docker Image**
```bash
docker build -t nasa-map
```
