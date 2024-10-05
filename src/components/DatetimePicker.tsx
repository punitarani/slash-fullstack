"use client";

import * as React from "react";
import { CalendarIcon, Clock } from "lucide-react";
import { format, setHours, setMinutes, addMinutes } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function DatePicker({ 
  date, 
  setDate, 
  startDate, 
  endDate 
}: { 
  date: Date; 
  setDate: (date: Date) => void;
  startDate: Date;
  endDate: Date;
}) {
  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
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
          onSelect={(newDate) => newDate && setDate(newDate)}
          initialFocus
          fromDate={startDate}
          toDate={endDate}
        />
      </PopoverContent>
    </Popover>
  );
}

function TimePicker({ date, setDate, startDate }: { date: Date; setDate: (date: Date) => void; startDate: Date }) {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const startHour = isToday ? now.getHours() : 0;
  const startMinute = isToday ? Math.ceil(now.getMinutes() / 15) * 15 : 0;

  const hours = Array.from({ length: 24 }, (_, i) => i).filter(hour => hour >= startHour);
  const minutes = Array.from({ length: 60 / 15 }, (_, i) => i * 15).filter(minute => !isToday || minute >= startMinute);

  const handleHourChange = (hour: string) => {
    const newDate = new Date(date);
    newDate.setHours(Number.parseInt(hour, 10));
    setDate(newDate);
  };

  const handleMinuteChange = (minute: string) => {
    const newDate = new Date(date);
    newDate.setMinutes(Number.parseInt(minute, 10));
    setDate(newDate);
  };

  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
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
          <Select onValueChange={handleHourChange} value={date.getHours().toString()}>
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="Hour" />
            </SelectTrigger>
            <SelectContent>
              {hours.map((hour) => (
                <SelectItem key={hour} value={hour.toString()}>
                  {hour.toString().padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={handleMinuteChange} value={date.getMinutes().toString()}>
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="Minute" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((minute) => (
                <SelectItem key={minute} value={minute.toString()}>
                  {minute.toString().padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DateTimePicker({
  date,
  setDate,
  startDate,
  endDate,
}: {
  date: Date;
  setDate: (date: Date) => void;
  startDate: Date;
  endDate: Date;
}) {
  return (
    <div className="flex space-x-2">
      <DatePicker date={date} setDate={setDate} startDate={startDate} endDate={endDate} />
      <TimePicker date={date} setDate={setDate} startDate={startDate} />
    </div>
  );
}
