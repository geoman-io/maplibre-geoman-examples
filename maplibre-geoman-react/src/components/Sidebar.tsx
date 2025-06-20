import React, { useEffect, useRef, useState } from 'react';
import type { GmEventData } from '../types.ts';


interface SidebarProps {
  gmEvents: GmEventData[];
}

const Sidebar: React.FC<SidebarProps> = ({ gmEvents }) => {
  const [expandedGeojsonItem, setExpandedGeojsonItem] = useState<number>(-1);
  const sidebarElement = useRef<HTMLDivElement>(null);

  const toggleGeoJsonItem = (index: number) => {
    setExpandedGeojsonItem((prevIndex) => (prevIndex === index ? -1 : index));
  };

  useEffect(() => {
    if (sidebarElement.current) {
      sidebarElement.current.scrollTo(0, sidebarElement.current.scrollHeight);
    }
  }, [gmEvents.length]);

  return (
    <div className="sidebar" ref={sidebarElement}>
      {gmEvents.map((item, index) => (
        <div className="event-item" key={index}>
          <div>[{item.timestamp}]</div>
          <div>EventType: {item.type}</div>

          {item.type === 'gm:globaldrawmodetoggled' && (
            <>
              <div>Shape: {item.shape}</div>
              <div>Enabled: {item.enabled ? 'Yes' : 'No'}</div>
            </>
          )}

          {[
            'gm:globalsnappingmodetoggled',
            'gm:globalcutmodetoggled',
            'gm:globaleditmodetoggled',
            'gm:globaldragmodetoggled',
            'gm:globalrotatemodetoggled',
          ].includes(item.type) && (
              <div>Enabled: {item.enabled ? 'Yes' : 'No'}</div>
          )}

          {item.type === 'gm:create' && (
            <>
              <div>Feature Id: {item.id}</div>
              <div>Feature type: {item.shape}</div>
              <button
                className="geojson-header"
                onClick={() => toggleGeoJsonItem(index)}
              >
                GeoJSON
              </button>
              {expandedGeojsonItem === index && (
                <pre className="geojson">{item.geojson}</pre>
              )}
            </>
          )}

          {item.type === 'gm:remove' && (
            <>
              <div>Feature Id: {item.id}</div>
              <div>Feature type: {item.shape}</div>
            </>
          )}

          {[
            'gm:drag',
            'gm:dragstart',
            'gm:dragend',
            'gm:edit',
            'gm:editstart',
            'gm:editend',
            'gm:scale',
            'gm:scalestart',
            'gm:scaleend',
            'gm:rotate',
            'gm:rotatestart',
            'gm:rotateend',
            'gm:cut',
          ].includes(item.type) && (
            <>
              <div>Feature Id: {item.id}</div>
              <button
                className="geojson-header"
                onClick={() => toggleGeoJsonItem(index)}
              >
                GeoJSON
              </button>
              {expandedGeojsonItem === index && (
                <pre className="geojson">{item.geojson}</pre>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
