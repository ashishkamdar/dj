import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getProduct, updateProduct } from "@/actions/products";
import { SectionHeading } from "@/components/ui/section-heading";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const unitOptions = [
  { value: "kg", label: "kg" },
  { value: "pieces", label: "pieces" },
  { value: "plates", label: "plates" },
  { value: "trays", label: "trays" },
];

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const product = await getProduct(Number(id));

  if (!product) {
    notFound();
  }

  const updateWithId = updateProduct.bind(null, product.id);

  return (
    <div className="space-y-6">
      <SectionHeading title="Edit Product" />

      <form action={updateWithId} className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Product Name"
                name="name"
                required
                defaultValue={product.name}
              />
            </div>

            <Select
              label="Default Unit"
              name="defaultUnit"
              options={unitOptions}
              defaultValue={product.defaultUnit ?? "kg"}
            />

            <Input
              label="Default Rate"
              name="defaultRate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product.defaultRate ?? 0}
            />

            <Input
              label="HSN Code"
              name="hsnCode"
              defaultValue={product.hsnCode ?? ""}
            />

            <Input
              label="GST Rate %"
              name="gstRatePercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={product.gstRatePercent ?? 0}
            />

            <div className="sm:col-span-2">
              <Input
                label="Category"
                name="category"
                defaultValue={product.category ?? ""}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/products">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit">Update Product</Button>
        </div>
      </form>
    </div>
  );
}
