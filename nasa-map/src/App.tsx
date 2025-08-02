/* eslint-disable */
import { Tabs, Tab, Box } from "@mui/material";
import WorldViewDeck from "./component/WorldViewDeck";
import WorldViewOpenLayers from "./component/WorldViewOpenLayers";
import { Provider } from "react-redux";
import { store, persistor } from "./store";
import { PersistGate } from "redux-persist/integration/react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router>
          <MainTabs />
        </Router>
      </PersistGate>
    </Provider>
  );
}

function MainTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine tab based on path
  const tabValue = location.pathname === "/deckgl" ? 1 : 0;

  const handleChange = ((event: any, newValue: any) => {
    navigate(newValue === 0 ? "/openlayers" : "/deckgl");
  });

  return (
    <Box sx={{ width: "100%", backgroundColor: "#696969", zIndex: 30000 }}>
      <Tabs value={tabValue} onChange={handleChange} centered>
        <Tab label="OpenLayers" />
        <Tab label="DeckGL" />
      </Tabs>

      <Box sx={{ padding: 2 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/openlayers" replace />} />
          <Route path="/openlayers" element={<WorldViewOpenLayers />} />
          <Route path="/deckgl" element={<WorldViewDeck />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
