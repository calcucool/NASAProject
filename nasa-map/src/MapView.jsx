import React, { useEffect, useState, useRef, useMemo } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import { fromLonLat } from "ol/proj";

import Zoom from "ol/control/Zoom";

import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";

import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import WMTS from "ol/source/WMTS";

import WMTSTileGrid from "ol/tilegrid/WMTS";
import { get as getProjection } from "ol/proj";
import { getTopLeft, getWidth } from "ol/extent";

import Feature from "ol/Feature";
import Point from "ol/geom/Point";

import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ListSubheader, Tooltip } from "@mui/material";

import events from "./preloaded_events.json";
import "./MapView.css";
import { FormControl, InputLabel, Select, MenuItem, Switch, Box } from "@mui/material";

const TOAST_COOLDOWN = 5000;

const MapView = () => {

    const [selectedDate, setSelectedDate] = useState(new Date(Date.now() - 86400000 * 2));
    const [loading, setLoading] = useState(false);
    const [selectedEventIdx, setSelectedEventIdx] = useState("");
    const [layerVisible, setLayerVisible] = useState(true);
    const [selectedStyle, setSelectedStyle] = useState("trueColor");

    const mapRef = useRef(null);
    const hlsLayerRef = useRef([]);
    const osmLayerRef = useRef(null);
    const markerLayerRef = useRef(null);
    const pulseLayerRef = useRef(null);

    const lastToastTime = useRef(0);
    const lastToastType = useRef(null);

    const layerOptions = {
        trueColor: "HLS_S30_Nadir_BRDF_Adjusted_Reflectance",
        falseColor: "HLS_L30_Nadir_BRDF_Adjusted_Reflectance",
    };

    const groupedEvents = useMemo(() => {
        return Object.entries(
            events.reduce((acc, ev, idx) => {
                const type = ev.event_type || "Other";
                if (!acc[type]) acc[type] = [];
                acc[type].push({ idx, ev });
                return acc;
            }, {})
        );
    }, []);

    const createHLSLayerForDate = (styleKey, date) => {
        const proj = getProjection("EPSG:4326");
        const extent = proj.getExtent();
        const size = getWidth(extent) / 256;
        const resolutions = [], matrixIds = [];
        for (let z = 0; z <= 14; z++) {
            resolutions[z] = size / Math.pow(2, z);
            matrixIds[z] = z;
        }

        return new TileLayer({
            source: new WMTS({
                url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi",
                layer: layerOptions[styleKey],
                style: "default",
                matrixSet: "31.25m",
                format: "image/png",
                projection: proj,
                tileGrid: new WMTSTileGrid({
                    origin: getTopLeft(extent),
                    resolutions,
                    matrixIds
                }),
                dimensions: { TIME: date.toISOString().split("T")[0] },
                wrapX: true
            }),
            opacity: 0.8,
            visible: layerVisible
        });
    };

    useEffect(() => {
        setLoading(true);

        const osmLayer = new TileLayer({
            source: new OSM(),
            zIndex: 0,
            visible: !layerVisible
        });
        osmLayerRef.current = osmLayer;

        const mapInstance = new Map({
            target: "map",
            layers: [osmLayer], // Start with just OSM
            view: new View({
                projection: "EPSG:4326",
                center: [0, 0],
                zoom: 0
            }),
            controls: []
        });

        mapInstance.addControl(new Zoom({ className: "custom-zoom" }));

        mapRef.current = mapInstance;

        updateLayer(selectedStyle, selectedDate);

        mapInstance.getViewport().style.backgroundColor = "#5385c2ff"; // Deep Ocean Blue

        setTimeout(() => setLoading(false), 1000);

    }, []);



    const triggerToast = (type, message) => {
        const now = Date.now();
        if (type === lastToastType.current && now - lastToastTime.current < TOAST_COOLDOWN) return;
        if (type !== lastToastType.current) toast.dismiss();
        toast[type](message, { position: "bottom-right", autoClose: 3000 });
        lastToastTime.current = now;
        lastToastType.current = type;
    };

    const updateLayer = (styleKey, date) => {
        if (!mapRef.current) return;

        if (hlsLayerRef.current.length === 0) {
            for (let i = 0; i < 10; i++) {
                const day = new Date(date);
                day.setDate(date.getDate() - i);
                const hlsLayer = createHLSLayerForDate(styleKey, day);
                mapRef.current.addLayer(hlsLayer);
                hlsLayerRef.current.push(hlsLayer);
            }
        } else {
            hlsLayerRef.current.forEach((layer, i) => {
                const day = new Date(date);
                day.setDate(date.getDate() - i);

                layer.setSource(new WMTS({
                    url: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?TIME=${day.toISOString().split("T")[0]}&v=${Date.now()}`, // cache-busting
                    layer: layerOptions[styleKey],
                    style: "default",
                    matrixSet: "31.25m",
                    format: "image/png",
                    projection: getProjection("EPSG:4326"),
                    tileGrid: new WMTSTileGrid({
                        origin: getTopLeft(getProjection("EPSG:4326").getExtent()),
                        resolutions: Array.from({ length: 15 }, (_, z) => getWidth(getProjection("EPSG:4326").getExtent()) / 256 / Math.pow(2, z)),
                        matrixIds: Array.from({ length: 15 }, (_, z) => z)
                    }),
                    wrapX: true
                }));
            });
        }
    };

    const handleDateChange = (date) => {
        setSelectedDate(date);
        setSelectedEventIdx("");
        updateLayer(selectedStyle, date);
    };

    const handleStyleChange = (event) => {
        const newStyle = event.target.value;
        setSelectedStyle(newStyle);
        updateLayer(newStyle, selectedDate);
    };

    const handleVisibilityToggle = () => {
        setSelectedEventIdx("");
        const newVisibility = !layerVisible;
        setLayerVisible(newVisibility);

        if (newVisibility) {
            mapRef.current.removeLayer(pulseLayerRef.current);
            pulseLayerRef.current = null;
        }

        // Just toggle visibility instead of removing/adding
        hlsLayerRef.current.forEach(layer => layer.setVisible(newVisibility));
        osmLayerRef.current.setVisible(!newVisibility);

        // Keep the same view without resetting it
        mapRef.current.render();
    };

    const handleEventSelect = (eventIdx) => {
        setSelectedEventIdx(eventIdx);
        const selectedEvent = events[eventIdx];
        if (!selectedEvent || !mapRef.current) return;

        const coords3D = selectedEvent.geojson?.features?.[0]?.geometry?.coordinates;
        if (!coords3D) {
            triggerToast("error", `No coordinates for ${selectedEvent.event_name}`);
            return;
        }

        let lonLat;
        if (typeof coords3D[0] === "number") {
            lonLat = coords3D;
        } else {
            lonLat = coords3D.flat(Infinity).slice(0, 2);
        }

        const map = mapRef.current;
        const view = map.getView();

        if (markerLayerRef.current) map.removeLayer(markerLayerRef.current);
        if (pulseLayerRef.current) map.removeLayer(pulseLayerRef.current);

        const pulseFeature = new Feature({ geometry: new Point(lonLat) });
        pulseFeature.setStyle(new Style({
            image: new CircleStyle({
                radius: 10,
                fill: new Fill({ color: "rgba(255,0,0,0.4)" }),
                stroke: new Stroke({ color: "red", width: 2 })
            })
        }));

        const vectorSource = new VectorSource({ features: [pulseFeature] });
        const pulseLayer = new VectorLayer({ source: vectorSource, zIndex: 9999 });
        if (!layerVisible) {
            map.addLayer(pulseLayer);
            pulseLayerRef.current = pulseLayer;
        }

        view.animate(
            { center: lonLat, duration: 1500 },
            { zoom: layerVisible ? 4 : 5, duration: 1500 }
        );

        triggerToast("success", `Moved to event: ${selectedEvent.event_name}`);
    };

    return (
        <Box style={{ position: "relative" }}>
            <Box
                style={{
                    position: "absolute",
                    zIndex: 1000,
                    top: "10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    padding: "8px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                }}>
                <Tooltip title="Select Date">
                    <Box>
                        <DatePicker
                            selected={selectedDate}
                            onChange={handleDateChange}
                            dateFormat="yyyy-MM-dd"
                            maxDate={new Date(Date.now() - 24 * 60 * 60 * 1000)}
                            disabled={!layerVisible}
                            customInput={
                                <input
                                    style={{
                                        height: "40px",
                                        borderRadius: "4px",
                                        border: "1px solid #c4c4c4",
                                        padding: "0 10px",
                                        fontSize: "14px",
                                        boxSizing: "border-box",
                                        backgroundColor: "rgba(255, 255, 255, 0.4)"
                                    }}
                                />
                            }
                        />
                    </Box>
                </Tooltip>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Event</InputLabel>
                    <Tooltip title="Select Event">
                        <Select
                            value={selectedEventIdx}
                            onChange={(e) => handleEventSelect(Number(e.target.value))}
                            labelId="event-label"
                            id='event-id'>
                            <MenuItem value="">
                                <em>Select Event</em>
                            </MenuItem>
                            {groupedEvents.reduce((acc, [type, items]) => {
                                acc.push(
                                    <ListSubheader key={`${type}-header`}>
                                        {type.replace(/_/g, " ")}
                                    </ListSubheader>
                                );
                                items.forEach(({ idx, ev }) => {
                                    acc.push(
                                        <MenuItem key={idx} value={idx}>
                                            {ev.event_name || `Event ${idx + 1}`}
                                        </MenuItem>
                                    );
                                });
                                return acc;
                            }, [])}
                        </Select>
                    </Tooltip>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Tooltip title="Select Layer">
                        <Select
                            id="style-id"
                            value={selectedStyle}
                            onChange={handleStyleChange}
                            disabled={!layerVisible}
                        >
                            <MenuItem value="trueColor">HLS S30 (True Color)</MenuItem>
                            <MenuItem value="falseColor">HLS L30 (True Color)</MenuItem>
                        </Select>
                    </Tooltip>
                </FormControl>
                <Box display="flex" alignItems="center">
                    <Tooltip title={layerVisible ? "Show OSM Layer" : "Show HLS Layer"}>
                        <Switch
                            checked={layerVisible}
                            onChange={handleVisibilityToggle}
                        />
                    </Tooltip>
                </Box>
            </Box>
            {loading && (
                <Box
                    style={{
                        position: "absolute",
                        top: "60px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        padding: "5px 15px",
                        borderRadius: "5px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                        zIndex: 1000,
                        fontWeight: "bold",
                        margin: '1rem'
                    }}
                >
                    Loading imagery...
                </Box>
            )}
            <Box id="map" style={{ width: "100%", height: "100vh" }}></Box>
            <ToastContainer />
        </Box>
    );
};

export default MapView;