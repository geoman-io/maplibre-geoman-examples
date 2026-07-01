import { createRoot } from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@geoman-io/maplibre-geoman-pro/dist/maplibre-geoman.css';
import './index.css';
import App from './App';

// No StrictMode: it double-invokes effects in dev, which would build the
// MapLibre map twice. The map is created once per mounted editor.
createRoot(document.getElementById('root')!).render(<App />);
