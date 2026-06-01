import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Users, FileText, Receipt, Plus } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import { useClients } from "~/hooks/useClients";
import { useInvoices } from "~/hooks/useInvoices";
import { useExpenses } from "~/hooks/useExpenses";
import { primaryNav, secondaryNav } from "~/components/shared/nav";
import { formatCurrency } from "~/lib/currency";
import { cn } from "~/lib/utils";

const CREATE_ACTIONS = [
  { to: "/invoices/new", label: "New invoice" },
  { to: "/clients/new", label: "New client" },
  { to: "/expenses/new", label: "New expense" },
];

export function GlobalSearch({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          "w-9 justify-center sm:w-56 sm:justify-start sm:px-3"
        )}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        {open && <SearchContent userId={userId} onClose={() => setOpen(false)} />}
      </CommandDialog>
    </>
  );
}

function SearchContent({ userId, onClose }: { userId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: clients } = useClients(userId);
  const { data: invoices } = useInvoices(userId);
  const { data: expenses } = useExpenses(userId);

  const clientName = (id: string) =>
    clients?.find((c) => c.$id === id)?.name ?? "Unknown";

  function go(to: string, params?: Record<string, string>) {
    navigate(params ? { to, params } : { to });
    onClose();
  }

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search invoices, clients, expenses..."
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {hasQuery && clients && clients.length > 0 && (
          <CommandGroup heading="Clients">
            {clients.map((c) => (
              <CommandItem
                key={c.$id}
                value={`client ${c.name} ${c.email ?? ""} ${c.company ?? ""} ${c.$id}`}
                onSelect={() => go("/clients/$id", { id: c.$id })}
              >
                <Users className="text-muted-foreground" />
                <span>{c.name}</span>
                {c.email && (
                  <span className="ml-auto truncate text-xs text-muted-foreground">{c.email}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasQuery && invoices && invoices.length > 0 && (
          <CommandGroup heading="Invoices">
            {invoices.map((inv) => (
              <CommandItem
                key={inv.$id}
                value={`invoice ${inv.invoice_number} ${clientName(inv.client_id)} ${inv.$id}`}
                onSelect={() => go("/invoices/$id", { id: inv.$id })}
              >
                <FileText className="text-muted-foreground" />
                <span className="font-mono">{inv.invoice_number}</span>
                <span className="truncate text-muted-foreground">{clientName(inv.client_id)}</span>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(inv.total, inv.currency)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasQuery && expenses && expenses.length > 0 && (
          <CommandGroup heading="Expenses">
            {expenses.map((e) => (
              <CommandItem
                key={e.$id}
                value={`expense ${e.description} ${e.vendor ?? ""} ${e.category} ${e.$id}`}
                onSelect={() => go("/expenses")}
              >
                <Receipt className="text-muted-foreground" />
                <span className="truncate">{e.description}</span>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(e.amount, e.currency)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Create">
          {CREATE_ACTIONS.map((a) => (
            <CommandItem key={a.to} value={`create ${a.label}`} onSelect={() => go(a.to)}>
              <Plus className="text-muted-foreground" />
              {a.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Go to">
          {[...primaryNav, ...secondaryNav].map((item) => (
            <CommandItem
              key={item.to}
              value={`go ${item.label}`}
              onSelect={() => go(item.to)}
            >
              <item.icon className="text-muted-foreground" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </>
  );
}
