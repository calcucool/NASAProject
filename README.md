# 🌍 NASA HLS Map Viewer

A React + OpenLayers web application for exploring NASA Harmonized Landsat Sentinel-2 (HLS) WMTS imagery from the Global Imagery Browse Services (GIBS).  
Supports date selection, event navigation from a JSON dataset, style switching (True Color, False Color, Night Band), and layer toggling.

---

## Features

- **NASA GIBS WMTS Integration**
  - Loads HLS imagery via WMTS from NASA Worldview.
  - True Color, False Color, and Night Band supported.
- **Date Picker**
  - Select a specific date to load imagery for that day.
- **Event Selection**
  - Loads large JSON of events with coordinates.
  - Pans and zooms to selected event with animated pulse marker.
- **Style Switching**
  - Switch between predefined NASA layers.
- **Layer Visibility Toggle**
  - Show/hide the imagery layer with a checkbox.
- **Custom Zoom Controls**
  - Large zoom buttons positioned bottom-left.
- **Responsive UI**
  - Styled with Material UI (MUI) for dropdowns and controls.

---

## Tech Stack

- **React** (frontend framework)
- **OpenLayers** (map rendering)
- **NASA GIBS WMTS** (imagery source)
- **Material UI (MUI)** (UI components)
- **React DatePicker** (date selection)
- **React Toastify** (notifications)

---

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/calcucool/NASAProject.git
cd nasa-hls-map
npm install
npm start
```

Once the server starts, navigate to: 

```bash
npm start
```
