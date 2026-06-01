import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Dashboard } from "~/components/dashboard";

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${name.split(" ")[0]}`;
}

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();

  return (
    <div className="space-y-8">
      {/* ───────── Hero ───────── */}
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-4xl leading-[0.95] tracking-tight md:text-5xl">
            {greeting(user.name)}.
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="mr-1 h-4 w-4" />
              New invoice
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/clients/new">
              <Plus className="mr-1 h-4 w-4" />
              Client
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/expenses/new">
              <Plus className="mr-1 h-4 w-4" />
              Expense
            </Link>
          </Button>
        </div>
      </section>

      {/* ───────── Dashboard grid ───────── */}
      <Dashboard userId={user.$id} />
    </div>
  );
}
