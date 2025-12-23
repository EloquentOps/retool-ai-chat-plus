import React, { useEffect, useRef, useState } from 'react'
import { type FC } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, DateSelectArg, EventClickArg, EventContentArg, DatesSetArg } from '@fullcalendar/core'

interface FullCalendarSourceData {
  events: EventInput[]
  initialView?: string
  initialDate?: string
  title?: string
}

interface FullCalendarWidgetProps {
  source: FullCalendarSourceData | EventInput[] | string
  onWidgetCallback?: (payload: Record<string, unknown>) => void
  widgetsOptions?: Record<string, unknown>
  historyIndex?: number
}

const FullCalendarWidgetComponent: FC<FullCalendarWidgetProps> = ({ 
  source, 
  onWidgetCallback, 
  widgetsOptions,
  historyIndex: _historyIndex 
}) => {
  const calendarRef = useRef<FullCalendar | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [events, setEvents] = useState<EventInput[]>([])
  const [sourceInitialView, setSourceInitialView] = useState<string | undefined>(undefined)
  const [sourceInitialDate, setSourceInitialDate] = useState<string | undefined>(undefined)
  const [sourceTitle, setSourceTitle] = useState<string | undefined>(undefined)

  // Extract initial view synchronously from source if it's an object (for first render)
  const syncInitialView = React.useMemo(() => {
    if (!source || typeof source === 'string') {
      return undefined
    }
    
    if (typeof source === 'object' && !Array.isArray(source) && 'events' in source) {
      const sourceData = source as FullCalendarSourceData
      return sourceData.initialView
    }
    
    return undefined
  }, [source])

  // Extract initial date synchronously from source if it's an object (for first render)
  const syncInitialDate = React.useMemo(() => {
    if (!source || typeof source === 'string') {
      return undefined
    }
    
    if (typeof source === 'object' && !Array.isArray(source) && 'events' in source) {
      const sourceData = source as FullCalendarSourceData
      return sourceData.initialDate
    }
    
    return undefined
  }, [source])

  // Default options
  const defaultOptions = {
    height: '400px',
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    editable: false,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    firstDay: 0, // Sunday
    locale: 'en'
  }

  // Merge with widget options and source data options
  const effectiveOptions = React.useMemo(() => {
    const options = {
      ...defaultOptions,
      ...(widgetsOptions?.fullcalendar as Record<string, unknown> || {})
    }
    
    // Override with source data options if provided (use sync value for first render, then state value)
    const initialViewToUse = sourceInitialView ?? syncInitialView
    if (initialViewToUse) {
      options.initialView = initialViewToUse
    }
    
    return options
  }, [widgetsOptions?.fullcalendar, sourceInitialView, syncInitialView])

  // Parse and validate source data
  useEffect(() => {
    if (!source) {
      setEvents([])
      setSourceInitialView(undefined)
      setSourceInitialDate(undefined)
      setSourceTitle(undefined)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      let parsedData: FullCalendarSourceData | EventInput[]
      let parsedEvents: EventInput[]
      let initialView: string | undefined
      let initialDate: string | undefined
      let title: string | undefined

      if (typeof source === 'string') {
        parsedData = JSON.parse(source)
      } else {
        parsedData = source
      }

      // Check if it's the new object format with events array
      if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData) && 'events' in parsedData) {
        const sourceData = parsedData as FullCalendarSourceData
        
        // Extract events array
        parsedEvents = sourceData.events
        initialView = sourceData.initialView
        initialDate = sourceData.initialDate
        title = sourceData.title
        
        // Validate events is an array
        if (!Array.isArray(parsedEvents)) {
          throw new Error('Events must be an array')
        }
      } else if (Array.isArray(parsedData)) {
        // Legacy format: just an array of events
        parsedEvents = parsedData
        initialView = undefined
        initialDate = undefined
        title = undefined
      } else {
        throw new Error('Source must be an object with events array, an array of events, or a JSON string')
      }

      // Validate each event has at least a title and start date
      const validatedEvents = parsedEvents
        .map((event, index) => {
          if (typeof event !== 'object' || event === null) {
            console.warn(`Event at index ${index} is not a valid object, skipping`)
            return null
          }

          const eventObj = event as EventInput

          if (!eventObj.title && !eventObj.display) {
            console.warn(`Event at index ${index} is missing a title`)
          }

          if (!eventObj.start) {
            console.warn(`Event at index ${index} is missing a start date, skipping`)
            return null
          }

          return eventObj
        })
        .filter((event): event is EventInput => event !== null)

      console.log('FullCalendarWidget: Parsed events:', validatedEvents)
      console.log('FullCalendarWidget: Initial view:', initialView)
      console.log('FullCalendarWidget: Initial date:', initialDate)
      console.log('FullCalendarWidget: Title:', title)

      setEvents(validatedEvents)
      setSourceInitialView(initialView)
      setSourceInitialDate(initialDate)
      setSourceTitle(title)
    } catch (err) {
      const errorMsg = `Invalid calendar data: ${err instanceof Error ? err.message : 'Unknown error'}`
      setError(errorMsg)
      console.error('FullCalendarWidget: Error parsing events:', err)
      setEvents([])
      setSourceInitialView(undefined)
      setSourceInitialDate(undefined)
      setSourceTitle(undefined)
    } finally {
      setIsLoading(false)
    }
  }, [source])

  // Update events when they change (using API as fallback to ensure events are displayed)
  useEffect(() => {
    if (calendarRef.current && events.length >= 0) {
      // Use requestAnimationFrame to ensure calendar is fully rendered
      requestAnimationFrame(() => {
        const calendarApi = calendarRef.current?.getApi()
        if (calendarApi) {
          try {
            // Remove all existing events
            calendarApi.removeAllEvents()
            // Add new events one by one
            events.forEach((event) => {
              calendarApi.addEvent(event)
            })
            console.log('FullCalendarWidget: Updated calendar events via API:', events)
          } catch (err) {
            console.warn('FullCalendarWidget: Error updating events:', err)
          }
        }
      })
    }
  }, [events])

  // Handle view changes when sourceInitialView changes
  useEffect(() => {
    if (sourceInitialView && calendarRef.current) {
      // Use requestAnimationFrame to ensure calendar is fully rendered
      requestAnimationFrame(() => {
        const calendarApi = calendarRef.current?.getApi()
        if (calendarApi) {
          try {
            const currentView = calendarApi.view.type
            // Only change view if it's different from current view
            if (currentView !== sourceInitialView) {
              calendarApi.changeView(sourceInitialView)
            }
          } catch (err) {
            console.warn(`FullCalendarWidget: Invalid view "${sourceInitialView}". Using default view.`, err)
          }
        }
      })
    }
  }, [sourceInitialView])

  // Handle date changes when sourceInitialDate changes
  useEffect(() => {
    if (sourceInitialDate && calendarRef.current) {
      // Use requestAnimationFrame to ensure calendar is fully rendered
      requestAnimationFrame(() => {
        const calendarApi = calendarRef.current?.getApi()
        if (calendarApi) {
          try {
            const currentDate = calendarApi.getDate()
            const targetDate = new Date(sourceInitialDate)
            
            // Only navigate if the date is different
            if (currentDate.getTime() !== targetDate.getTime()) {
              calendarApi.gotoDate(targetDate)
            }
          } catch (err) {
            console.warn(`FullCalendarWidget: Invalid initial date "${sourceInitialDate}". Using default date.`, err)
          }
        }
      })
    }
  }, [sourceInitialDate])

  // Handle date selection
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    onWidgetCallback?.({
      type: 'fullcalendar:date_selected',
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      allDay: selectInfo.allDay,
      timestamp: Date.now()
    })
  }

  // Handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    onWidgetCallback?.({
      type: 'fullcalendar:event_clicked',
      event: {
        id: clickInfo.event.id,
        title: clickInfo.event.title,
        start: clickInfo.event.startStr,
        end: clickInfo.event.endStr,
        allDay: clickInfo.event.allDay,
        extendedProps: clickInfo.event.extendedProps
      },
      timestamp: Date.now()
    })
  }

  // Handle event drop/resize (if editable)
  const handleEventChange = (changeInfo: { event: { id: string; startStr: string; endStr: string } }) => {
    onWidgetCallback?.({
      type: 'fullcalendar:event_changed',
      event: {
        id: changeInfo.event.id,
        start: changeInfo.event.startStr,
        end: changeInfo.event.endStr
      },
      timestamp: Date.now()
    })
  }

  // Handle view change (datesSet fires when calendar navigates to a new date range)
  const handleDatesSet = (dateSetInfo: DatesSetArg) => {
    onWidgetCallback?.({
      type: 'fullcalendar:view_changed',
      start: dateSetInfo.startStr,
      end: dateSetInfo.endStr,
      startDate: dateSetInfo.startStr, // Explicit startDate parameter for easier access
      endDate: dateSetInfo.endStr, // Explicit endDate parameter for easier access
      view: dateSetInfo.view.type,
      timestamp: Date.now()
    })
  }

  // Custom event content renderer
  const renderEventContent = (eventInfo: EventContentArg) => {
    return (
      <div style={{ 
        padding: '2px 4px',
        fontSize: '12px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        <b>{eventInfo.timeText}</b> {eventInfo.event.title}
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#666',
        fontSize: '14px',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <div>⏳</div>
        <div>Loading calendar...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
        fontSize: '14px',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <div>❌</div>
        <div>{error}</div>
      </div>
    )
  }

  return (
    <div style={{ 
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      padding: '8px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {sourceTitle && (
        <div style={{
          padding: '12px 16px',
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '8px',
          boxSizing: 'border-box'
        }}>
          {sourceTitle}
        </div>
      )}
      <div style={{
        width: '100%',
        maxWidth: '100%',
        height: effectiveOptions.height as string | number | undefined,
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={effectiveOptions.initialView as string}
        initialDate={sourceInitialDate ?? syncInitialDate ?? undefined}
        headerToolbar={effectiveOptions.headerToolbar as { left?: string; center?: string; right?: string }}
        events={events}
        editable={effectiveOptions.editable as boolean}
        selectable={effectiveOptions.selectable as boolean}
        selectMirror={effectiveOptions.selectMirror as boolean}
        dayMaxEvents={effectiveOptions.dayMaxEvents as boolean | number}
        weekends={effectiveOptions.weekends as boolean}
        firstDay={effectiveOptions.firstDay as number}
        locale={effectiveOptions.locale as string}
        height={effectiveOptions.height as string | number | undefined}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventChange={handleEventChange}
        datesSet={handleDatesSet}
        eventContent={renderEventContent}
      />
      </div>
    </div>
  )
}

// Memoized component to prevent unnecessary re-renders
export const FullCalendarWidget = React.memo(FullCalendarWidgetComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders when props haven't meaningfully changed
  const prevSource = prevProps.source
  const nextSource = nextProps.source
  
  // Compare source data (object with events array, or legacy array/string format)
  if (typeof prevSource === 'string' && typeof nextSource === 'string') {
    // String comparison
    if (prevSource !== nextSource) {
      return false // Source changed, allow re-render
    }
  } else if (Array.isArray(prevSource) && Array.isArray(nextSource)) {
    // Legacy array format comparison
    if (prevSource.length !== nextSource.length) {
      return false // Different lengths, allow re-render
    }
    
    // Compare each event
    for (let i = 0; i < prevSource.length; i++) {
      if (JSON.stringify(prevSource[i]) !== JSON.stringify(nextSource[i])) {
        return false // Event changed, allow re-render
      }
    }
  } else if (typeof prevSource === 'object' && typeof nextSource === 'object' && 
             prevSource !== null && nextSource !== null &&
             !Array.isArray(prevSource) && !Array.isArray(nextSource)) {
    // New object format comparison
    const prevData = prevSource as FullCalendarSourceData
    const nextData = nextSource as FullCalendarSourceData
    
    // Compare initialView, initialDate, and title
    if (prevData.initialView !== nextData.initialView || 
        prevData.initialDate !== nextData.initialDate || 
        prevData.title !== nextData.title) {
      return false // Options changed, allow re-render
    }
    
    // Compare events array
    if (!Array.isArray(prevData.events) || !Array.isArray(nextData.events)) {
      return false // Invalid format, allow re-render
    }
    
    if (prevData.events.length !== nextData.events.length) {
      return false // Different lengths, allow re-render
    }
    
    // Compare each event
    for (let i = 0; i < prevData.events.length; i++) {
      if (JSON.stringify(prevData.events[i]) !== JSON.stringify(nextData.events[i])) {
        return false // Event changed, allow re-render
      }
    }
  } else {
    // Different types, allow re-render
    return false
  }
  
  // Compare widgetsOptions for fullcalendar specific settings
  const prevOptions = prevProps.widgetsOptions?.fullcalendar as Record<string, unknown>
  const nextOptions = nextProps.widgetsOptions?.fullcalendar as Record<string, unknown>
  
  if (JSON.stringify(prevOptions) !== JSON.stringify(nextOptions)) {
    return false // Options changed, allow re-render
  }
  
  // Compare historyIndex
  if (prevProps.historyIndex !== nextProps.historyIndex) {
    return false // History index changed, allow re-render
  }
  
  // Props are the same, prevent re-render
  return true
})

// Export the instruction for this widget
export const FullCalendarWidgetInstruction = {
  type: 'fullcalendar',
  instructions: `Use this widget when the user requests to display a calendar with events, schedule, appointments, meetings, or any time-based data visualization. Perfect for showing events, deadlines, schedules, availability, or any date-related information. The calendar supports multiple views (month, week, day) and interactive features like date selection and event clicking.

CONTEXT INFORMATION FOR DATE REASONING:
Current date and time: ${new Date().toISOString()}
Use this information to calculate relative dates correctly (e.g., "next Friday", "next week", "in 3 days"). When the user mentions relative time periods, calculate the actual dates based on the current date/time provided above.`,
  sourceDataModel: {
    events: [
      {
        title: 'The title of the event (string, required)',
        start: 'The start date/time of the event in ISO 8601 format (string, required). Examples: "2024-01-15" for all-day events, "2024-01-15T10:00:00" for timed events',
        end: 'The end date/time of the event in ISO 8601 format (string, optional). If not provided, event is treated as a single-day event',
        allDay: 'Whether the event is an all-day event (boolean, optional, default: false)',
        color: 'The background color of the event (string, optional). Examples: "#3788d8", "red", "#ff0000"',
        textColor: 'The text color of the event (string, optional)',
        extendedProps: 'Additional custom properties for the event (object, optional)',
        id: 'Unique identifier for the event (string, optional)'
      }
    ],
    initialView: 'The initial view of the calendar (string, optional). Options: "dayGridMonth", "timeGridWeek", "timeGridDay". Default: "dayGridMonth"',
    initialDate: 'The initial date to display in the calendar view (string, optional). Should be in ISO 8601 format (e.g., "2024-01-15" or "2024-01-15T10:00:00"). The calendar will navigate to show this date when it first loads. If not provided, defaults to today\'s date',
    title: 'The title displayed in the calendar header (string, optional). If not provided, defaults to the current date range'
  }
}

