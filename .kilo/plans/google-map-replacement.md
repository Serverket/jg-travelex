# Plan: Switch Map Visualization from OSM to Google Maps

## Objective
Replace the OpenStreetMap (OSM) Leaflet-based map with a robust, feature-rich Google Maps-based map in the Distance Calculator. Ensure the Google Map implementation provides all visual and functional features present in the current OSM implementation (custom markers, route rendering, distance/time integration, and automatic viewport fitting).

## Files to read
- `src/components/Map.jsx` — target for enhancement
- `src/pages/DistanceCalculator.jsx` — integration point
- `src/components/OpenStreetMap.jsx` — reference for features to port
- `src/components/ManualDistanceInput.jsx` — to check for OSM dependencies

## Files to create / modify

### 1. `src/components/Map.jsx` (modify)
- **Remove internal route calculation**: The component currently executes `DirectionsService.route(...)` internally. Remove this effect to prevent duplicate API calls. The parent (`DistanceCalculator`) already calculates the route.
- **Make purely presentational**: Accept `directions`, `origin`, `destination`, and `isLoaded` (optional) as props.
- **Add custom markers ('A' / 'B')**: Render `<Marker>` components at `origin` and `destination` with labels 'A' and 'B', styled to match the app theme.
- **Add `fitBounds`**: On `directions` change, if the `map` instance exists, call `map.fitBounds(directions.routes[0].bounds, { padding: 50 })`.
- **Suppress default markers**: Set `suppressMarkers: true` on `<DirectionsRenderer>` so custom markers are not duplicated.
- **Style the route**: Pass `polylineOptions` to `DirectionsRenderer` to maintain the existing blue theme (`#1E40AF`, `strokeWeight: 5`).
- **Handle loading state**: If `isLoaded` is false, show a loading spinner.

### 2. `src/pages/DistanceCalculator.jsx` (modify)
- **Default to `google` mode**: Change the initial `calculationMethod` state to `'google'` when `googleMapsApiKeyAvailable` is true.
- **Import `Map` component**: `import Map from '../components/Map'`.
- **Replace inline Google Map (`renderMap` - `case 'google'`)**: Remove the inline `<GoogleMap>` + `<DirectionsRenderer>` JSX. Replace with `<Map origin={origin} destination={destination} directions={directions} isLoaded={isLoaded} />`.
- **Replace OSM Map (`renderMap` - `case 'manual'`)**: Remove the `<OpenStreetMap>` usage. Replace with `<Map origin={origin} destination={destination} directions={directions} isLoaded={isLoaded} />` (when coords are available).
- **Remove `OpenStreetMap` import**.
- **Adjust `renderMap` logic**: For `manual` mode, keep the placeholder when no coordinates are present. For `google` mode, show the `Map` component (it handles its own empty state via `defaultCenter`).
- **Verify `calculateGoogleRoute`**: Keep the existing function. It already populates `distance`, `duration`, and `directions` states correctly.

### 3. `src/components/OpenStreetMap.jsx` (mark for removal)
- After confirming it is no longer used in `DistanceCalculator` (and any other files), remove it to reduce bundle size.
- Also consider removing `leaflet` and `leaflet-routing-machine` from `package.json` if they are exclusively used by this component.

### 4. `src/components/ManualDistanceInput.jsx` (assess)
- This component currently uses `OpenStreetPlaceSearch` (Photon) and the OSRM API (`router.project-osrm.org`) for auto-populating distance/duration when coordinates are provided.
- The immediate scope of this task is the *map visualization*. The auto-fill in manual mode is a separate concern.
- **Decision**: Document that the auto-fill logic still relies on OSM for now. If desired, it can be migrated to Google in a follow-up by calling a shared `calculateRoute` utility or the backend.

## Edge Cases & Considerations
- **`useJsApiLoader` duplication**: `DistanceCalculator` and `Map` both call `useJsApiLoader`. `@react-google-maps/api` handles deduplication internally, but if warnings appear, the loader can be lifted to a common context later.
- **Missing `origin` or `destination`**: The `Map` component must gracefully render a default centered map (e.g., San Francisco or New York) when no coordinates are provided.
- **API Key**: The environment variable `VITE_GOOGLE_MAPS_API_KEY` must be present. The current check `googleMapsApiKeyAvailable` gates the mode selection.
- **Clean-up**: After implementation, verify that `OpenStreetMap` is not imported anywhere else before deleting it.
