import * as React from "react"
import { CalendarIcon, Clock } from "lucide-react"
import { addMinutes, format, isSameDay, set, startOfDay, endOfDay, isAfter, isBefore, max, min } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DateTimePickerProps {
  date: Date
  setDate: (date: Date) => void
  startDate: Date
  endDate: Date
  tick?: number
}

export function DateTimePicker({ date, setDate, startDate, endDate, tick = 15 }: DateTimePickerProps) {
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      const adjustedDate = set(newDate, {
        hours: date.getHours(),
        minutes: date.getMinutes(),
      })
      setDate(clampDate(adjustedDate, startDate, endDate))
    }
  }

  const handleTimeChange = (type: "hours" | "minutes", value: string) => {
    const newDate = set(date, { [type]: Number.parseInt(value, 10) })
    setDate(clampDate(newDate, startDate, endDate))
  }

  return (
    <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0">
      <DatePicker date={date} onSelect={handleDateChange} startDate={startDate} endDate={endDate} />
      <TimePicker
        date={date}
        onChange={handleTimeChange}
        startDate={startDate}
        endDate={endDate}
        tick={tick}
      />
    </div>
  )
}

function DatePicker({ date, onSelect, startDate, endDate }: {
  date: Date
  onSelect: (date: Date | undefined) => void
  startDate: Date
  endDate: Date
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          fromDate={startDate}
          toDate={endDate}
        />
      </PopoverContent>
    </Popover>
  )
}

function TimePicker({ date, onChange, startDate, endDate, tick }: {
  date: Date
  onChange: (type: "hours" | "minutes", value: string) => void
  startDate: Date
  endDate: Date
  tick: number
}) {
  const minTime = max([startDate, startOfDay(date)])
  const maxTime = min([endDate, endOfDay(date)])

  const hours = generateHourOptions(minTime, maxTime)
  const minutes = generateMinuteOptions(date, minTime, maxTime, tick)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {date ? format(date, "p") : <span>Pick a time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex space-x-2">
          <TimeSelect
            value={date.getHours().toString()}
            onChange={(value) => onChange("hours", value)}
            options={hours}
            placeholder="Hour"
          />
          <TimeSelect
            value={date.getMinutes().toString()}
            onChange={(value) => onChange("minutes", value)}
            options={minutes}
            placeholder="Minute"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TimeSelect({ value, onChange, options, placeholder }: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-[70px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function generateHourOptions(minTime: Date, maxTime: Date) {
  const options = []
  const startHour = minTime.getHours()
  const endHour = maxTime.getHours()

  for (let hour = startHour; hour <= endHour; hour++) {
    options.push({
      value: hour.toString(),
      label: hour.toString().padStart(2, "0"),
    })
  }

  return options
}

function generateMinuteOptions(date: Date, minTime: Date, maxTime: Date, tick: number) {
  const options = []
  const isMinHour = date.getHours() === minTime.getHours()
  const isMaxHour = date.getHours() === maxTime.getHours()
  const now = new Date()
  const isToday = isSameDay(date, now)
  const isCurrentHour = isToday && date.getHours() === now.getHours()

  let startMinute = isMinHour ? minTime.getMinutes() : 0
  const endMinute = isMaxHour ? maxTime.getMinutes() : 59

  if (isCurrentHour) {
    startMinute = Math.ceil(now.getMinutes() / tick) * tick
    if (startMinute > 59) {
      return [] // No valid minutes for the current hour
    }
  }

  for (let minute = startMinute; minute <= endMinute; minute += tick) {
    options.push({
      value: minute.toString(),
      label: minute.toString().padStart(2, "0"),
    })
  }

  return options
}

function clampDate(date: Date, min: Date, max: Date): Date {
  return new Date(Math.min(Math.max(date.getTime(), min.getTime()), max.getTime()))
}
