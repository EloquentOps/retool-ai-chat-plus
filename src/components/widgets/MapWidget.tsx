import React, { useEffect, useRef, useState } from 'react'
import { type FC } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

interface GMapWidgetProps {
  location: string
  width?: number
  height?: number
  zoom?: number
  apiKey?: string
}

export const GMapWidget: FC<GMapWidgetProps> = ({ 
  location, 
  width = '100%', 
  height = 300, 
  zoom = 15,
  apiKey 
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [marker, setMarker] = useState<google.maps.Marker | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current || !location) return

      try {
        setIsLoading(true)
        setError(null)

        // Initialize the Google Maps loader
        const loader = new Loader({
          apiKey: apiKey || process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
          libraries: ['places']
        })

        // Load the Google Maps API
        await loader.load()

        // Create geocoder instance
        const geocoder = new google.maps.Geocoder()

        // Geocode the location string to get coordinates
        geocoder.geocode({ address: location }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location_coords = results[0].geometry.location

            // Create map instance
            const mapInstance = new google.maps.Map(mapRef.current!, {
              center: location_coords,
              zoom: zoom,
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              styles: [
                {
                  featureType: 'poi',
                  elementType: 'labels',
                  stylers: [{ visibility: 'off' }]
                }
              ]
            })

            // Create marker
            const markerInstance = new google.maps.Marker({
              position: location_coords,
              map: mapInstance,
              title: location,
              animation: google.maps.Animation.DROP
            })

            // Add info window
            const infoWindow = new google.maps.InfoWindow({
              content: `<div style="padding: 8px;"><strong>${location}</strong></div>`
            })

            markerInstance.addListener('click', () => {
              infoWindow.open(mapInstance, markerInstance)
            })

            setMap(mapInstance)
            setMarker(markerInstance)
            setIsLoading(false)
          } else {
            setError(`Geocoding failed: ${status}`)
            setIsLoading(false)
          }
        })
      } catch (err) {
        setError(`Failed to load Google Maps: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setIsLoading(false)
      }
    }

    initializeMap()
  }, [location, zoom, apiKey])

  if (error) {
    return (
      <div style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '8px',
        color: '#666',
        fontSize: '14px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ marginBottom: '8px' }}>🗺️</div>
          <div>Map Error</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>{error}</div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '8px',
        color: '#666',
        fontSize: '14px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ marginBottom: '8px' }}>🗺️</div>
          <div>Loading map...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #ddd',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%' 
        }} 
      />
    </div>
  )
}

// Export the instruction for this widget
export const GMapWidgetInstruction = `
Format type: "map".
The source value should be a location string (e.g., "New York, NY", "1600 Amphitheatre Parkway, Mountain View, CA", "Times Square, New York").
Optional parameters:
- width: number (default: 400) - Map width in pixels
- height: number (default: 300) - Map height in pixels  
- zoom: number (default: 15) - Map zoom level (1-20)
- apiKey: string - Google Maps API key (if not provided, uses REACT_APP_GOOGLE_MAPS_API_KEY env var)
YOU MUST encode all the new lines as \\n.`
