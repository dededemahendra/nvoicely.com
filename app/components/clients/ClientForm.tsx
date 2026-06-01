import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientFormValues } from "~/lib/validators/client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { Client } from "~/types";

interface ClientFormProps {
  defaultValues?: Client;
  onSubmit: (values: ClientFormValues) => void;
  isSubmitting: boolean;
}

export function ClientForm({ defaultValues, onSubmit, isSubmitting }: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          email: defaultValues.email,
          phone: defaultValues.phone ?? "",
          company: defaultValues.company ?? "",
          address_line1: defaultValues.address_line1 ?? "",
          address_line2: defaultValues.address_line2 ?? "",
          city: defaultValues.city ?? "",
          state: defaultValues.state ?? "",
          postal_code: defaultValues.postal_code ?? "",
          country: defaultValues.country ?? "",
          tax_id: defaultValues.tax_id ?? "",
          notes: defaultValues.notes ?? "",
        }
      : {
          country: "ID",
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card className="shadow-none dark:ring-0">
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" {...register("company")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none dark:ring-0">
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address_line1">Address line 1</Label>
            <Input id="address_line1" {...register("address_line1")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address_line2">Address line 2</Label>
            <Input id="address_line2" {...register("address_line2")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register("city")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State / Province</Label>
            <Input id="state" {...register("state")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal code</Label>
            <Input id="postal_code" {...register("postal_code")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" placeholder="e.g. ID, US" {...register("country")} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none dark:ring-0">
        <CardHeader>
          <CardTitle className="text-base">Other</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tax_id">Tax ID (NPWP / VAT)</Label>
            <Input id="tax_id" {...register("tax_id")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Saving..." : defaultValues ? "Update client" : "Create client"}
        </Button>
      </div>
    </form>
  );
}
