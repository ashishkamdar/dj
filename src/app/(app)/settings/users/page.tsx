import { requireAdmin } from "@/lib/session";
import { getUsers, createUser, updateUser, resetPin } from "@/actions/users";
import { SectionHeading } from "@/components/ui/section-heading";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const roleOptions = [
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

export default async function UsersPage() {
  await requireAdmin();
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Users"
        description="Manage user accounts and PIN access"
      />

      {/* Add User Form */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
          Add New User
        </h3>
        <form action={createUser}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Input
              label="Name"
              name="name"
              required
              placeholder="User name"
            />
            <Input
              label="PIN (4-6 digits)"
              name="pin"
              type="password"
              required
              minLength={4}
              maxLength={6}
              pattern="[0-9]{4,6}"
              placeholder="****"
            />
            <Select
              label="Role"
              name="role"
              options={roleOptions}
              defaultValue="staff"
            />
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Add User
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* User List */}
      <div className="space-y-4">
        {users.map((user) => {
          const updateWithId = updateUser.bind(null, user.id);
          const resetPinWithId = resetPin.bind(null, user.id);

          return (
            <div
              key={user.id}
              className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user.name}
                  </h3>
                  <Badge color={user.role === "admin" ? "indigo" : "gray"}>
                    {user.role}
                  </Badge>
                  <Badge color={user.isActive ? "green" : "red"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Edit User */}
                <form action={updateWithId}>
                  <div className="space-y-3">
                    <Input
                      label="Name"
                      name="name"
                      required
                      defaultValue={user.name}
                    />
                    <Select
                      label="Role"
                      name="role"
                      options={roleOptions}
                      defaultValue={user.role ?? "staff"}
                    />
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={user.isActive ?? true}
                        className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/10 dark:bg-white/5"
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Active
                      </span>
                    </label>
                    <Button type="submit" size="sm" variant="secondary">
                      Update User
                    </Button>
                  </div>
                </form>

                {/* Reset PIN */}
                <form action={resetPinWithId}>
                  <div className="space-y-3">
                    <Input
                      label="New PIN (4-6 digits)"
                      name="pin"
                      type="password"
                      required
                      minLength={4}
                      maxLength={6}
                      pattern="[0-9]{4,6}"
                      placeholder="****"
                    />
                    <Button type="submit" size="sm" variant="soft">
                      Reset PIN
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
