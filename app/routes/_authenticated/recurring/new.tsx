import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { nanoid } from "nanoid";
import { recurringSchema, type RecurringFormValues } from "~/lib/validators/recurring";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { CurrencySelect } from "~/components/shared/CurrencySelect";
import { LineItemsTable } from "~/components/invoice/LineItemsTable";
import { PageHeader } from "~/components/shared/PageHeader";
import { Skeleton } from "~/components/ui/skeleton";
import { useClients } from "~/hooks/useClients";
import { useCreateRecurring } from "~/hooks/useRecurring";
import { toast } from "sonner";
import type { CurrencyCode } from "~/types";

export const Route = createFileRoute("/_authenticated/recurring/new")({
  component: NewRecurringPage,
});

function NewRecurringPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: clients, isLoading: loadingClients } = useClients(user.$id);
  const createRecurring = useCreateRecurring();

  const methods = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      client_id: "",
      name: "",
      frequency: "monthly",
      start_date: "",
      end_date: "",
      currency: "IDR",
      tax_rate: 11,
      line_items: [{ id: nanoid(), description: "", quantity: 1, unit_price: 0, tax_rate: 11, amount: 0 }],
      notes: "",
      terms: "",
      auto_send: false,
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = methods;

  function onSubmit(values: RecurringFormValues) {
    createRecurring.mutate(
      { ...values, user_id: user.$id },
      {
        onSuccess: () => {
          toast.success("Recurring template created");
          navigate({ to: "/recurring" });
        },
        onError: () => toast.error("Failed to create template"),
      }
    );
  }

  if (loadingClients) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <PageHeader title="New Recurring Invoice" />
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input id="name" placeholder="e.g. Monthly Retainer" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={watch("client_id")} onValueChange={(v) => setValue("client_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.$id} value={c.$id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select value={watch("frequency")} onValueChange={(v: any) => setValue("frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date (optional)</Label>
              <Input id="end_date" type="date" {...register("end_date")} />
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <CurrencySelect
                value={watch("currency") as CurrencyCode}
                onValueChange={(v) => setValue("currency", v)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Line Items</Label>
            <LineItemsTable />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register("notes")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms">Payment Terms</Label>
              <Textarea id="terms" {...register("terms")} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="auto_send"
              checked={watch("auto_send")}
              onCheckedChange={(checked) => setValue("auto_send", checked)}
            />
            <Label htmlFor="auto_send" className="font-normal">
              Automatically email invoice on generation
            </Label>
          </div>

          <Button type="submit" disabled={createRecurring.isPending}>
            {createRecurring.isPending ? "Creating..." : "Create Template"}
          </Button>
        </form>
      </FormProvider>
    </div>
  );
}
