"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { inputClass } from "@/components/admin/ui";

export type SearchableOption = {
  id: string;
  name: string;
  description?: string | null;
};

type SearchableSelectProps = {
  label: string;
  placeholder?: string;
  options: SearchableOption[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  disabled?: boolean;
};

function findOptionByName(options: SearchableOption[], name: string) {
  const term = name.trim().toLowerCase();
  if (!term) {
    return undefined;
  }
  return options.find((option) => option.name.toLowerCase() === term);
}

export function SearchableSelect({
  label,
  placeholder = "Search...",
  options,
  value,
  onChange,
  required = false,
  disabled = false,
}: SearchableSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.id === value);

  useEffect(() => {
    if (selected) {
      setQuery(selected.name);
      return;
    }
    if (!value) {
      setQuery("");
    }
  }, [selected, value]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(term) ||
        option.description?.toLowerCase().includes(term),
    );
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        const match = findOptionByName(options, query);
        if (match) {
          onChange(match.id);
          setQuery(match.name);
        } else if (selected) {
          setQuery(selected.name);
        } else {
          setQuery("");
          onChange("");
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onChange, options, query, selected]);

  function selectOption(option: SearchableOption) {
    onChange(option.id);
    setQuery(option.name);
    setOpen(false);
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    setOpen(true);

    if (!nextQuery.trim()) {
      onChange("");
      return;
    }

    const exactMatch = findOptionByName(options, nextQuery);
    if (exactMatch) {
      onChange(exactMatch.id);
    }
  }

  function handleBlur() {
    setOpen(false);
    const match = findOptionByName(options, query);
    if (match) {
      onChange(match.id);
      setQuery(match.name);
      return;
    }
    if (selected) {
      setQuery(selected.name);
      return;
    }
    setQuery("");
    onChange("");
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-2 block text-sm text-slate-400">{label}</label>
      <input
        className={inputClass}
        placeholder={placeholder}
        value={query}
        required={required && !value}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onChange={(event) => handleQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && open && filtered.length === 1) {
            event.preventDefault();
            selectOption(filtered[0]);
          }
          if (event.key === "Escape") {
            setOpen(false);
            if (selected) {
              setQuery(selected.name);
            }
          }
        }}
      />
      {open && filtered.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 shadow-xl">
          {filtered.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-900"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
              >
                <span className="font-medium text-white">{option.name}</span>
                {option.description ? (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {option.description}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
