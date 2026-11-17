"use client";

import { useMemo, useState } from "react";
import { IconMail, IconPaperclip } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { SerializedCompetition } from "@/utils/serializeCatalog";

const textareaClassName =
  "w-full min-w-0 resize-y rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function CampusInvitationForm({
  competitions,
  competitionId,
  allowCompetitionSelect,
  defaultRegisterUrl,
  onClose,
}: {
  competitions: SerializedCompetition[];
  competitionId?: string | null;
  allowCompetitionSelect: boolean;
  defaultRegisterUrl?: string;
  onClose: () => void;
}) {
  const selectable = useMemo(
    () =>
      competitions.filter(
        (competition) =>
          competition.status === "PUBLISHED" ||
          competition.status === "DRAFT" ||
          competition.status === "COMPLETED"
      ),
    [competitions]
  );

  const [selectedId, setSelectedId] = useState(
    competitionId ?? selectable[0]?._id ?? ""
  );
  const [recipients, setRecipients] = useState("");
  const [registerUrl, setRegisterUrl] = useState(defaultRegisterUrl ?? "");
  const [poster, setPoster] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const selected = selectable.find((item) => item._id === selectedId);

  async function handleSend() {
    if (!selectedId) {
      toast.error("Choose a competition.");
      return;
    }
    if (!recipients.trim()) {
      toast.error("Add at least one recipient email.");
      return;
    }

    setSending(true);
    try {
      const body = new FormData();
      body.set("recipients", recipients);
      if (registerUrl.trim()) {
        body.set("registerUrl", registerUrl.trim());
      }
      if (poster) {
        body.set("poster", poster);
      }

      const response = await fetch(
        `/api/competitions/${selectedId}/campus-invitation`,
        { method: "POST", body }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "Failed to send the participant invitation."
        );
        return;
      }

      if (typeof data.warning === "string") {
        toast.warning(data.warning);
      } else {
        toast.success(
          `Participant invitation sent to ${data.sent} recipient${data.sent === 1 ? "" : "s"}.`
        );
      }
      onClose();
    } catch {
      toast.error("Failed to send the participant invitation.");
    } finally {
      setSending(false);
    }
  }

  return (
    <SheetContent className="flex flex-col gap-4 sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>Send participant invitation</SheetTitle>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1">
        {allowCompetitionSelect ? (
          <Field label="Competition">
            <Select
              value={selectedId}
              onValueChange={setSelectedId}
              disabled={selectable.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select competition" />
              </SelectTrigger>
              <SelectContent>
                {selectable.map((competition) => (
                  <SelectItem key={competition._id} value={competition._id}>
                    {competition.name}
                    {competition.status !== "PUBLISHED"
                      ? ` (${competition.status})`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : selected ? (
          <p className="text-sm text-muted-foreground">
            Sending for{" "}
            <span className="font-medium text-foreground">{selected.name}</span>
          </p>
        ) : null}

        <Field
          label="Recipients"
          htmlFor="campus-invite-recipients"
          hint="Paste emails separated by commas, spaces, or new lines. Each person gets their own copy."
        >
          <textarea
            id="campus-invite-recipients"
            value={recipients}
            rows={6}
            onChange={(event) => setRecipients(event.target.value)}
            placeholder={"colleague@unikl.edu.my\ncampus@unikl.edu.my"}
            className={textareaClassName}
          />
        </Field>

        <Field
          label="Registration / website link"
          htmlFor="campus-invite-url"
          hint="Leave blank to use this site’s public URL."
        >
          <Input
            id="campus-invite-url"
            type="url"
            value={registerUrl}
            onChange={(event) => setRegisterUrl(event.target.value)}
            placeholder="https://…"
          />
        </Field>

        <Field
          label="Poster attachment (optional)"
          hint="PDF or image up to 10 MB. Attached to every email."
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild disabled={sending}>
              <label className="cursor-pointer">
                <IconPaperclip />
                {poster ? "Replace poster" : "Attach poster"}
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) =>
                    setPoster(event.target.files?.[0] ?? null)
                  }
                />
              </label>
            </Button>
            {poster ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPoster(null)}
                disabled={sending}
              >
                Remove
              </Button>
            ) : null}
          </div>
          {poster ? (
            <p className="text-xs text-muted-foreground">{poster.name}</p>
          ) : null}
        </Field>
      </div>

      <SheetFooter>
        <Button variant="outline" onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button onClick={() => void handleSend()} disabled={sending || !selectedId}>
          <IconMail />
          {sending ? "Sending…" : "Send invitation"}
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}

export function CampusInvitationDialog({
  open,
  onOpenChange,
  competitions,
  competitionId,
  allowCompetitionSelect = false,
  defaultRegisterUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitions: SerializedCompetition[];
  /** Pre-selected competition. Required when the picker is hidden. */
  competitionId?: string | null;
  allowCompetitionSelect?: boolean;
  defaultRegisterUrl?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <CampusInvitationForm
          competitions={competitions}
          competitionId={competitionId}
          allowCompetitionSelect={allowCompetitionSelect}
          defaultRegisterUrl={defaultRegisterUrl}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}
