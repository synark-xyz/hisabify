import { useState, useEffect } from "react";
import { format, setMonth, setYear, setDate, getDaysInMonth, set } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DateSelectProps {
    value: Date | undefined;
    onChange: (date: Date) => void;
    label?: string;
    className?: string;
    minYear?: number;
    maxYear?: number;
}

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export function DateSelect({
    value,
    onChange,
    label,
    className,
    minYear = new Date().getFullYear() - 5,
    maxYear = new Date().getFullYear() + 20
}: DateSelectProps) {
    // If no value provided, use today? Or null? The prop says Date | undefined, but onChange expects Date.
    // Standardizing on always returning a valid date if possible, or handling null implies input clearing.
    // For this specific use case (Budget/Goal), we usually want a date.

    const dateValue = value || new Date();

    const [day, setDay] = useState(dateValue.getDate().toString());
    const [month, setMonthVal] = useState(dateValue.getMonth().toString());
    const [year, setYearVal] = useState(dateValue.getFullYear().toString());

    useEffect(() => {
        if (value) {
            setDay(value.getDate().toString());
            setMonthVal(value.getMonth().toString());
            setYearVal(value.getFullYear().toString());
        }
    }, [value]);

    const updateDate = (d: string, m: string, y: string) => {
        const dayNum = parseInt(d);
        const monthNum = parseInt(m);
        const yearNum = parseInt(y);

        if (!isNaN(dayNum) && !isNaN(monthNum) && !isNaN(yearNum)) {
            // Validate day range for the month
            const daysInMonth = getDaysInMonth(new Date(yearNum, monthNum));
            const validDay = Math.min(Math.max(1, dayNum), daysInMonth);

            const newDate = set(new Date(), {
                year: yearNum,
                month: monthNum,
                date: validDay,
                hours: 12, // Avoid timezone/midnight issues by setting to noon
                minutes: 0,
                seconds: 0,
                milliseconds: 0
            });
            onChange(newDate);
        }
    };

    const handleDayChange = (val: string) => {
        // Determine max days for current month/year selection
        const maxDays = getDaysInMonth(new Date(parseInt(year), parseInt(month)));

        // Allow typing, but clamp on blur or validate on effect? 
        // Usually simple clamp on change is better for day input if user types '32'
        if (val === '') {
            setDay('');
            return;
        }

        const num = parseInt(val);
        if (!isNaN(num)) {
            // Just update state, updateDate will handle validation/date construction
            setDay(val);
            // Only trigger update if it's potentially valid length or blur? 
            // For better UX, let's trigger updateDate with current valid parsable values
            updateDate(val, month, year);
        }
    };

    const handleMonthChange = (val: string) => {
        setMonthVal(val);
        updateDate(day, val, year);
    };

    const handleYearChange = (val: string) => {
        setYearVal(val);
        if (val.length === 4) {
            updateDate(day, month, val);
        }
    };

    // Generate range items for clearer Select? No, Number input for Day/Year is requested "Day/Month/Year".
    // Month is better as Select (names).
    // Day and Year as Inputs.

    return (
        <div className={cn("space-y-1.5", className)}>
            {label && <Label>{label}</Label>}
            <div className="flex gap-2">
                {/* Day */}
                <div className="w-20">
                    <Input
                        type="number"
                        placeholder="DD"
                        value={day}
                        onChange={(e) => handleDayChange(e.target.value)}
                        onBlur={() => {
                            // Ensure valid range on blur
                            const d = parseInt(day);
                            const maxDays = getDaysInMonth(new Date(parseInt(year), parseInt(month)));
                            if (isNaN(d) || d < 1) setDay('1');
                            else if (d > maxDays) setDay(maxDays.toString());
                        }}
                        className="text-center"
                        min={1}
                        max={31}
                    />
                </div>

                {/* Month */}
                <div className="flex-1">
                    <Select value={month} onValueChange={handleMonthChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                    {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Year */}
                <div className="w-24">
                    <Input
                        type="number"
                        placeholder="YYYY"
                        value={year}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="text-center"
                        min={minYear}
                        max={maxYear}
                    />
                </div>
            </div>
        </div>
    );
}
