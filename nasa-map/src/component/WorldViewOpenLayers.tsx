import React, { useEffect, useState, useRef, useMemo } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
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

import {
    ListSubheader,
    Tooltip,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    SelectChangeEvent,
    Box
} from "@mui/material";

import {
    initializeMapState,
    cacheLayersForDate,
    setLayerVisible,
    setStyleOptions
} from "../store/mapSlice";

import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../store";

import events from "../preloaded_events.json";
import "./WorldViewOpenLayers.css";

// ---- Types ----
type StyleOptions = Record<string, string>;
type EventItem = {
    event_type?: string;
    event_name?: string;
    geojson?: {
        features?: {
            geometry?: { coordinates?: number[] | number[][][] };
        }[];
    };
};

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

const TOAST_COOLDOWN = 5000;
const defaultStyleKey = "HLS S30 NADIR";
const defaultDate = new Date(Date.now() - 86400000 * 2);

const WorldViewOpenLayers: React.FC = () => {

    const dispatch = useAppDispatch();
    const layersByDate = useAppSelector((state: any) => state.map.layersByDate);
    const layerVisible = useAppSelector((state: any) => state.map.layerVisible);
    const styleOptions = useAppSelector((state: any) => state.map.styleOptions);

    const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
    const [loading, setLoading] = useState(false);
    const [selectedEventIdx, setSelectedEventIdx] = useState<number | "">("");
    const [selectedStyle, setSelectedStyle] = useState<string>(defaultStyleKey);
    const [loadingDots, setLoadingDots] = useState("");

    const mapRef = useRef<Map | null>(null);
    const hlsLayerRef = useRef<TileLayer<WMTS>[]>([]);
    const osmLayerRef = useRef<TileLayer<OSM> | null>(null);
    const pulseLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const lastToastTime = useRef<number>(0);
    const lastToastType = useRef<"success" | "error" | null>(null);

    const groupedEvents = useMemo(() => {
        return Object.entries(
            (events as EventItem[]).reduce<
                Record<string, { idx: number; ev: EventItem }[]>
            >((acc, ev, idx) => {
                const type = ev.event_type || "Other";
                if (!acc[type]) acc[type] = [];
                acc[type].push({ idx, ev });
                return acc;
            }, {})
        );
    }, []);

    const createHLSLayerForDate = (
        styleKey: string,
        date: Date,
        onTileStats?: (status: "start" | "error") => void
    ) => {


        const proj = getProjection("EPSG:4326");
        if (!proj) {
            throw new Error("Projection EPSG:4326 could not be loaded");
        }
        const extent = proj.getExtent();
        if (!extent) return null;

        const size = getWidth(extent) / 256;
        const resolutions: number[] = [];
        const matrixIds: string[] = [];

        for (let z = 0; z <= 14; z++) {
            resolutions[z] = size / Math.pow(2, z);
            matrixIds[z] = z.toString();
        }

        const source = new WMTS({
            url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi",
            layer: styleOptions[styleKey],
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
        });

        if (onTileStats) {
            source.on("tileloadstart", () => onTileStats("start"));
            source.on("tileloaderror", () => onTileStats("error"));
        }

        return new TileLayer({
            source,
            opacity: 0.8,
            visible: layerVisible
        });
    };

    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setLoadingDots((prev) => (prev.length >= 3 ? "" : prev + "."));
            }, 500);
            return () => clearInterval(interval);
        } else {
            setLoadingDots("");
        }
    }, [loading]);

    useEffect(() => {
        dispatch(initializeMapState());
        fetchStyles().then((styles) => {
            dispatch(setStyleOptions(styles));
            setSelectedStyle(
                styles[defaultStyleKey] ? defaultStyleKey : Object.keys(styles)[0]
            );
        });
    }, [dispatch]);

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
            layers: [osmLayer],
            view: new View({
                projection: "EPSG:4326",
                center: [0, 0],
                zoom: 0
            }),
            controls: []
        });

        mapInstance.addControl(new Zoom({ className: "custom-zoom" }));
        mapRef.current = mapInstance;
        mapInstance.getViewport().style.backgroundColor = "#5385c2ff";

        const cacheEntry = layersByDate[selectedDate.toISOString()];

        if (
            cacheEntry &&
            cacheEntry.wmtsLayers?.length &&
            Date.now() - cacheEntry.lastUpdated < 6 * 24 * 60 * 60 * 1000
        ) {
            cacheEntry.wmtsLayers.forEach((cfg: { styleKey: string; time: string }) => {
                const layer = createHLSLayerForDate(
                    cfg.styleKey,
                    new Date(cfg.time)
                );
                if (layer) {
                    mapRef.current?.addLayer(layer);
                    hlsLayerRef.current.push(layer);
                }
            });
        } else {
            const wmtsConfigs = updateLayer(selectedStyle, new Date(selectedDate));
            dispatch(
                cacheLayersForDate({
                    date: selectedDate.toISOString(),
                    styleKey: selectedStyle,
                    wmtsLayers: wmtsConfigs,
                    lastUpdated: Date.now()
                })
            );
        }

        setTimeout(() => setLoading(false), 6000);

        return () => toast.dismiss();
    }, []);

    const fetchStyles = async (): Promise<StyleOptions> => {
        const url =
            "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?request=GetCapabilities";
        const res = await fetch(url);
        const text = await res.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "application/xml");

        const layers = xmlDoc.getElementsByTagName("Layer");
        const stylesMap: StyleOptions = {};

        Array.from(layers).forEach((layer) => {
            const identifier =
                layer.getElementsByTagName("ows:Identifier")[0]?.textContent;
            if (
                identifier?.includes("HLS_") ||
                identifier?.includes("OPERA_")
            ) {
                const label = identifier
                    .split("_")
                    .slice(0, 3)
                    .join(" ")
                    .toUpperCase();
                stylesMap[label] = identifier;
            }
        });

        return stylesMap;
    };

    const triggerToast = (type: "success" | "error", message: string) => {
        const now = Date.now();
        if (
            type === lastToastType.current &&
            now - lastToastTime.current < TOAST_COOLDOWN
        )
            return;
        if (type !== lastToastType.current) toast.dismiss();
        toast[type](message, { position: "top-right", autoClose: 3000 });
        lastToastTime.current = now;
        lastToastType.current = type;
    };

    const updateLayer = (styleKey: string, date: Date) => {
        if (!mapRef.current) return [];
        setLoading(true);

        let totalStarted = 0;
        let totalFailed = 0;
        const onTileStats = (event: "start" | "error") => {
            if (event === "start") totalStarted++;
            if (event === "error") totalFailed++;
        };

        const wmtsConfigs: { styleKey: string; time: string }[] = [];

        if (hlsLayerRef.current.length === 0) {
            for (let i = 0; i < 10; i++) {
                const day = new Date(date);
                day.setDate(date.getDate() - i);
                const dayISO = day.toISOString().split("T")[0];

                wmtsConfigs.push({ styleKey, time: dayISO });

                const hlsLayer = createHLSLayerForDate(styleKey, day, onTileStats);
                if (hlsLayer) {
                    mapRef.current.addLayer(hlsLayer);
                    hlsLayerRef.current.push(hlsLayer);
                }
            }
        } else {
            hlsLayerRef.current.forEach((layer, i) => {
                const day = new Date(date);
                day.setDate(date.getDate() - i);
                const dayISO = day.toISOString().split("T")[0];

                wmtsConfigs.push({ styleKey, time: dayISO });

                const newLayer = createHLSLayerForDate(styleKey, day, onTileStats);
                if (newLayer) {
                    layer.setSource(newLayer.getSource());
                }
            });
        }

        setTimeout(() => {
            const failureRate =
                totalStarted > 0 ? totalFailed / totalStarted : 0;
            if (failureRate > 0.7) {
                triggerToast("error", `Encountered loading maps for ${styleKey}`);
            } else {
                triggerToast("success", `Loaded ${styleKey} successfully`);
            }
        }, 3000);

        dispatch(
            cacheLayersForDate({
                date: date.toISOString(),
                styleKey,
                wmtsLayers: wmtsConfigs,
                lastUpdated: Date.now()
            })
        );

        setTimeout(() => setLoading(false), 6000);

        return wmtsConfigs;
    };

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
        setSelectedEventIdx("");
        updateLayer(selectedStyle, date);
    };

    const handleStyleChange = (event: SelectChangeEvent<string>) => {
        const newStyle = event.target.value as string;
        setSelectedStyle(newStyle);
        updateLayer(newStyle, selectedDate);
    };

    const handleVisibilityToggle = () => {
        setSelectedEventIdx("");
        const newVisibility = !layerVisible;
        dispatch(setLayerVisible(newVisibility));

        if (newVisibility) {
            if (pulseLayerRef.current)
                mapRef.current?.removeLayer(pulseLayerRef.current);
            pulseLayerRef.current = null;
        }

        hlsLayerRef.current.forEach((layer) =>
            layer.setVisible(newVisibility)
        );
        osmLayerRef.current?.setVisible(!newVisibility);

        mapRef.current?.render();
    };

    const handleEventSelect = (eventIdx: number) => {
        setSelectedEventIdx(eventIdx);
        const selectedEvent = (events as EventItem[])[eventIdx];
        if (!selectedEvent || !mapRef.current) return;

        const coords3D =
            selectedEvent.geojson?.features?.[0]?.geometry?.coordinates;
        if (!coords3D) {
            triggerToast(
                "error",
                `No coordinates for ${selectedEvent.event_name}`
            );
            return;
        }

        let lonLat: number[];
        if (typeof coords3D[0] === "number") {
            lonLat = coords3D as number[];
        } else {
            lonLat = (coords3D as any).flat(Infinity).slice(0, 2);
        }

        const map = mapRef.current;
        const view = map.getView();

        if (pulseLayerRef.current)
            map.removeLayer(pulseLayerRef.current);

        const pulseFeature = new Feature({ geometry: new Point(lonLat) });
        const vectorSource = new VectorSource({ features: [pulseFeature] });
        const pulseLayer = new VectorLayer({
            source: vectorSource,
            zIndex: 9999
        });
        if (!layerVisible) map.addLayer(pulseLayer);
        pulseLayerRef.current = pulseLayer;

        let radius = 10;
        let growing = true;
        const animatePulse = () => {
            radius += growing ? 0.3 : -0.3;
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

            map.render();
            requestAnimationFrame(animatePulse);
        };
        if (!layerVisible) requestAnimationFrame(animatePulse);

        view.animate(
            { center: lonLat, duration: 1500 },
            { zoom: layerVisible ? 4 : 5, duration: 1500 }
        );

        triggerToast(
            "success",
            `Moved to event: ${selectedEvent.event_name}`
        );
    };

    const handleReset = () => {
        setSelectedDate(defaultDate);
        setSelectedEventIdx("");
        setSelectedStyle(defaultStyleKey);
        dispatch(setLayerVisible(true));

        updateLayer(defaultStyleKey, defaultDate);

        if (mapRef.current) {
            const view = mapRef.current.getView();
            view.animate({
                center: [0, 0],
                zoom: 0,
                duration: 1000
            });
        }
    };

    return (
        <Box style={{ position: "relative" }}>
            {/* Controls */}
            <Box
                style={{
                    position: "absolute",
                    zIndex: 1000,
                    bottom: "2rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: "10px",
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    padding: "8px",
                    borderRadius: "8px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                }}
            >
                <Tooltip title="Select Date">
                    <Box>
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date: Date | null) => date && handleDateChange(date)}
                            dateFormat="yyyy-MM-dd"
                            maxDate={new Date(Date.now() - 24 * 60 * 60 * 1000)}
                            disabled={!layerVisible}
                        />
                    </Box>
                </Tooltip>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Event</InputLabel>
                    <Tooltip title="Select Event">
                        <Select
                            value={selectedEventIdx}
                            onChange={(e) =>
                                handleEventSelect(Number(e.target.value))
                            }
                        >
                            {groupedEvents.reduce(
                                (acc: React.ReactNode[], [type, items]) => {
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
                                },
                                []
                            )}
                        </Select>
                    </Tooltip>
                </FormControl>

                {loading && (
                    <Box
                        style={{
                            position: "absolute",
                            top: "60px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            backgroundColor: "rgba(255,255,255,0.7)",
                            padding: "5px 15px",
                            borderRadius: "5px",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                            zIndex: 1000,
                            fontWeight: "bold",
                            border: "none",
                            margin: "1rem"
                        }}
                    >
                        Loading map{loadingDots}
                    </Box>
                )}

                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Tooltip title="Select Style">
                        <Select
                            value={selectedStyle}
                            onChange={handleStyleChange}
                            disabled={!layerVisible}
                        >
                            {Object.keys(styleOptions).map((key) => (
                                <MenuItem key={key} value={key}>
                                    {key.replace(/_/g, " ")}
                                </MenuItem>
                            ))}
                        </Select>
                    </Tooltip>
                </FormControl>

                <Box display="flex" alignItems="center">
                    <Tooltip
                        title={layerVisible ? "Show OSM Layer" : "Show HLS Layer"}
                    >
                        <Switch
                            checked={layerVisible}
                            onChange={handleVisibilityToggle}
                        />
                    </Tooltip>
                </Box>

                <Box display="flex" alignItems="center">
                    <Tooltip title="Reset Map">
                        <Button
                            onClick={handleReset}
                            variant="outlined"
                            sx={{ color: "inherit", borderColor: "#A8A8A8" }}
                        >
                            Reset
                        </Button>
                    </Tooltip>
                </Box>
            </Box>

            {/* Map */}
            <Box id="map" style={{ width: "100%", height: "92vh" }}></Box>
            <ToastContainer />
        </Box>
    );
};

export default WorldViewOpenLayers;
