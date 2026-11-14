import { useEffect, useRef, useState } from 'react'

let mapsApiPromise

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (mapsApiPromise) return mapsApiPromise

  mapsApiPromise = new Promise((resolve, reject) => {
    const callbackName = `freelanceReachMapsReady${Date.now()}`
    const script = document.createElement('script')
    window[callbackName] = () => {
      delete window[callbackName]
      resolve(window.google.maps)
    }
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}&loading=async`
    script.async = true
    script.onerror = () => {
      delete window[callbackName]
      mapsApiPromise = null
      reject(new Error('Google Maps could not load. Check the browser key and Maps JavaScript API settings.'))
    }
    document.head.appendChild(script)
  })
  return mapsApiPromise
}

export default function GooglePlacesMap({ businesses }) {
  const mapElement = useRef(null)
  const [error, setError] = useState('')
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (!businesses.length || !apiKey || !mapElement.current) return undefined
    let cancelled = false
    let map
    let markers = []
    const locations = businesses.filter((business) => Number.isFinite(business.coordinates?.lat) && Number.isFinite(business.coordinates?.lng))

    if (!locations.length) return undefined

    loadGoogleMaps(apiKey).then((maps) => {
      if (cancelled || !mapElement.current) return
      setError('')
      const first = locations[0].coordinates
      map = new maps.Map(mapElement.current, {
        center: first,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false
      })
      const bounds = new maps.LatLngBounds()
      const infoWindow = new maps.InfoWindow()
      markers = locations.map((business) => {
        const marker = new maps.Marker({
          map,
          position: business.coordinates,
          title: business.businessName
        })
        bounds.extend(business.coordinates)
        marker.addListener('click', () => {
          const content = document.createElement('div')
          const name = document.createElement('strong')
          const address = document.createElement('p')
          name.textContent = business.businessName
          address.textContent = [business.category, business.location, business.businessPhone].filter(Boolean).join(' · ')
          content.append(name, address)
          infoWindow.setContent(content)
          infoWindow.open({ map, anchor: marker })
        })
        return marker
      })
      if (locations.length > 1) map.fitBounds(bounds, 48)
    }).catch((loadError) => {
      if (!cancelled) setError(loadError.message || 'Google Maps could not load.')
    })

    return () => {
      cancelled = true
      markers.forEach((marker) => marker.setMap(null))
    }
  }, [businesses, apiKey])

  if (!businesses.length) return null
  if (!apiKey) {
    return <div className="discovery-map-notice"><strong>Interactive map setup needed</strong><p>Add a browser-restricted Google Maps key as <code>VITE_GOOGLE_MAPS_API_KEY</code> in the client environment. Keep the server Places key private.</p></div>
  }
  if (!businesses.some((business) => Number.isFinite(business.coordinates?.lat) && Number.isFinite(business.coordinates?.lng))) {
    return <div className="discovery-map-error" role="status">Google Maps did not return map coordinates for these listings.</div>
  }

  return <div className="discovery-map-wrap">
    {error ? <div className="discovery-map-error" role="status">{error}</div> : <div className="discovery-map" ref={mapElement} aria-label="Map of discovered businesses" />}
    <small>Map data © Google</small>
  </div>
}
