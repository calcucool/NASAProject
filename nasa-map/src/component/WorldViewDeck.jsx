/* eslint-disable */
import React, { useEffect, useState, useMemo, useRef } from "react";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer, ScatterplotLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    Box,
    Tooltip,
    Button,
    Switch,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ListSubheader,
} from "@mui/material";
import events from "../preloaded_events.json";

const defaultDate = new Date(Date.now() - 86400000 * 2);

export default function WorldViewDeck() {
    const deckRef = useRef(null);
    const [selectedDate, setSelectedDate] = useState(defaultDate);
    const [selectedEventIdx, setSelectedEventIdx] = useState("");
    const [selectedStyle, setSelectedStyle] = useState("");
    const [styleOptions, setStyleOptions] = useState({});
    const [layerVisible, setLayerVisible] = useState(false);
    const [viewState, setViewState] = useState({
        longitude: -100,  // Central US approx
        latitude: 40,
        zoom: 3,
        pitch: 0,
        bearing: 0,
    });
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

    // Cleanup on unmount to remove DeckGL canvas
    useEffect(() => {
        return () => {
            if (deckRef.current && deckRef.current.deck) {
                deckRef.current.deck.finalize();
            }
        };
    }, []);

    // Fetch NASA styles
    useEffect(() => {
        fetchStyles().then((styles) => {
            setStyleOptions(styles);
            if (Object.keys(styles).length > 0) {
                setSelectedStyle(Object.keys(styles)[0]);
            }
        });
    }, []);

    const fetchStyles = async () => {
        const url =
            "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?request=GetCapabilities";
        const res = await fetch(url);
        const text = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "application/xml");

        const layers = xmlDoc.getElementsByTagName("Layer");
        const stylesMap = {};

        Array.from(layers).forEach((layer) => {
            const identifier =
                layer.getElementsByTagName("ows:Identifier")[0]?.textContent;
            const tileMatrixSet =
                layer
                    .getElementsByTagName("TileMatrixSetLink")[0]
                    ?.getElementsByTagName("TileMatrixSet")[0]?.textContent ?? "";

            if (identifier?.includes("CorrectedReflectance")) {
                const label = identifier
                    .replace(/_/g, " ")
                    .replace("CorrectedReflectance", "")
                    .trim();
                stylesMap[label] = {
                    id: identifier,
                    matrix: tileMatrixSet,
                };
            }
        });

        return stylesMap;
    };

    // OSM base layer
    const osmLayer = useMemo(() => {
        return new TileLayer({
            id: "osm-base",
            data: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
            minZoom: 0,
            maxZoom: 19,
            tileSize: 256,
            renderSubLayers: (props) => {
                console.log("OSM renderSubLayers props.data:", props.data);
                if (!props.tile || !props.tile.bbox) return null;
                if (!props.data || typeof props.data !== "string") return null;
                const { west, south, east, north } = props.tile.bbox;
                return new BitmapLayer(props, {
                    id: `${props.id}-bitmap`,
                    image: props.data,
                    bounds: [west, south, east, north],
                });
            },
        });
    }, []);

    // NASA imagery layer
    const nasaLayer = useMemo(() => {
        if (!selectedStyle || !styleOptions[selectedStyle]) return null;

        return new TileLayer({
            id: "nasa-base",
            data: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${styleOptions[selectedStyle].id}/default/${selectedDate
                .toISOString()
                .split("T")[0]}/${styleOptions[selectedStyle].matrix}/{z}/{y}/{x}.jpg`,
            minZoom: 0,
            maxZoom: 8,
            tileSize: 256,
            visible: layerVisible,
            loadOptions: {
                image: { type: "image" },
            },
            onTileLoad: () => console.log("NASA tile loaded"),
            onTileError: (e) => console.error("NASA tile load error", e),
            renderSubLayers: (props) => {
                console.log("NASA renderSubLayers props.data:", props.data);
                if (!props.tile || !props.tile.bbox) return null;
                if (!props.data || typeof props.data !== "string") return null;
                const { west, south, east, north } = props.tile.bbox;
                return new BitmapLayer(props, {
                    id: `${props.id}-bitmap`,
                    image: props.data,
                    bounds: [west, south, east, north],
                });
            },
        });
    }, [selectedStyle, selectedDate, layerVisible, styleOptions]);

    // Event scatterplot layer
    const eventLayer = useMemo(() => {
        return new ScatterplotLayer({
            id: "event-layer",
            data: selectedEventIdx !== "" ? [events[selectedEventIdx]] : [],
            getPosition: (ev) => {
                const coords =
                    ev.geojson?.features?.[0]?.geometry?.coordinates || [0, 0];
                return typeof coords[0] === "number"
                    ? coords
                    : coords.flat(Infinity).slice(0, 2);
            },
            getRadius: 200000,
            getFillColor: [255, 0, 0],
            pickable: true,
        });
    }, [selectedEventIdx]);

    // Handlers
    const handleDateChange = (date) => setSelectedDate(date);
    const handleStyleChange = (e) => setSelectedStyle(e.target.value);
    const handleVisibilityToggle = () => setLayerVisible((v) => !v);
    const handleEventSelect = (idx) => {
        setSelectedEventIdx(idx);
        const selectedEvent = events[idx];
        if (selectedEvent) {
            const coords =
                selectedEvent.geojson?.features?.[0]?.geometry?.coordinates || [0, 0];
            const [lon, lat] =
                typeof coords[0] === "number"
                    ? coords
                    : coords.flat(Infinity).slice(0, 2);
            setViewState((v) => ({ ...v, longitude: lon, latitude: lat, zoom: 5 }));
            toast.success(`Moved to event: ${selectedEvent.event_name}`);
        }
    };
    const handleReset = () => {
        setSelectedDate(defaultDate);
        setSelectedEventIdx("");
        if (Object.keys(styleOptions).length > 0) {
            setSelectedStyle(Object.keys(styleOptions)[0]);
        }
        setLayerVisible(true);
        setViewState({ longitude: -100, latitude: 40, zoom: 3, pitch: 0, bearing: 0 });
    };

    return (
        <Box>
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
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                }}
            >
                <Tooltip title="Select Date">
                    <Box>
                        <DatePicker
                            selected={selectedDate}
                            onChange={handleDateChange}
                            dateFormat="yyyy-MM-dd"
                            maxDate={new Date(Date.now() - 24 * 60 * 60 * 1000)}
                            customInput={<input style={{ height: "40px", padding: "0 10px" }} />}
                        />
                    </Box>
                </Tooltip>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Event</InputLabel>
                    <Tooltip title="Select Event">
                        <Select
                            value={selectedEventIdx}
                            onChange={(e) => handleEventSelect(Number(e.target.value))}
                        >
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
                    <Tooltip title="Select Style">
                        <Select value={selectedStyle} onChange={handleStyleChange}>
                            {Object.keys(styleOptions).map((key) => (
                                <MenuItem key={key} value={key}>
                                    {key}
                                </MenuItem>
                            ))}
                        </Select>
                    </Tooltip>
                </FormControl>

                <Tooltip title={layerVisible ? "Hide Imagery" : "Show Imagery"}>
                    <Switch checked={layerVisible} onChange={handleVisibilityToggle} />
                </Tooltip>

                <Tooltip title="Reset Map">
                    <Button onClick={handleReset} variant="outlined">
                        Reset
                    </Button>
                </Tooltip>
            </Box>

            {/* DeckGL Map */}
            <DeckGL
                ref={deckRef}
                viewState={viewState}
                controller={true}
                onViewStateChange={({ viewState }) => setViewState(viewState)}
                layers={[osmLayer, nasaLayer, eventLayer].filter(Boolean)}
                style={{ width: "100%", height: "92vh" }}
            />

            <ToastContainer />
        </Box>
    );
}