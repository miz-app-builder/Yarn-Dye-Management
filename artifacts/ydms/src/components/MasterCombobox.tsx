import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function toTitleCase(str: string): string {
  return str.replace(/[^\s]+/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}

interface MasterComboboxOption {
  id: number;
  name: string;
}

interface MasterComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: MasterComboboxOption[];
  isLoading?: boolean;
  isSaving?: boolean;
  placeholder?: string;
  addNewLabel?: string;
  onAddNew: (name: string) => Promise<void>;
  className?: string;
  autoTitleCase?: boolean;
}

export function MasterCombobox({
  value,
  onChange,
  options,
  isLoading,
  isSaving,
  placeholder = "Select or type...",
  addNewLabel = "Add new",
  onAddNew,
  className,
  autoTitleCase = false,
}: MasterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [newName, setNewName] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = options.some(
    (o) => o.name.toLowerCase() === search.toLowerCase()
  );

  useEffect(() => {
    if (showAddInput) {
      addInputRef.current?.focus();
    }
  }, [showAddInput]);

  function handleSelect(name: string) {
    onChange(name);
    setOpen(false);
    setSearch("");
    setShowAddInput(false);
  }

  async function handleAddNew() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await onAddNew(trimmed);
    onChange(trimmed);
    setNewName("");
    setShowAddInput(false);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(""); setShowAddInput(false); } }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-8 justify-between text-sm font-normal", className)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 space-y-1.5" align="start">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            const raw = e.target.value;
            setSearch(autoTitleCase ? toTitleCase(raw) : raw);
          }}
          className="h-7 text-xs"
          autoFocus
        />
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 && !search ? (
            <p className="text-xs text-muted-foreground text-center py-2">No items yet</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No match found</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.name)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent",
                  value === opt.name && "bg-accent"
                )}
              >
                <Check className={cn("h-3 w-3 shrink-0", value === opt.name ? "opacity-100" : "opacity-0")} />
                {opt.name}
              </button>
            ))
          )}
        </div>

        <div className="border-t pt-1.5">
          {showAddInput ? (
            <div className="flex gap-1">
              <Input
                ref={addInputRef}
                value={newName}
                onChange={(e) => {
                  const raw = e.target.value;
                  setNewName(autoTitleCase ? toTitleCase(raw) : raw);
                }}
                placeholder="Enter name..."
                className="h-7 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleAddNew(); }
                  if (e.key === "Escape") { setShowAddInput(false); setNewName(""); }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleAddNew}
                disabled={isSaving || !newName.trim()}
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setShowAddInput(true); setNewName(search && !exactMatch ? search : ""); }}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="h-3 w-3" />
              {search && !exactMatch ? `Add "${search}"` : addNewLabel}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
