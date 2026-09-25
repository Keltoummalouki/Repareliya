"use client";

import clsx from "clsx";
import { Check, ChevronDown, Search } from "lucide-react";
import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import "./select.css";

type Option = { value: string; label: string; disabled: boolean; group?: string };
type SelectProps = Omit<ComponentProps<"select">, "multiple" | "size"> & {
  searchable?: boolean;
  searchPlaceholder?: string;
};

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textContent(node.props.children);
  return "";
}
function readOptions(children: ReactNode, group?: string, groupDisabled = false): Option[] {
  const options: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ children?: ReactNode; value?: string | number; label?: string; disabled?: boolean }>(child)) return;
    if (child.type === Fragment) options.push(...readOptions(child.props.children, group, groupDisabled));
    if (child.type === "optgroup") options.push(...readOptions(child.props.children, child.props.label, !!child.props.disabled));
    if (child.type === "option") {
      const label = child.props.label ?? textContent(child.props.children);
      options.push({ value: String(child.props.value ?? textContent(child.props.children)), label, disabled: groupDisabled || !!child.props.disabled, group });
    }
  });
  return options;
}
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");

/** A styled single select that keeps a real form control for FormData and validation. */
export function Select({ children, className, value, defaultValue, onChange, id, disabled, required, searchable, searchPlaceholder = "Rechercher…", onInvalid, ref: forwardedRef, ...props }: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const popupId = `${triggerId}-popup`;
  const listId = `${triggerId}-listbox`;
  const options = useMemo(() => readOptions(children), [children]);
  const initialValue = String(defaultValue ?? options.find((option) => !option.disabled)?.value ?? "");
  const [internalValue, setInternalValue] = useState(initialValue);
  const selectedValue = value !== undefined ? String(value) : internalValue;
  const selected = options.find((option) => option.value === selectedValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const nativeRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ value: "", timestamp: 0 });
  const hasSearch = searchable ?? options.length > 7;
  const filtered = options.filter((option) => normalize(option.label).includes(normalize(query.trim())));
  const enabled = filtered.filter((option) => !option.disabled);
  const active = enabled.find((option) => option.value === activeValue) ?? enabled[0];
  const activeId = active ? `${listId}-${options.indexOf(active)}` : undefined;

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(Math.max(rect.width, 240), window.innerWidth - margin * 2);
    const below = window.innerHeight - rect.bottom - margin - 6;
    const above = rect.top - margin - 6;
    const useAbove = below < 220 && above > below;
    const maxHeight = Math.max(100, Math.min(360, useAbove ? above : below));
    popup.style.width = `${width}px`;
    popup.style.maxHeight = `${maxHeight}px`;
    popup.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin))}px`;
    popup.style.top = useAbove ? "auto" : `${Math.max(margin, rect.bottom + 6)}px`;
    popup.style.bottom = useAbove ? `${window.innerHeight - rect.top + 6}px` : "auto";
  }, []);

  const close = useCallback((restoreFocus = true) => {
    const popup = popupRef.current;
    if (popup?.matches(":popover-open")) popup.hidePopover();
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  function show(initialQuery = "", fromEnd = false) {
    if (disabled || !popupRef.current) return;
    setQuery(initialQuery);
    const available = options.filter((option) => !option.disabled && normalize(option.label).includes(normalize(initialQuery)));
    const start = available.find((option) => option.value === selectedValue) ?? (fromEnd ? available.at(-1) : available[0]);
    setActiveValue(start?.value ?? null);
    position();
    popupRef.current.showPopover();
    setOpen(true);
    if (hasSearch) searchRef.current?.focus({ preventScroll: true });
  }

  function choose(option: Option) {
    if (option.disabled || disabled) return;
    const control = nativeRef.current;
    if (control) {
      control.value = option.value;
      // Dispatch the native event so existing select onChange handlers receive a real target.
      control.dispatchEvent(new Event("change", { bubbles: true }));
    }
    close();
  }

  useEffect(() => {
    // A controlled select has no defaultSelected options when mounted client-side.
    // Keep the browser's form reset value aligned with the visible React value.
    const control = nativeRef.current;
    if (!control) return;
    const resetValue = value !== undefined ? selectedValue : initialValue;
    for (const option of control.options) option.defaultSelected = option.value === resetValue;
  }, [initialValue, selectedValue, value, children]);

  useEffect(() => {
    const control = nativeRef.current;
    const form = control?.form;
    if (!form) return;
    const reset = () => { setInternalValue(initialValue); setInvalid(false); close(false); };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [initialValue, close]);

  useEffect(() => {
    if (!open) return;
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    };
    const focusOutside = (event: FocusEvent) => {
      if (event.target instanceof Node && !popupRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) close(false);
    };
    document.addEventListener("keydown", escape, true);
    document.addEventListener("focusin", focusOutside);
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    return () => {
      document.removeEventListener("keydown", escape, true);
      document.removeEventListener("focusin", focusOutside);
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
    };
  }, [open, close, position]);

  useEffect(() => {
    if (open && activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId, open]);

  function handleKey(event: KeyboardEvent<HTMLElement>) {
    if (disabled) return;
    const isSearch = event.target === searchRef.current;
    if (event.key === "Tab") { close(false); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && !(isSearch && ["Home", "End"].includes(event.key))) {
      event.preventDefault();
      if (!open) { show("", event.key === "ArrowUp" || event.key === "End"); return; }
      const index = enabled.findIndex((option) => option.value === active?.value);
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : Math.max(0, Math.min(enabled.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
      setActiveValue(enabled[nextIndex]?.value ?? null);
    } else if (event.key === "Enter" || (!isSearch && event.key === " ")) {
      event.preventDefault();
      if (!open) show(); else if (active) choose(active);
    } else if (!isSearch && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = event.timeStamp;
      const typed = now - typeahead.current.timestamp > 700 ? event.key : typeahead.current.value + event.key;
      typeahead.current = { value: typed, timestamp: now };
      if (!open) show(hasSearch ? event.key : "");
      const match = options.find((option) => !option.disabled && normalize(option.label).startsWith(normalize(typed)));
      if (match) setActiveValue(match.value);
    }
  }

  const label = props["aria-label"] ?? "Options";
  return (
    <div className={clsx("custom-select", className?.split(/\s+/).includes("w-auto") && "custom-select-auto")}>
      <select
        {...props}
        id={`${triggerId}-native`}
        ref={(node) => {
          nativeRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        className="custom-select-native"
        aria-hidden="true"
        tabIndex={-1}
        disabled={disabled}
        required={required}
        value={selectedValue}
        onChange={(event) => { setInternalValue(event.target.value); setInvalid(false); onChange?.(event); }}
        onInvalid={(event) => { event.preventDefault(); setInvalid(true); triggerRef.current?.focus(); onInvalid?.(event); }}
      >
        {children}
      </select>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-describedby={[props["aria-describedby"], invalid ? `${triggerId}-error` : undefined].filter(Boolean).join(" ") || undefined}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-required={required || undefined}
        aria-invalid={invalid || props["aria-invalid"] || undefined}
        aria-activedescendant={open && !hasSearch ? activeId : undefined}
        disabled={disabled}
        popoverTarget={popupId}
        className={twMerge("field-input custom-select-trigger", className)}
        onClick={(event) => { event.preventDefault(); if (open) close(); else show(); }}
        onKeyDown={handleKey}
      >
        <span className={clsx("custom-select-value", selected?.disabled && "text-muted")}>{selected?.label ?? "Choisir une option…"}</span>
        <ChevronDown className="size-4 shrink-0 text-muted transition-transform" style={{ transform: open ? "rotate(180deg)" : undefined }} aria-hidden />
      </button>
      <div
        id={popupId}
        ref={popupRef}
        popover="auto"
        className="custom-select-popover"
        onToggle={(event) => setOpen(event.newState === "open")}
        onKeyDown={handleKey}
      >
        {hasSearch ? (
          <div className="custom-select-search">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              autoComplete="off"
              spellCheck={false}
              aria-label={`Rechercher : ${label}`}
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={listId}
              aria-activedescendant={open ? activeId : undefined}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActiveValue(null); }}
            />
          </div>
        ) : null}
        <div id={listId} role="listbox" aria-label={label} className="custom-select-options">
          {filtered.map((option, index) => (
            <Fragment key={option.value}>
              {option.group && option.group !== filtered[index - 1]?.group ? <div role="presentation" className="custom-select-group">{option.group}</div> : null}
              <div
                id={`${listId}-${options.indexOf(option)}`}
                role="option"
                aria-selected={option.value === selectedValue}
                aria-disabled={option.disabled || undefined}
                data-active={option.value === active?.value}
                className="custom-select-option"
                onPointerMove={() => !option.disabled && setActiveValue(option.value)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {option.value === selectedValue ? <Check className="size-4 shrink-0 text-brand-strong" aria-hidden /> : null}
              </div>
            </Fragment>
          ))}
          {!filtered.length ? <div role="status" className="custom-select-empty">Aucun résultat pour « {query} »</div> : null}
        </div>
        {hasSearch ? <div className="custom-select-count" aria-live="polite">{filtered.length} option{filtered.length > 1 ? "s" : ""}</div> : null}
      </div>
      {invalid ? <p id={`${triggerId}-error`} className="mt-1.5 text-[13px] text-danger" role="alert">Veuillez choisir une option.</p> : null}
    </div>
  );
}
