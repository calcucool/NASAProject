import React, { useEffect, useState, useRef, useMemo } from "react";
import Zoom from "ol/control/Zoom";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import WMTS from "ol/source/WMTS";
import WMTSTileGrid from "ol/tilegrid/WMTS";
import { get as getProjection, fromLonLat } from "ol/proj";
import { getTopLeft, getWidth } from "ol/extent";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import events from "./preloaded_events.json";
import { ListSubheader } from "@mui/material";
import "./MapView.css";

import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";

import OSM from "ol/source/OSM";

import { FormControl, InputLabel, Select, MenuItem, Checkbox, Box } from "@mui/material";

const TOAST_COOLDOWN = 5000;

const MapView = () => {
    const [selectedDate, setSelectedDate] = useState(new Date(Date.now() - 86400000));
    const [loading, setLoading] = useState(false);
    const [selectedEventIdx, setSelectedEventIdx] = useState("");
    const [layerVisible, setLayerVisible] = useState(true);
    const [selectedStyle, setSelectedStyle] = useState("default");

    const mapRef = useRef(null);
    const modisLayerRef = useRef(null);
    const markerLayerRef = useRef(null);
    const pulseLayerRef = useRef(null);

    const lastToastTime = useRef(0);
    const lastToastType = useRef(null);

    const layerOptions = {
        default: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
        falseColor: "VIIRS_SNPP_CorrectedReflectance_BandsM11-I2-I1",
        night: "VIIRS_SNPP_DayNightBand_At_Sensor_Radiance"
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

    const createWMTSLayer = (style, date) => {
        const projection = getProjection("EPSG:3857");
        const projectionExtent = projection.getExtent();
        const size = getWidth(projectionExtent) / 256;
        const resolutions = [];
        const matrixIds = [];

        for (let z = 0; z <= 9; ++z) {
            resolutions[z] = size / Math.pow(2, z);
            matrixIds[z] = z;
        }

        return new TileLayer({
            opacity: 0,
            source: new WMTS({
                url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi",
                layer: layerOptions[style],
                style: "default",
                matrixSet: "GoogleMapsCompatible_Level9",
                format: "image/jpeg",
                projection: projection,
                tileGrid: new WMTSTileGrid({
                    origin: getTopLeft(projectionExtent),
                    resolutions: resolutions,
                    matrixIds: matrixIds
                }),
                dimensions: { TIME: date.toISOString().split("T")[0] },
                wrapX: true
            })
        });
    };

    useEffect(() => {
        setLoading(true);
        const osmLayer = new TileLayer({
            source: new OSM(),
            zIndex: 0,
        });
        const modis = createWMTSLayer(selectedStyle, selectedDate);

        const mapInstance = new Map({
            target: "map",
            layers: [osmLayer, modis],
            view: new View({
                projection: "EPSG:3857",
                center: [0, 3500000],
                zoom: 2,
            }),
            controls: []
        });

        // Add custom zoom control
        import("ol/control/Zoom").then(({ default: Zoom }) => {
            const zoomControl = new Zoom({
                className: "custom-zoom"
            });
            mapInstance.addControl(zoomControl);
        });

        // Add custom zoom
        mapInstance.addControl(
            new Zoom({ className: "custom-zoom" })
        );

        mapRef.current = mapInstance;
        modisLayerRef.current = modis;
        modis.setOpacity(1);

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

    const updateLayer = (style, date) => {
        if (!mapRef.current || !modisLayerRef.current) return;
        const newLayer = createWMTSLayer(style, date);

        const source = newLayer.getSource();
        let pendingTiles = 0;

        source.on("tileloadstart", () => {
            setLoading(true);
            pendingTiles++;
        });
        source.on("tileloadend", () => {
            pendingTiles--;
            if (pendingTiles <= 0) {
                setLoading(false);
                newLayer.setOpacity(1);
                triggerToast("success", `Imagery updated: ${date.toISOString().split("T")[0]}, Style: ${style}`);
            }
        });
        source.on("tileloaderror", () => {
            pendingTiles--;
            if (pendingTiles <= 0) {
                setLoading(false);
                triggerToast("error", "Failed to load imagery.");
            }
        });

        mapRef.current.removeLayer(modisLayerRef.current);
        mapRef.current.addLayer(newLayer);
        modisLayerRef.current = newLayer;
        newLayer.setVisible(layerVisible);
    };

    const handleDateChange = (date) => {
        setSelectedDate(date);
        setSelectedEventIdx("");
        updateLayer(selectedStyle, date);
    };

    const handleStyleChange = (style) => {
        setSelectedStyle(style);
        updateLayer(style, selectedDate);
    };

    const handleVisibilityToggle = () => {
        if (modisLayerRef.current) {
            const newVisibility = !layerVisible;
            modisLayerRef.current.setVisible(newVisibility);
            setLayerVisible(newVisibility);
            triggerToast("info", `Layer ${newVisibility ? "shown" : "hidden"}`);
        }
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

        if (markerLayerRef.current) mapRef.current.removeLayer(markerLayerRef.current);
        if (pulseLayerRef.current) mapRef.current.removeLayer(pulseLayerRef.current);

        const pulseFeature = new Feature({ geometry: new Point(fromLonLat(lonLat)) });
        const pulseStyle = new Style({
            image: new CircleStyle({
                radius: 10,
                fill: new Fill({ color: "rgba(255,0,0,0.4)" }),
                stroke: new Stroke({ color: "red", width: 2 })
            })
        });

        pulseFeature.setStyle(pulseStyle);
        const vectorSource = new VectorSource({ features: [pulseFeature] });
        const pulseLayer = new VectorLayer({ source: vectorSource, zIndex: 9999 });

        mapRef.current.addLayer(pulseLayer);
        pulseLayerRef.current = pulseLayer;

        let radius = 10;
        let growing = true;
        const animatePulse = () => {
            if (growing) radius += 0.3;
            else radius -= 0.3;
            if (radius >= 20) growing = false;
            if (radius <= 10) growing = true;
            pulseFeature.setStyle(
                new Style({
                    image: new CircleStyle({
                        radius,
                        fill: new Fill({ color: "rgba(255,0,0,0.4)" }),
                        stroke: new Stroke({ color: "red", width: 2 })
                    })
                })
            );
            mapRef.current.render();
            requestAnimationFrame(animatePulse);
        };
        requestAnimationFrame(animatePulse);

        const view = mapRef.current.getView();
        view.animate(
            { center: fromLonLat(lonLat), duration: 1500 },
            { zoom: 6, duration: 1500 }
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
                    backgroundColor: "white",
                    padding: "8px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                }}>
                <DatePicker
                    selected={selectedDate}
                    onChange={handleDateChange}
                    dateFormat="yyyy-MM-dd"
                    disabled={!layerVisible}
                    customInput={
                        <input
                            style={{
                                height: "40px",
                                borderRadius: "4px",
                                border: "1px solid #c4c4c4",
                                padding: "0 10px",
                                fontSize: "14px",
                                boxSizing: "border-box"
                            }}
                        />
                    }
                />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="event-label">Event</InputLabel>
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
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select
                        id="style-id"
                        value={selectedStyle}
                        onChange={(e) => {
                            setSelectedStyle(e.target.value);
                            updateLayer(e.target.value, selectedDate);
                        }}
                        disabled={!layerVisible}
                    >
                        <MenuItem value="default">True Color</MenuItem>
                        <MenuItem value="falseColor">False Color</MenuItem>
                        <MenuItem value="night">Night Band</MenuItem>
                    </Select>
                </FormControl>
                <Box display="flex" alignItems="center">
                    <Checkbox
                        checked={layerVisible}
                        onChange={handleVisibilityToggle}
                    />
                    Show Layer
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
