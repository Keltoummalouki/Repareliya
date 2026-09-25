"use client";

import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  isSupportedCountry,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./field";
import { Select } from "./select";

function countryList() {
  const names = new Intl.DisplayNames(["fr"], { type: "region" });
  return getCountries()
    .map((code) => ({ code, name: names.of(code) ?? code, dial: getCountryCallingCode(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * Numéro de téléphone avec indicatif pays. Envoie `name` (numéro saisi) et `${name}_country` (code ISO du pays),
 * à convertir côté serveur avec `toValidE164(numéro, pays)`.
 */
export function PhoneInput({
  id,
  name,
  defaultCountry,
  required,
  error,
}: {
  id: string;
  name: string;
  defaultCountry: string;
  required?: boolean;
  error?: string;
}) {
  const countries = useMemo(() => countryList(), []);
  const [country, setCountry] = useState<CountryCode>(isSupportedCountry(defaultCountry) ? defaultCountry : "MA");
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const countryName = countries.find((c) => c.code === country)?.name ?? country;
  const invalid = value.trim() !== "" && !isValidPhoneNumber(value, country);
  const message = touched && invalid ? `Numéro invalide pour ${countryName} (+${getCountryCallingCode(country)}).` : error;

  // Le formulaire bloque l’envoi tant qu’un numéro est invalide (voir `validity.customError`)
  useEffect(() => {
    inputRef.current?.setCustomValidity(invalid ? "Numéro invalide." : "");
  }, [invalid]);

  // Numéro international collé ou saisi automatiquement : on bascule sur son pays et on l’affiche au format national
  function normalize(text: string) {
    const parsed = parsePhoneNumberFromString(text, country);
    if (!parsed?.isValid() || !parsed.country) return;
    setCountry(parsed.country);
    setValue(parsed.formatNational());
  }

  return (
    <div>
      <div className="flex">
        <Select
          name={`${name}_country`}
          value={country}
          onChange={(e) => setCountry(e.target.value as CountryCode)}
          aria-label="Indicatif du pays"
          searchPlaceholder="Pays ou indicatif…"
          renderValue={(code) => (
            <span className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-muted">{code}</span>
              <span className="tabular-nums">+{getCountryCallingCode(code as CountryCode)}</span>
            </span>
          )}
          className="w-auto rounded-r-none px-3 focus:relative focus:z-10"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {`${c.name} (+${c.dial})`}
            </option>
          ))}
        </Select>
        <Input
          ref={inputRef}
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={getExampleNumber(country, examples)?.formatNational()}
          maxLength={40}
          required={required}
          value={value}
          aria-invalid={Boolean(message)}
          className="-ml-px min-w-0 flex-1 rounded-l-none focus:relative focus:z-10"
          onChange={(e) => {
            const text = e.target.value.replace(/[^\d\s+().-]/g, "");
            setValue(text);
            const inputType = (e.nativeEvent as InputEvent).inputType;
            if (!inputType || inputType === "insertFromPaste" || inputType === "insertReplacementText") normalize(text);
          }}
          onBlur={() => {
            normalize(value);
            setTouched(true);
          }}
          onInvalid={() => setTouched(true)}
        />
      </div>
      {message ? (
        <p className="mt-1.5 text-[13px] font-medium text-danger" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
