"use client";

import clsx from "clsx";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type ComponentProps, type KeyboardEvent } from "react";
import "./date-picker.css";

const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const fullDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** A local calendar date, deliberately without conversion through UTC. */
export function localDateValue(date = new Date()): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (year < 100) date.setFullYear(year);
  return year > 0 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function displayDate(value: string): string {
  return parseDate(value) ? value.split("-").reverse().join("/") : "";
}

function parseDisplay(value: string): string {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  const result = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return parseDate(result) ? result : "";
}

function monthStart(date: Date) {
  const result = new Date(date);
  result.setDate(1);
  return result;
}

function moveMonth(date: Date, amount: number) {
  const next = monthStart(date);
  next.setMonth(next.getMonth() + amount);
  const end = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), end));
  return next;
}

type DatePickerProps = Omit<ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "size"> & {
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function DatePicker({ id, name, value, defaultValue = "", onChange, min, max, disabled, readOnly, required, className, placeholder = "jj/mm/aaaa", onKeyDown, onBlur, ...props }: DatePickerProps) {
  const generatedId = useId();
  const inputId = id ?? `date-${generatedId}`;
  const calendarId = `${inputId}-calendar`;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const selectedValue = value ?? uncontrolledValue;
  const [draft, setDraft] = useState<{ value: string; text: string } | null>(null);
  const text = draft?.value === selectedValue ? draft.text : displayDate(selectedValue);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months" | "years">("days");
  const [focused, setFocused] = useState(() => parseDate(selectedValue) ?? new Date());
  const [month, setMonth] = useState(() => monthStart(parseDate(selectedValue) ?? new Date()));
  const [yearPage, setYearPage] = useState(() => Math.floor(month.getFullYear() / 12) * 12);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const focusRequested = useRef(false);
  const today = localDateValue();
  const minValue = parseDate(min) ? min! : "0001-01-01";
  const maxValue = parseDate(max) ? max! : "9999-12-31";
  const isAllowed = (date: Date) => {
    const dateValue = localDateValue(date);
    return dateValue >= minValue && dateValue <= maxValue;
  };
  const clamp = (date: Date) => parseDate(date.getFullYear() < 1 || localDateValue(date) < minValue ? minValue : date.getFullYear() > 9999 || localDateValue(date) > maxValue ? maxValue : localDateValue(date))!;

  function updateValue(next: string) {
    if (value === undefined) setUncontrolledValue(next);
    const input = valueRef.current;
    if (!input) return;
    input.value = next;
    const nativeEvent = new Event("change", { bubbles: true });
    // Keep the same e.target.value contract as the other form fields.
    onChange?.({
      target: input, currentTarget: input, nativeEvent, type: "change", bubbles: true, cancelable: false,
      defaultPrevented: false, eventPhase: 3, isTrusted: false, timeStamp: nativeEvent.timeStamp,
      preventDefault: () => nativeEvent.preventDefault(), stopPropagation: () => nativeEvent.stopPropagation(),
      isDefaultPrevented: () => nativeEvent.defaultPrevented, isPropagationStopped: () => nativeEvent.cancelBubble, persist: () => {},
    });
  }

  function close(restoreFocus = false) {
    popupRef.current?.hidePopover?.();
    setOpen(false);
    if (restoreFocus) inputRef.current?.focus();
  }

  function showCalendar() {
    if (disabled || readOnly) return;
    const next = clamp(parseDate(selectedValue) ?? new Date());
    setFocused(next);
    setMonth(monthStart(next));
    setView("days");
    focusRequested.current = true;
    setOpen(true);
    popupRef.current?.showPopover?.();
  }

  function choose(date: Date | null) {
    if (disabled || readOnly) return;
    if (date && !isAllowed(date)) return;
    setDraft(null);
    updateValue(date ? localDateValue(date) : "");
    close(true);
  }

  function focusDate(date: Date) {
    const next = clamp(date);
    focusRequested.current = true;
    setFocused(next);
    setMonth(monthStart(next));
  }

  function navigateMonth(amount: number) {
    const next = clamp(moveMonth(month, amount));
    setMonth(monthStart(next));
    setFocused(next);
  }

  function handleDayKey(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    const next = new Date(date);
    const offset = (date.getDay() + 6) % 7;
    switch (event.key) {
      case "ArrowLeft": next.setDate(date.getDate() - 1); break;
      case "ArrowRight": next.setDate(date.getDate() + 1); break;
      case "ArrowUp": next.setDate(date.getDate() - 7); break;
      case "ArrowDown": next.setDate(date.getDate() + 7); break;
      case "Home": next.setDate(date.getDate() - offset); break;
      case "End": next.setDate(date.getDate() + 6 - offset); break;
      case "PageUp": event.preventDefault(); focusDate(moveMonth(date, event.shiftKey ? -12 : -1)); return;
      case "PageDown": event.preventDefault(); focusDate(moveMonth(date, event.shiftKey ? 12 : 1)); return;
      default: return;
    }
    event.preventDefault();
    focusDate(next);
  }

  function handlePanelKey(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowLeft") next--;
    else if (event.key === "ArrowRight") next++;
    else if (event.key === "ArrowUp") next -= 3;
    else if (event.key === "ArrowDown") next += 3;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus();
  }

  useLayoutEffect(() => {
    if (!open) return;
    const popup = popupRef.current;
    const field = fieldRef.current;
    if (!popup || !field) return;
    const position = () => {
      const rect = field.getBoundingClientRect();
      const width = Math.min(320, window.innerWidth - 24);
      const height = Math.min(popup.scrollHeight, window.innerHeight - 24);
      const below = window.innerHeight - rect.bottom - 12;
      const top = below >= height || below >= rect.top - 12 ? rect.bottom + 8 : rect.top - height - 8;
      popup.style.width = `${width}px`;
      popup.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
      popup.style.top = `${Math.max(12, Math.min(top, window.innerHeight - height - 12))}px`;
      popup.style.maxHeight = `${window.innerHeight - 24}px`;
    };
    position();
    if (focusRequested.current) {
      popup.querySelector<HTMLButtonElement>(view === "days" ? `[data-date="${localDateValue(focused)}"]` : '[aria-pressed="true"]')?.focus({ preventScroll: true });
      focusRequested.current = false;
    }
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, view, month, focused, yearPage]);

  useEffect(() => {
    const parsed = parseDisplay(text);
    let message = "";
    if (text && !parsed) message = "Saisissez une date valide au format jj/mm/aaaa.";
    else if (parsed && parsed < minValue) message = `Choisissez une date à partir du ${displayDate(minValue)}.`;
    else if (parsed && parsed > maxValue) message = `Choisissez une date jusqu’au ${displayDate(maxValue)}.`;
    inputRef.current?.setCustomValidity(message);
  }, [text, minValue, maxValue]);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form || value !== undefined) return;
    const reset = () => { setDraft(null); setUncontrolledValue(defaultValue); close(); };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [value, defaultValue]);

  useEffect(() => {
    if (disabled || readOnly) popupRef.current?.hidePopover?.();
  }, [disabled, readOnly]);

  const first = monthStart(month);
  first.setDate(1 - (first.getDay() + 6) % 7);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
  const monthAllowed = (year: number, monthIndex: number) => {
    if (year < 1 || year > 9999) return false;
    const start = new Date(year, monthIndex, 1, 12);
    const end = new Date(year, monthIndex + 1, 0, 12);
    if (year < 100) { start.setFullYear(year); end.setFullYear(year); }
    return localDateValue(end) >= minValue && localDateValue(start) <= maxValue;
  };
  const adjacent = (amount: number) => {
    const next = moveMonth(month, amount);
    return monthAllowed(next.getFullYear(), next.getMonth());
  };

  return (
    <div className="date-picker" ref={fieldRef}>
      <input ref={valueRef} type="hidden" name={name} value={selectedValue} disabled={disabled} form={props.form} readOnly />
      <div className="date-picker-field">
        <input
          {...props}
          ref={inputRef}
          id={inputId}
          className={clsx("field-input date-picker-input", className)}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={text}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={props.autoComplete ?? "off"}
          role="combobox"
          aria-autocomplete="none"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={calendarId}
          onChange={(event) => {
            const raw = event.target.value;
            const parsed = parseDisplay(raw);
            const next = parsed && parsed >= minValue && parsed <= maxValue ? parsed : "";
            setDraft({ value: next, text: raw });
            updateValue(next);
          }}
          onBlur={(event) => {
            if (!text || (parseDisplay(text) && parseDisplay(text) >= minValue && parseDisplay(text) <= maxValue)) setDraft(null);
            onBlur?.(event);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.defaultPrevented) return;
            if (event.key === "ArrowDown" || (event.altKey && event.key === "ArrowUp")) { event.preventDefault(); showCalendar(); }
            else if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
          }}
        />
        <button type="button" className="date-picker-trigger" disabled={disabled || readOnly} aria-label="Ouvrir le calendrier" aria-haspopup="dialog" aria-expanded={open} aria-controls={calendarId} onClick={() => open ? close(true) : showCalendar()}>
          <CalendarDays size={18} aria-hidden="true" />
        </button>
      </div>
      <div
        ref={popupRef}
        id={calendarId}
        popover="auto"
        className="date-picker-popover"
        role="dialog"
        aria-label="Choisir une date"
        onToggle={(event) => setOpen(event.newState === "open")}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); }
        }}
        onBlurCapture={(event) => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && !fieldRef.current?.contains(event.relatedTarget)) close();
        }}
      >
        <div className="date-picker-heading">
          <span className="date-picker-eyebrow">CHOISIR UNE DATE</span>
          <span className="date-picker-format">JJ / MM / AAAA</span>
        </div>
        <div className="date-picker-navigation">
          <button type="button" className="date-picker-nav" aria-label={view === "years" ? "Années précédentes" : view === "months" ? "Année précédente" : "Mois précédent"} disabled={view === "years" ? yearPage <= Number(minValue.slice(0, 4)) : !adjacent(view === "months" ? -12 : -1)} onClick={() => view === "years" ? setYearPage((year) => year - 12) : navigateMonth(view === "months" ? -12 : -1)}><ChevronLeft size={18} aria-hidden="true" /></button>
          <div className="date-picker-period" aria-live="polite">
            {view === "years" ? <span>{Math.max(1, yearPage)} – {Math.min(9999, yearPage + 11)}</span> : <>
              <button type="button" aria-label={`Choisir le mois, ${months[month.getMonth()]}`} className="date-picker-period-button" onClick={() => { focusRequested.current = true; setView(view === "months" ? "days" : "months"); }}>{months[month.getMonth()]}<ChevronDown size={13} aria-hidden="true" /></button>
              <button type="button" aria-label={`Choisir l’année, ${month.getFullYear()}`} className="date-picker-period-button" onClick={() => { focusRequested.current = true; setYearPage(Math.floor(month.getFullYear() / 12) * 12); setView("years"); }}>{month.getFullYear()}<ChevronDown size={13} aria-hidden="true" /></button>
            </>}
          </div>
          <button type="button" className="date-picker-nav" aria-label={view === "years" ? "Années suivantes" : view === "months" ? "Année suivante" : "Mois suivant"} disabled={view === "years" ? yearPage + 11 >= Number(maxValue.slice(0, 4)) : !adjacent(view === "months" ? 12 : 1)} onClick={() => view === "years" ? setYearPage((year) => year + 12) : navigateMonth(view === "months" ? 12 : 1)}><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
        {view === "days" ? (
          <table className="date-picker-grid" role="grid" aria-label={`${months[month.getMonth()]} ${month.getFullYear()}`}>
            <thead><tr>{weekdays.map((day) => <th key={day} scope="col">{day}</th>)}</tr></thead>
            <tbody>{Array.from({ length: 6 }, (_, row) => <tr key={row}>{days.slice(row * 7, row * 7 + 7).map((date) => {
              const dateValue = localDateValue(date);
              const selected = dateValue === selectedValue;
              return <td key={dateValue} aria-selected={selected}><button type="button" data-date={dateValue} className={clsx("date-picker-day", date.getMonth() !== month.getMonth() && "is-outside", selected && "is-selected", dateValue === today && "is-today")} tabIndex={dateValue === localDateValue(focused) ? 0 : -1} aria-label={fullDate.format(date)} aria-current={dateValue === today ? "date" : undefined} disabled={!isAllowed(date)} onFocus={() => setFocused(date)} onKeyDown={(event) => handleDayKey(event, date)} onClick={() => choose(date)}>{date.getDate()}</button></td>;
            })}</tr>)}</tbody>
          </table>
        ) : (
          <div className="date-picker-panel" onKeyDown={handlePanelKey} role="group" aria-label={view === "months" ? "Choisir un mois" : "Choisir une année"}>
            {view === "months" ? months.map((label, index) => <button key={label} type="button" disabled={!monthAllowed(month.getFullYear(), index)} aria-pressed={month.getMonth() === index} onClick={() => { const date = new Date(month); date.setMonth(index); focusDate(clamp(date)); setView("days"); }}>{label.slice(0, 4)}{label.length > 4 ? "." : ""}</button>) : Array.from({ length: 12 }, (_, index) => yearPage + index).map((year) => <button key={year} type="button" disabled={year < Number(minValue.slice(0, 4)) || year > Number(maxValue.slice(0, 4))} aria-pressed={month.getFullYear() === year} onClick={() => { const date = new Date(month); date.setFullYear(year); const next = clamp(date); setMonth(monthStart(next)); focusRequested.current = true; setView("months"); }}>{year}</button>)}
          </div>
        )}
        <div className="date-picker-footer">
          <button type="button" disabled={!isAllowed(new Date())} onClick={() => choose(new Date())}>Aujourd’hui</button>
          <button type="button" disabled={!text} onClick={() => choose(null)}>Effacer</button>
        </div>
      </div>
    </div>
  );
}
