import React, { useEffect, useState, useRef, useMemo } from "react";
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
import "./MapView.css";

// Vector for pin
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";

const TOAST_COOLDOWN = 5000;
const FADE_DURATION_MS = 1000;

const MapView = () => {
    const [modisLayer, setModisLayer] = useState(null);
    const [map, setMap] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [pendingTiles, setPendingTiles] = useState(0);

    const lastToastTime = useRef(0);
    const lastToastType = useRef(null);
    const markerLayerRef = useRef(null);

    const groupedEvents = useMemo(() => {
        return Object.entries(
            events.reduce((acc, ev, idx) => {
                const type = ev.event_type || "Other";
                if (!acc[type]) acc[type] = [];
                acc[type].push({ idx, ev });
                return acc;
            }, {})
        );
    }, [events]);

    useEffect(() => {
        const projection = getProjection("EPSG:3857");
        const projectionExtent = projection.getExtent();
        const size = getWidth(projectionExtent) / 256;
        const resolutions = [];
        const matrixIds = [];

        for (let z = 0; z <= 9; ++z) {
            resolutions[z] = size / Math.pow(2, z);
            matrixIds[z] = z;
        }

        const modis = new TileLayer({
            source: new WMTS({
                url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi",
                layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
                matrixSet: "GoogleMapsCompatible_Level9",
                format: "image/jpeg",
                style: "default",
                projection: projection,
                tileGrid: new WMTSTileGrid({
                    origin: getTopLeft(projectionExtent),
                    resolutions: resolutions,
                    matrixIds: matrixIds
                }),
                dimensions: {
                    TIME: selectedDate.toISOString().split("T")[0]
                },
                wrapX: true
            }),
            opacity: 1
        });

        const source = modis.getSource();
        source.on("tileloadstart", () => {
            setPendingTiles((count) => count + 1);
            setLoading(true);
        });
        source.on(["tileloadend", "tileloaderror"], () => {
            setPendingTiles((count) => {
                const newCount = count - 1;
                if (newCount <= 0) {
                    setLoading(false);
                    setTimeout(() => {
                        triggerToast("success", `Imagery updated for ${selectedDate.toISOString().split("T")[0]}`);
                    }, 0);
                }
                return newCount;
            });
        });

        const mapInstance = new Map({
            target: "map",
            layers: [modis],
            view: new View({
                projection: projection,
                center: [0, 0],
                zoom: 2
            })
        });

        setModisLayer(modis);
        setMap(mapInstance);
    }, []);

    const triggerToast = (type, message) => {
        const now = Date.now();
        const timeSinceLastToast = now - lastToastTime.current;
        if (type === lastToastType.current && timeSinceLastToast < TOAST_COOLDOWN) return;
        if (type !== lastToastType.current) toast.dismiss();
        toast[type](message, { position: "bottom-right", autoClose: 3000 });
        lastToastTime.current = now;
        lastToastType.current = type;
    };

    // Fade layer on date change
    const updateDateLayer = (date) => {
        if (!map || !modisLayer) return;

        const oldLayer = modisLayer;
        const newLayer = new TileLayer({
            opacity: 0,
            source: new WMTS({
                url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi",
                layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
                matrixSet: "GoogleMapsCompatible_Level9",
                format: "image/jpeg",
                style: "default",
                projection: oldLayer.getSource().getProjection(),
                tileGrid: oldLayer.getSource().getTileGrid(),
                dimensions: { TIME: date.toISOString().split("T")[0] },
                wrapX: true
            })
        });

        map.addLayer(newLayer);

        let pending = 0;
        const src = newLayer.getSource();
        src.on("tileloadstart", () => pending++);
        src.on(["tileloadend", "tileloaderror"], () => {
            pending--;
            if (pending <= 0) {
                newLayer.setOpacity(1);
                oldLayer.setOpacity(0);

                setTimeout(() => {
                    map.removeLayer(oldLayer);
                    setModisLayer(newLayer);
                }, FADE_DURATION_MS);
            }
        });
    };

    const handleDateChange = (date) => {
        setSelectedDate(date);
        updateDateLayer(date);
    };

    const handleEventSelect = (eventIdx) => {
        const selectedEvent = events[eventIdx];
        if (!selectedEvent || !map) return;

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

        // Remove old marker if exists
        if (markerLayerRef.current) {
            map.removeLayer(markerLayerRef.current);
        }

        // Create a large pin (red circle for now)
        const feature = new Feature({
            geometry: new Point(fromLonLat(lonLat))
        });

        feature.setStyle(
            new Style({
                image: new CircleStyle({
                    radius: 20, // Large marker
                    fill: new Fill({ color: "red" }),
                    stroke: new Stroke({ color: "white", width: 3 })
                })
            })
        );

        const vectorSource = new VectorSource({ features: [feature] });
        const vectorLayer = new VectorLayer({ source: vectorSource });

        map.addLayer(vectorLayer);
        markerLayerRef.current = vectorLayer;

        // Pan to marker location
        map.getView().animate({
            center: fromLonLat(lonLat),
            duration: 1000
        });

        triggerToast("success", `Dropped pin at ${selectedEvent.event_name}`);
    };

    return (
        <div style={{ position: "relative" }}>
            {/* Toolbar */}
            <div
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
                }}
            >
                <DatePicker
                    selected={selectedDate}
                    onChange={handleDateChange}
                    dateFormat="yyyy-MM-dd"
                />
                <select onChange={(e) => handleEventSelect(Number(e.target.value))}>
                    <option value="">Select Event</option>
                    {groupedEvents.map(([type, items]) => (
                        <optgroup key={type} label={type.replace(/_/g, " ")}>
                            {items.map(({ idx, ev }) => (
                                <option key={idx} value={idx}>
                                    {ev.event_name || `Event ${idx + 1}`}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {/* Loading Indicator */}
            {loading && (
                <div
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
                        fontWeight: "bold"
                    }}
                >
                    Loading imagery...
                </div>
            )}

            {/* Map */}
            <div id="map" style={{ width: "100%", height: "100vh" }}></div>

            <ToastContainer />
        </div>
    );
};

export default MapView;
