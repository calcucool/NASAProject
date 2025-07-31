
# 🌍 NASA HLS World Viewer

🚀 **Live App**: [World View App](https://heartfelt-jalebi-6947b2.netlify.app/)

![NASA HLS World Viewer](./nasaImg.png)

A **React + OpenLayers + Redux** web application for exploring **NASA Harmonized Landsat Sentinel‑2 (HLS)** WMTS imagery from the **Global Imagery Browse Services (GIBS)**.

Supports:
- **Date selection** with live WMTS imagery updates  
- **Event navigation** from a JSON dataset with smooth panning and pulse markers  
- **Style switching** (True Color, False Color, Night Band, and other GIBS styles)  
- **Layer toggling** (HLS ↔ OSM)  
- **Reset control** to return the map to default settings  
- **Toast notifications** for layer load success/failure  

---

## Features

### NASA GIBS WMTS Integration
- Connects to the NASA Worldview WMTS endpoint.
- Loads **HLS S30/L30** and **OPERA L3** layers dynamically.
- Automatically parses NASA style identifiers from GetCapabilities.

### Redux State Persistence
- Caches:
  - Selected style
  - Selected date
  - Layer visibility  
- Cache refreshes automatically if older than **6 days**.

### Date Selection
- Pick a specific date to load imagery for that day.
- Automatically fetches the corresponding **HLS WMTS layer**.

### Event Selection
- Loads a large JSON dataset of events with coordinates.
- Smoothly pans and zooms to the selected event.
- Displays an **animated pulse marker** at the event location.

### Style Switching
- Switch between **True Color, False Color, Night Band**, and other NASA styles.
- Maps display names to correct WMTS identifiers automatically.

### Layer Visibility Toggle
- Toggle HLS imagery on/off.
- Switch between **HLS imagery** and **OSM base map** instantly.

### Reset Control
Resets the map to:
- **Date** → Two days before today  
- **Event selection** → None  
- **Style** → `HLS S30 NADIR`  
- **Layer visibility** → `true`  
- **Zoom** → World view  

### Toast Notifications
- **Success toast** when layers load successfully.
- **Error toast** if more than **50% of tiles fail** to load.

### Custom Zoom Controls
- Large, easy-to-use zoom buttons positioned at the **bottom-left**.

### Responsive UI
- Built with **Material UI (MUI)** for dropdowns and controls.
- Fully responsive across devices.

---

## Tech Stack

- **React** – Frontend framework  
- **Redux Toolkit + React Redux** – State management & caching  
- **OpenLayers** – Map rendering  
- **NASA GIBS WMTS** – Imagery source  
- **Material UI (MUI)** – UI components  
- **React DatePicker** – Date selection  
- **React Toastify** – Notifications  
- **Jest + React Testing Library** – Unit testing  

---

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

## Running Tests
```bash
npm test -- WorldView
```
