"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/admin/ui";
import { readApiError, readApiJson } from "@/lib/api/parse-response";
import { formatGstNumberInput } from "@/lib/gst/gst-number";
import { GST_MASTER_SEARCH_MIN_LENGTH } from "@/lib/gst/gst-master-options";

export type GstPartySuggestion = {
  gstNumber: string;
  tradeName: string;
  legalName: string;
};

type GstPartyLookupProps = {
  tradeName: string;
  gstNumber: string;
  onTradeNameChange: (value: string) => void;
  onGstNumberChange: (value: string) => void;
  onSelect: (party: GstPartySuggestion) => void;
  tradeNameRequired?: boolean;
  gstNumberRequired?: boolean;
};

export function GstPartyLookup({
  tradeName,
  gstNumber,
  onTradeNameChange,
  onGstNumberChange,
  onSelect,
  tradeNameRequired = true,
  gstNumberRequired = true,
}: GstPartyLookupProps) {
  const [suggestions, setSuggestions] = useState<GstPartySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchQuery =
    tradeName.trim().length >= GST_MASTER_SEARCH_MIN_LENGTH
      ? tradeName.trim()
      : gstNumber.trim().length >= GST_MASTER_SEARCH_MIN_LENGTH
        ? gstNumber.trim()
        : "";

  useEffect(() => {
    if (!searchQuery) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/gst/masters/search?q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error(await readApiError(res));
        const results = await readApiJson<GstPartySuggestion[]>(res);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative md:col-span-2">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Trade name</label>
          <input
            required={tradeNameRequired}
            value={tradeName}
            onChange={(e) => {
              onTradeNameChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            className={inputClass}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-slate-500">
            Type at least {GST_MASTER_SEARCH_MIN_LENGTH} characters to search GST master.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">GST number</label>
          <input
            required={gstNumberRequired}
            value={gstNumber}
            onChange={(e) => {
              onGstNumberChange(formatGstNumberInput(e.target.value));
              setOpen(true);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            className={`${inputClass} uppercase`}
            maxLength={15}
            autoComplete="off"
          />
        </div>
      </div>

      {open && searchQuery ? (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 shadow-xl">
          {loading ? (
            <p className="px-4 py-3 text-sm text-slate-400">Searching GST master...</p>
          ) : suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">
              No matching GST master record. A new entry will be saved as Active when you save the
              invoice.
            </p>
          ) : (
            <ul className="max-h-60 overflow-y-auto py-1">
              {suggestions.map((party) => (
                <li key={party.gstNumber}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-slate-900"
                    onClick={() => {
                      onSelect(party);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-slate-100">{party.tradeName}</span>
                    <span className="mt-0.5 font-mono text-xs text-violet-300">{party.gstNumber}</span>
                    {party.legalName !== party.tradeName ? (
                      <span className="mt-0.5 text-xs text-slate-500">{party.legalName}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
