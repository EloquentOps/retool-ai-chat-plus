import React, { useCallback, useEffect, useRef, useState } from 'react'
import { type FC } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

interface GoogleMapWidgetProps {
  source: {
    lat: number
    lon: number
    zoom?: number
  }
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

export const GoogleMapWidget: FC<GoogleMapWidgetProps> = ({ 
  source, 
  onWidgetCallback, 
  widgetsOptions,
  historyIndex 
}) => {
  // Get zoom level: prefer source.zoom, then widgetsOptions, then default
  const mapZoom = source?.zoom || 
    (widgetsOptions?.google_map as Record<string, unknown>)?.zoom as number || 
    15
  
  // Get height: prefer widgetsOptions, then default
  const mapHeight = (widgetsOptions?.google_map as Record<string, unknown>)?.height as string || 
    '300px'
  
  const _mapRef = useRef<HTMLDivElement>(null)
  const [_map, setMap] = useState<google.maps.Map | null>(null)
  const [_marker, setMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefReady, setIsRefReady] = useState(false)
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Callback ref to detect when the DOM element is ready
  const setMapRef = (node: HTMLDivElement | null) => {
    setContainerEl(node)
    if (node) {
      setIsRefReady(true)
      console.log('GoogleMapWidget: Map ref is ready')
    }
  }

  // Debounced map change handler using useCallback to prevent recreation
  const handleMapChangeDebounced = useCallback((mapInstance: google.maps.Map) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      if (onWidgetCallback) {
        const center = mapInstance.getCenter()
        const zoom = mapInstance.getZoom()
        
        // Send regular callback for external event handling
        onWidgetCallback({
          type: 'google_map:changed',
          center: {
            lat: center?.lat(),
            lng: center?.lng()
          },
          zoom: zoom
        })
        
        // Send history update callback if historyIndex is available
        if (typeof historyIndex === 'number') {
          onWidgetCallback({
            updateHistory: true,
            historyIndex: historyIndex,
            updatedSource: {
              lat: center?.lat(),
              lon: center?.lng(),
              zoom: zoom
            }
          })
        }
      }
    }, 750)
  }, [onWidgetCallback, historyIndex])

  useEffect(() => {
    const initializeMap = async () => {
      if (!source || typeof source.lat !== 'number' || typeof source.lon !== 'number') {
        console.log('GoogleMapWidget: Missing or invalid location data', { source })
        setError('Invalid location data. Please provide lat and lon coordinates.')
        setIsLoading(false)
        return
      }

      if (!isRefReady || !containerEl) {
        console.log('GoogleMapWidget: mapRef not ready', { isRefReady, mapRef: !!containerEl })
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Get API key: prefer prop, then widgetsOptions, then window globals
        const mapsApiKey = (widgetsOptions?.google_map as Record<string, unknown>)?.apiKey as string
        
        console.log('GoogleMapWidget: Initializing map', { source, mapsApiKey: !!mapsApiKey })
        
        if (!mapsApiKey) {
          const errorMsg = 'Google Maps API key is required. Please provide via apiKey prop, widgetsOptions.google_map.apiKey, or window.REACT_APP_GOOGLE_MAPS_API_KEY'
          console.error('GoogleMapWidget:', errorMsg)
          setError(errorMsg)
          setIsLoading(false)
          return
        }

        // Initialize the Google Maps loader
        const loader = new Loader({
          apiKey: mapsApiKey,
          version: 'weekly',
          libraries: ['places', 'marker']
        })

        // Load the Google Maps API
        console.log('GoogleMapWidget: Loading Google Maps API...')
        await loader.load()
        console.log('GoogleMapWidget: Google Maps API loaded successfully')

        // Use coordinates from source object
        const locationCoords = new google.maps.LatLng(source.lat, source.lon)
        
        // Create map instance
        const mapInstance = new google.maps.Map(containerEl, {
          center: locationCoords,
          zoom: mapZoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapId: 'DEMO_MAP_ID', // Required for Advanced Markers
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
          ]
        })

        // Create marker using AdvancedMarkerElement (recommended)
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary
        const markerInstance = new AdvancedMarkerElement({
          position: locationCoords,
          map: mapInstance,
          title: `Location: ${source.lat}, ${source.lon}`
        })

        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="padding: 8px;"><strong>Location</strong><br>Lat: ${source.lat}<br>Lon: ${source.lon}</div>`
        })
        markerInstance.addListener('click', () => infoWindow.open(mapInstance, markerInstance))

        // Listen for map changes (pan and zoom) with debouncing
        mapInstance.addListener('center_changed', () => handleMapChangeDebounced(mapInstance))
        mapInstance.addListener('zoom_changed', () => handleMapChangeDebounced(mapInstance))

        console.log('GoogleMapWidget: Map created successfully')
        setMap(mapInstance)
        setMarker(markerInstance)
        setIsLoading(false)
      } catch (err) {
        const errorMsg = `Failed to load Google Maps: ${err instanceof Error ? err.message : 'Unknown error'}`
        console.error('GoogleMapWidget: Error during initialization:', err)
        setError(errorMsg)
        setIsLoading(false)
      }
    }

    initializeMap()
  }, [source, mapZoom, isRefReady])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <div style={{
      width: '100%',
      height: mapHeight,
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #ddd',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'relative'
    }}>
      <div 
        ref={setMapRef} 
        style={{ 
          width: '100%', 
          height: '100%'
        }} 
      />

      {(isLoading || error) && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#666',
          border: '1px solid #ddd'
        }}>
          <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: '14px' }}>
            <div style={{ marginBottom: '8px' }}>🗺️</div>
            <div>{error ? 'Map Error' : 'Loading map...'}</div>
            {error && <div style={{ fontSize: '12px', marginTop: '4px' }}>{error}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// Export the instruction for this widget
export const GoogleMapWidgetInstruction = {
  type: 'google_map',
  instructions: 'Use this widget when the user asks to show a map of a specific location. Provide coordinates as an object with lat and lon properties.',
  sourceDataModel: {
    lat: 'the latitude of the location (number)',
    lon: 'the longitude of the location (number)', 
    zoom: 'the optional zoom level of the map (number, default: 15)'
  }
}
