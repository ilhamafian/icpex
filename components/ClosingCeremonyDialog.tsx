"use client";

import { useEffect, useMemo, useState } from "react";
import { IconMail } from "@tabler/icons-react";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CLOSING_CEREMONY_MODE_LABELS,
  closingCeremonyDraft,
  type ClosingCeremonyAudience,
  type ClosingCeremonyDraft,
} from "@/schemas/competitionSchema";
import type { SerializedCompetition } from "@/utils/serializeCatalog";

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

function formatCeremonyDate(iso?: string) {
  if (!iso) return "";
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function recipientSentence(
  audience: ClosingCeremonyAudience,
  count: number
) {
  if (audience === "participants") {
    return count === 1
      ? "This email goes to 1 paid participant."
      : `This email goes to ${count} paid participants.`;
  }
  return count === 1
    ? "This email goes to 1 scoring judge or judge leader."
    : `This email goes to ${count} scoring judges and judge leaders.`;
}

function ClosingCeremonyForm({
  competitions,
  competitionId,
  audience,
  savedDrafts,
  onSaved,
  onClose,
}: {
  competitions: SerializedCompetition[];
  competitionId?: string | null;
  audience: ClosingCeremonyAudience;
  savedDrafts: Record<string, ClosingCeremonyDraft>;
  onSaved: (competitionId: string, draft: ClosingCeremonyDraft) => void;
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
  const [draft, setDraft] = useState<ClosingCeremonyDraft>(() =>
    savedDrafts[competitionId ?? ""] ??
    closingCeremonyDraft(
      selectable.find((item) => item._id === (competitionId ?? selectable[0]?._id)) ??
        null
    )
  );
  const [counts, setCounts] = useState<{
    participants: number;
    judges: number;
  } | null>(null);
  const [counting, setCounting] = useState(false);
  const [sending, setSending] = useState(false);

  const selected = selectable.find((item) => item._id === selectedId);
  const mode = selected?.closing_ceremony_mode;
  const ceremonyDate = formatCeremonyDate(selected?.closing_ceremony_date);
  const ready = Boolean(selected?.closing_ceremony_date && mode);
  const count =
    counts == null
      ? null
      : audience === "participants"
        ? counts.participants
        : counts.judges;

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setCounting(true);
    fetch(`/api/competitions/${selectedId}/closing-ceremony`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "Could not count recipients."
          );
        }
        return data as { participants: number; judges: number };
      })
      .then((data) => {
        if (!cancelled) setCounts(data);
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      })
      .finally(() => {
        if (!cancelled) setCounting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function chooseCompetition(id: string) {
    setSelectedId(id);
    const competition = selectable.find((item) => item._id === id) ?? null;
    setDraft(savedDrafts[id] ?? closingCeremonyDraft(competition));
    setCounts(null);
  }

  function patch(partial: Partial<ClosingCeremonyDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  async function handleSend() {
    if (!selectedId || !selected) {
      toast.error("Choose a competition.");
      return;
    }
    if (!ready || !mode) {
      toast.error(
        "Set the closing ceremony date and mode under Competitions & Categories."
      );
      return;
    }
    if (!draft.time) {
      toast.error("Enter the ceremony time.");
      return;
    }
    if (!draft.reply_by) {
      toast.error("Enter the reply-by date.");
      return;
    }
    if (
      !Number.isInteger(draft.join_minutes) ||
      draft.join_minutes < 1 ||
      draft.join_minutes > 180
    ) {
      toast.error("Enter how many minutes early people should arrive.");
      return;
    }
    if (mode === "ONLINE") {
      if (!draft.platform.trim()) {
        toast.error("Enter the platform.");
        return;
      }
      if (!draft.meeting_url.trim()) {
        toast.error("Enter a meeting link.");
        return;
      }
    } else if (!draft.venue.trim()) {
      toast.error("Enter the venue.");
      return;
    }
    if (audience === "participants" && !draft.attendance_url.trim()) {
      toast.error("Enter the attendance registration link.");
      return;
    }
    if (count === 0) {
      toast.error(
        audience === "participants"
          ? "No paid participants to email."
          : "No judges or judge leaders to email."
      );
      return;
    }

    const nextDraft: ClosingCeremonyDraft = {
      time: draft.time,
      platform: draft.platform.trim(),
      meeting_url: draft.meeting_url.trim(),
      venue: draft.venue.trim(),
      reply_by: draft.reply_by,
      join_minutes: draft.join_minutes,
      attendance_url: draft.attendance_url.trim(),
    };
    const body: Record<string, unknown> = {
      audience,
      time: nextDraft.time,
      reply_by: nextDraft.reply_by,
      join_minutes: nextDraft.join_minutes,
    };
    if (mode === "ONLINE") {
      body.platform = nextDraft.platform;
      body.meeting_url = nextDraft.meeting_url;
    } else {
      body.venue = nextDraft.venue;
    }
    if (audience === "participants") {
      body.attendance_url = nextDraft.attendance_url;
    }

    setSending(true);
    try {
      const response = await fetch(
        `/api/competitions/${selectedId}/closing-ceremony`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "Failed to send the closing ceremony invitation."
        );
        return;
      }
      onSaved(selectedId, nextDraft);
      if (typeof data.message === "string") {
        toast.message(data.message);
        return;
      }
      if (typeof data.warning === "string") {
        toast.warning(data.warning);
      } else {
        const sent = typeof data.sent === "number" ? data.sent : 0;
        toast.success(
          audience === "participants"
            ? `Closing ceremony invitation sent to ${sent} participant${sent === 1 ? "" : "s"}.`
            : `Closing ceremony invitation sent to ${sent} judge${sent === 1 ? "" : "s"}.`
        );
      }
      onClose();
    } catch {
      toast.error("Failed to send the closing ceremony invitation.");
    } finally {
      setSending(false);
    }
  }

  const audienceLabel =
    audience === "participants"
      ? "paid participants"
      : "scoring judges and judge leaders";
  const sendLabel =
    count == null
      ? "Send invitation"
      : count === 0
        ? "Nothing to send"
        : audience === "participants"
          ? `Send to ${count} participant${count === 1 ? "" : "s"}`
          : `Send to ${count} judge${count === 1 ? "" : "s"}`;

  return (
    <SheetContent className="flex flex-col gap-4 sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>Closing ceremony invitation</SheetTitle>
        <SheetDescription>
          Sends the official letter to {audienceLabel}. Sending again is
          allowed, so this can also be the reminder the day before.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1">
        <Field label="Competition">
          <Select
            value={selectedId}
            onValueChange={chooseCompetition}
            disabled={selectable.length === 0 || sending}
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

        {selected && !ready ? (
          <p className="text-sm text-destructive">
            Set the closing ceremony date and mode under Competitions &
            Categories before sending.
          </p>
        ) : selected ? (
          <p className="text-sm text-muted-foreground">
            {ceremonyDate}
            {mode ? ` · ${CLOSING_CEREMONY_MODE_LABELS[mode]}` : ""}
          </p>
        ) : null}

        <Field label="Time" htmlFor="closing-time" hint="Malaysia time (GMT+8).">
          <Input
            id="closing-time"
            type="time"
            value={draft.time}
            onChange={(event) => patch({ time: event.target.value })}
            disabled={sending}
          />
        </Field>

        {mode === "PHYSICAL" ? (
          <Field label="Venue" htmlFor="closing-venue">
            <Input
              id="closing-venue"
              value={draft.venue}
              onChange={(event) => patch({ venue: event.target.value })}
              disabled={sending}
            />
          </Field>
        ) : mode === "ONLINE" ? (
          <>
            <Field
              label="Platform"
              htmlFor="closing-platform"
              hint="For example, Zoom or Microsoft Teams."
            >
              <Input
                id="closing-platform"
                value={draft.platform}
                onChange={(event) => patch({ platform: event.target.value })}
                disabled={sending}
              />
            </Field>
            <Field label="Meeting link" htmlFor="closing-link">
              <Input
                id="closing-link"
                type="url"
                value={draft.meeting_url}
                onChange={(event) => patch({ meeting_url: event.target.value })}
                placeholder="https://…"
                disabled={sending}
              />
            </Field>
          </>
        ) : null}

        <Field label="Reply by" htmlFor="closing-reply">
          <Input
            id="closing-reply"
            type="date"
            value={draft.reply_by}
            onChange={(event) => patch({ reply_by: event.target.value })}
            disabled={sending}
          />
        </Field>

        <Field
          label="Minutes early"
          htmlFor="closing-minutes"
          hint="How early participants should join or arrive. Default is 15."
        >
          <Input
            id="closing-minutes"
            type="number"
            min={1}
            max={180}
            value={draft.join_minutes}
            onChange={(event) =>
              patch({ join_minutes: Number(event.target.value) })
            }
            disabled={sending}
          />
        </Field>

        {audience === "participants" ? (
          <Field
            label="Attendance registration link"
            htmlFor="closing-attendance"
          >
            <Input
              id="closing-attendance"
              type="url"
              value={draft.attendance_url}
              onChange={(event) =>
                patch({ attendance_url: event.target.value })
              }
              placeholder="https://…"
              disabled={sending}
            />
          </Field>
        ) : null}

        <p className="text-sm text-muted-foreground">
          {counting
            ? "Counting recipients…"
            : count == null
              ? "Could not count recipients."
              : recipientSentence(audience, count)}
        </p>
      </div>

      <SheetFooter>
        <Button variant="outline" onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleSend()}
          disabled={sending || !selectedId || !ready || counting || count === 0 || count == null}
        >
          <IconMail />
          {sending ? "Sending…" : sendLabel}
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}

export function ClosingCeremonyDialog({
  open,
  onOpenChange,
  competitions,
  competitionId,
  audience,
  savedDrafts,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitions: SerializedCompetition[];
  competitionId?: string | null;
  audience: ClosingCeremonyAudience;
  savedDrafts: Record<string, ClosingCeremonyDraft>;
  onSaved: (competitionId: string, draft: ClosingCeremonyDraft) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <ClosingCeremonyForm
          competitions={competitions}
          competitionId={competitionId}
          audience={audience}
          savedDrafts={savedDrafts}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}
