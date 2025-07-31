# 🌍 NASA HLS Map Viewer

![NASA HLS Map Viewer](./nasaImg.png)

A **React + OpenLayers + Redux** web application for exploring **NASA Harmonized Landsat Sentinel‑2 (HLS)** WMTS imagery from the **Global Imagery Browse Services (GIBS)**.

Supports:
- Date selection with live WMTS imagery updates  
- Event navigation from a JSON dataset with smooth panning and pulse markers  
- Style switching (True Color, False Color, Night Band, and other GIBS styles)  
- Layer toggling (HLS ↔ OSM)  
- **Reset control** to return the map to default settings  
- Toast notifications for layer load success/failure  

---

## Features

### NASA GIBS WMTS Integration
- Connects to the NASA Worldview WMTS endpoint.
- Loads **HLS S30/L30** and **OPERA L3** layers dynamically.
- Automatically handles NASA style identifiers from GetCapabilities.

### Redux State Persistence
- Caches layer style, selected date, and layer visibility in Redux.
- Cached imagery is refreshed if older than **6 days**.

### Date Selection
- Select a specific date to load imagery for that day.
- Automatically fetches the corresponding **HLS WMTS layer** for the chosen date.

### Event Selection
- Loads a large JSON dataset of events with coordinates.
- Smoothly pans and zooms to the selected event.
- Displays an **animated pulse marker** at the event location.

### Style Switching
- Switch between **True Color, False Color, Night Band**, and other NASA styles.
- Automatically maps style keys to correct WMTS identifiers.

### Layer Visibility Toggle
- Toggle the HLS imagery layer on/off.
- Switch between **HLS imagery** and **OSM base map**.

### Reset Control
- Resets:
  - Date to default (two days before today)
  - Event selection to none
  - Style to `HLS S30 NADIR`
  - Layer visibility to **true**
- Resets zoom to world view.

### Toast Notifications
- Displays success or error toasts when loading layers.
- Shows warnings if more than **50% of tiles fail** to load.

### Custom Zoom Controls
- Large, custom-positioned zoom buttons at bottom-left of the map.

### Responsive UI
- Built with **Material UI (MUI)** for dropdowns, sliders, and controls.
- Works across screen sizes.

---

## Tech Stack

- **React** – Frontend framework  
- **Redux Toolkit + React Redux** – State persistence & caching logic  
- **OpenLayers** – Map rendering engine  
- **NASA GIBS WMTS** – Imagery source  
- **Material UI (MUI)** – UI components  
- **React DatePicker** – Date selection component  
- **React Toastify** – Notifications  

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/calcucool/NASAProject.git
cd nasa-hls-map
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

