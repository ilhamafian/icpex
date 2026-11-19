"use client";

import { useState } from "react";
import { IconMail } from "@tabler/icons-react";

import { ClosingCeremonyDialog } from "@/components/ClosingCeremonyDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ClosingCeremonyAudience,
  ClosingCeremonyDraft,
} from "@/schemas/competitionSchema";
import type { SerializedCompetition } from "@/utils/serializeCatalog";

export function ClosingCeremonyShortcut({
  competitions,
  currentCompetitionId,
}: {
  competitions: SerializedCompetition[];
  currentCompetitionId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [audience, setAudience] =
    useState<ClosingCeremonyAudience>("participants");
  const [savedDrafts, setSavedDrafts] = useState<
    Record<string, ClosingCeremonyDraft>
  >({});
  const defaultId =
    currentCompetitionId ??
    competitions.find((competition) => competition.status === "PUBLISHED")
      ?._id ??
    competitions[0]?._id ??
    null;

  function openFor(next: ClosingCeremonyAudience) {
    setAudience(next);
    setOpen(true);
  }

  return (
    <>
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Closing ceremony</CardTitle>
          <CardDescription>
            Email paid participants, or scoring judges and judge leaders, the
            invitation to the closing ceremony and result announcement.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-wrap gap-2">
          <Button
            onClick={() => openFor("participants")}
            disabled={competitions.length === 0}
          >
            <IconMail />
            Send to participants
          </Button>
          <Button
            variant="outline"
            onClick={() => openFor("judges")}
            disabled={competitions.length === 0}
          >
            <IconMail />
            Send to judges
          </Button>
        </CardFooter>
      </Card>

      <ClosingCeremonyDialog
        open={open}
        onOpenChange={setOpen}
        competitions={competitions}
        competitionId={defaultId}
        audience={audience}
        savedDrafts={savedDrafts}
        onSaved={(competitionId, draft) =>
          setSavedDrafts((current) => ({ ...current, [competitionId]: draft }))
        }
      />
    </>
  );
}
