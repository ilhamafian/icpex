"use client";

import { useState } from "react";
import { IconMail } from "@tabler/icons-react";

import { CampusInvitationDialog } from "@/components/CampusInvitationDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SerializedCompetition } from "@/utils/serializeCatalog";

export function CampusInvitationShortcut({
  competitions,
  currentCompetitionId,
}: {
  competitions: SerializedCompetition[];
  currentCompetitionId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const defaultId =
    currentCompetitionId ??
    competitions.find((competition) => competition.status === "PUBLISHED")
      ?._id ??
    competitions[0]?._id ??
    null;

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Participant invitation</CardTitle>
          <CardDescription>
            Email UniKL campuses the call for participation, with optional poster
            attached. Uses the competition’s name, theme, and dates.
          </CardDescription>
        </CardHeader>
        <CardFooter className="mt-auto">
          <Button
            onClick={() => setOpen(true)}
            disabled={competitions.length === 0}
          >
            <IconMail />
            Send participant invitation
          </Button>
        </CardFooter>
      </Card>

      <CampusInvitationDialog
        open={open}
        onOpenChange={setOpen}
        competitions={competitions}
        competitionId={defaultId}
        allowCompetitionSelect
      />
    </>
  );
}
