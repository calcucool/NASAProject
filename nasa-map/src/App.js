
import { useState } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import { WorldViewLeaflet } from "./component/WorldViewLeaflet";
import WorldViewOpenLayers from "./component/WorldViewOpenLayers";
import { Provider } from "react-redux";
import { store, persistor } from "./store";
import { PersistGate } from "redux-persist/integration/react";

function App() {
  const [tabValue, setTabValue] = useState(0);

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (

    <Box sx={{ width: "100%", backgroundColor: "#696969" }}>

      <Tabs value={tabValue} onChange={handleChange} centered>
        <Tab label="OpenLayers" />
        <Tab label="Leaflet" />
      </Tabs>
      <Box sx={{ padding: 2 }}>
        {tabValue === 0 && (
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <Box>
                <WorldViewOpenLayers />
              </Box>
            </PersistGate >
          </Provider >
        )}
        {tabValue === 1 && (
          <Box>
            <WorldViewLeaflet />
          </Box>
        )}
      </Box>
    </Box >

  );
}

export default App;
