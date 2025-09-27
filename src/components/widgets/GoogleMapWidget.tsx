import React, { useCallback, useEffect, useRef, useState } from 'react'
import { type FC } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

interface GoogleMapWidgetProps {
  source: string
  apiKey?: string
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
}

export const GoogleMapWidget: FC<GoogleMapWidgetProps> = ({ 
  source, 
  apiKey,
  onWidgetCallback,
  widgetsOptions
}) => {
  // Get zoom level: prefer prop, then widgetsOptions, then default
  const mapZoom = (widgetsOptions?.google_map as Record<string, unknown>)?.zoom as number || 
    15
  
  // Get height: prefer widgetsOptions, then default
  const mapHeight = (widgetsOptions?.google_map as Record<string, unknown>)?.height as string || 
    '300px'
  
  // Get center coordinates: prefer widgetsOptions, then use source
  const mapCenter = (widgetsOptions?.google_map as Record<string, unknown>)?.center as [number, number] | undefined
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
        onWidgetCallback({
          type: 'map_changed',
          center: {
            lat: center?.lat(),
            lng: center?.lng()
          },
          zoom: zoom
        })
      }
    }, 750)
  }, [onWidgetCallback])

  useEffect(() => {
    const initializeMap = async () => {
      if (!source) {
        console.log('GoogleMapWidget: Missing location', { location: source })
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
        const mapsApiKey = 
          apiKey ||
          (widgetsOptions?.google_map as Record<string, unknown>)?.apiKey as string ||
          (typeof window !== 'undefined' && (window as unknown as Record<string, string | undefined>)?.REACT_APP_GOOGLE_MAPS_API_KEY) ||
          (typeof window !== 'undefined' && (window as unknown as Record<string, string | undefined>)?.GOOGLE_MAPS_API_KEY)
        
        console.log('GoogleMapWidget: Initializing map', { location: source, mapsApiKey: !!mapsApiKey })
        
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

        // Determine coordinates: prefer mapCenter from widgetsOptions, then parse source
        let locationCoords: google.maps.LatLng
        
        if (mapCenter && Array.isArray(mapCenter) && mapCenter.length === 2) {
          // Use center from widgetsOptions
          locationCoords = new google.maps.LatLng(mapCenter[0], mapCenter[1])
        } else {
          // Parse coordinates from source
          const coordMatch = source.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
          if (coordMatch) {
            const lat = parseFloat(coordMatch[1])
            const lng = parseFloat(coordMatch[2])
            locationCoords = new google.maps.LatLng(lat, lng)
          } else {
            // Will be handled by geocoding below
            locationCoords = new google.maps.LatLng(0, 0) // placeholder
          }
        }
        
        // If we have coordinates (either from mapCenter or parsed from source), create map directly
        if (mapCenter || source.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)) {

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
            title: mapCenter ? `Custom Center: ${mapCenter[0]}, ${mapCenter[1]}` : source
          })

          const infoWindow = new google.maps.InfoWindow({
            content: `<div style="padding: 8px;"><strong>${mapCenter ? `Custom Center: ${mapCenter[0]}, ${mapCenter[1]}` : source}</strong></div>`
          })
          markerInstance.addListener('click', () => infoWindow.open(mapInstance, markerInstance))

          // Listen for map changes (pan and zoom) with debouncing
          mapInstance.addListener('center_changed', () => handleMapChangeDebounced(mapInstance))
          mapInstance.addListener('zoom_changed', () => handleMapChangeDebounced(mapInstance))

          console.log('GoogleMapWidget: Map created successfully (coords)')
          setMap(mapInstance)
          setMarker(markerInstance)
          setIsLoading(false)
        } else {
          // Create geocoder instance
          const geocoder = new google.maps.Geocoder()

          // Geocode the location string to get coordinates
          console.log('GoogleMapWidget: Geocoding location:', source)
          geocoder.geocode({ address: source }, async (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
            console.log('GoogleMapWidget: Geocoding result:', { status, resultsCount: results?.length })
            
            if (status === 'OK' && results && results[0]) {
              const location_coords = results[0].geometry.location
              console.log('GoogleMapWidget: Location coordinates:', location_coords.toString())

              // Create map instance
              const mapInstance = new google.maps.Map(containerEl, {
                center: location_coords,
                zoom: mapZoom,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapId: 'DEMO_MAP_ID', // Required for Advanced Markers
                styles: [
                  {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                  }
                ]
              })

              // Create marker using AdvancedMarkerElement (recommended)
              const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary
              const markerInstance = new AdvancedMarkerElement({
                position: location_coords,
                map: mapInstance,
                title: source
              })

              // Add info window
              const infoWindow = new google.maps.InfoWindow({
                content: `<div style=\"padding: 8px;\"><strong>${source}</strong></div>`
              })

              markerInstance.addListener('click', () => {
                infoWindow.open(mapInstance, markerInstance)
              })

              // Listen for map changes (pan and zoom) with debouncing
              mapInstance.addListener('center_changed', () => handleMapChangeDebounced(mapInstance))
              mapInstance.addListener('zoom_changed', () => handleMapChangeDebounced(mapInstance))

              console.log('GoogleMapWidget: Map created successfully')
              setMap(mapInstance)
              setMarker(markerInstance)
              setIsLoading(false)
            } else {
              const errorMsg = `Geocoding failed: ${status}`
              console.error('GoogleMapWidget:', errorMsg, { status, results })
              setError(errorMsg)
              setIsLoading(false)
            }
          })
        }
      } catch (err) {
        const errorMsg = `Failed to load Google Maps: ${err instanceof Error ? err.message : 'Unknown error'}`
        console.error('GoogleMapWidget: Error during initialization:', err)
        setError(errorMsg)
        setIsLoading(false)
      }
    }

    initializeMap()
  }, [source, mapZoom, mapCenter, isRefReady])

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
export const GoogleMapWidgetInstruction = `- **Format type: "google_map"**:
Use this format when the user ask to show a map of a specific location.
The source value should be the lat lon coordinates (e.g., "40.7128,-74.0060").`
