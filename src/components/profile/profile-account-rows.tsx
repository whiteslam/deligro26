"use client";

import { useState } from "react";
import { Phone, User } from "lucide-react";
import type { ProfileSummary } from "@/lib/data-access/profile";
import { ProfileEditSheet } from "@/components/profile/profile-edit-sheet";

export function ProfileAccountRows({ summary }: { summary: ProfileSummary }) {
  const [editField, setEditField] = useState<"name" | "phone" | null>(null);

  return (
    <div className="relative">
      <div className="divide-y divide-line">
        <EditRow
          icon={<User className="size-5" />}
          value={summary.name}
          onEdit={() => setEditField("name")}
        />
        {summary.phone ? (
          <EditRow
            icon={<Phone className="size-5" />}
            value={summary.phone}
            onEdit={() => setEditField("phone")}
          />
        ) : (
          <EditRow
            icon={<Phone className="size-5" />}
            value="Add phone number"
            muted
            onEdit={() => setEditField("phone")}
          />
        )}
      </div>

      <ProfileEditSheet
        open={editField === "name"}
        field="name"
        value={summary.name}
        onClose={() => setEditField(null)}
      />
      <ProfileEditSheet
        open={editField === "phone"}
        field="phone"
        value={summary.phone ?? ""}
        onClose={() => setEditField(null)}
      />
    </div>
  );
}

function EditRow({
  icon,
  value,
  onEdit,
  muted,
}: {
  icon: React.ReactNode;
  value: string;
  onEdit: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="press flex w-full items-center gap-3 py-3.5 text-left"
    >
      <span className="shrink-0 text-ink">{icon}</span>
      <span
        className={`min-w-0 flex-1 truncate text-[15px] font-medium${
          muted ? " text-muted" : ""
        }`}
      >
        {value}
      </span>
      <span className="text-sm font-bold text-accent-ink">Edit</span>
    </button>
  );
}
