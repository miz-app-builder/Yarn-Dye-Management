import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface YarnTypeOption {
  id: number;
  name: string;
}

interface YarnTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: YarnTypeOption[];
  onCreateNew: (name: string) => Promise<void>;
  isCreating?: boolean;
  placeholder?: string;
  className?: string;
}

export function YarnTypeSelect({
  value,
  onChange,
  options,
  onCreateNew,
  isCreating = false,
  placeholder = "Select yarn type…",
  className,
}: YarnTypeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (addingNew && newNameRef.current) newNameRef.current.focus();
  }, [addingNew]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setAddingNew(false);
        setNewName("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = options.some(
    (o) => o.name.toLowerCase() === search.toLowerCase()
  );

  async function handleCreate() {
    const name = newName.trim() || search.trim();
    if (!name) return;
    await onCreateNew(name);
    onChange(name);
    setOpen(false);
    setSearch("");
    setAddingNew(false);
    setNewName("");
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-8 px-3 flex items-center justify-between gap-2 text-sm rounded-md border border-input bg-background",
          "hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-md border bg-white shadow-lg">
          {/* Search */}
          <div className="p-2 border-b">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setAddingNew(false); }}
              placeholder="Search…"
              className="w-full h-7 px-2 text-xs rounded border border-input focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Options */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && !search && (
              <li className="px-3 py-2 text-xs text-gray-400">No yarn types found</li>
            )}
            {filtered.map((opt) => (
              <li
                key={opt.id}
                onClick={() => { onChange(opt.name); setOpen(false); setSearch(""); }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-indigo-50"
              >
                {value === opt.name && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                <span className={value === opt.name ? "text-indigo-700 font-medium" : ""}>{opt.name}</span>
              </li>
            ))}

            {/* Add new option */}
            {!exactMatch && (
              <li className="border-t mt-1 pt-1">
                {addingNew ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5">
                    <input
                      ref={newNameRef}
                      value={newName || search}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
                      placeholder="New yarn type name…"
                      className="flex-1 h-6 px-1.5 text-xs rounded border border-input focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={isCreating}
                      className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                      {isCreating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingNew(true)}
                    className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {search ? `Add "${search}"` : "Add new yarn type"}
                  </button>
                )}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
