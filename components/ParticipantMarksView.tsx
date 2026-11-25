"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  IconChevronDown,
  IconLayoutColumns,
  IconSearch,
} from "@tabler/icons-react";
import {
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table";

import { toast } from "sonner";

import { PortalTableFooter } from "@/components/portal-table-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScoringAudience } from "@/components/ScoringAudienceSwitch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import type { LivePresentationDraft } from "@/schemas/competitionSchema";
import { educationLevelLabel } from "@/schemas/educationLevel";
import type { JudgeAssignmentStatus } from "@/schemas/judgeAssignmentsSchema";
import { formatScore } from "@/utils/formatScore";
import type {
  ParticipantMarkJudge,
  ParticipantMarkRow,
} from "@/utils/judgeLeaderReports";

const features = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, ParticipantMarkRow>();

type Progress = "unassigned" | "awaiting" | "partial" | "scored";
type View = "all" | "scored" | "in-progress" | "unassigned" | "nominated";

const VIEWS: { value: View; label: string; match: (row: ParticipantMarkRow) => boolean }[] =
  [
    { value: "all", label: "All", match: () => true },
    {
      value: "scored",
      label: "Fully scored",
      match: (row) => progressOf(row) === "scored",
    },
    {
      value: "in-progress",
      label: "In progress",
      match: (row) => {
        const progress = progressOf(row);
        return progress === "awaiting" || progress === "partial";
      },
    },
    {
      value: "unassigned",
      label: "Unassigned",
      match: (row) => progressOf(row) === "unassigned",
    },
    {
      value: "nominated",
      label: "Nominated",
      match: (row) => row.nominated,
    },
  ];

function activeJudges(row: ParticipantMarkRow) {
  return row.judges.filter((judge) => judge.status !== "REJECTED");
}

function progressOf(row: ParticipantMarkRow): Progress {
  const active = activeJudges(row);
  if (active.length === 0) return "unassigned";
  const scored = active.filter((judge) => judge.submitted).length;
  if (scored === 0) return "awaiting";
  if (scored === active.length) return "scored";
  return "partial";
}

function statusVariant(
  status: JudgeAssignmentStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ACCEPTED":
      return "default";
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

function markLabel(judge: ParticipantMarkJudge) {
  if (judge.status === "REJECTED") return "Declined";
  if (!judge.submitted) return "Not scored";
  return formatScore(judge.total_score);
}

function mean(values: number[]) {
  if (values.length === 0) return null;
  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 100
    ) / 100
  );
}

function MarksSummary({ rows }: { rows: ParticipantMarkRow[] }) {
  const paper = useScoringAudience() === "PAPER_REVIEWER";
  const fullyScored = rows.filter((row) => progressOf(row) === "scored").length;
  const inProgress = rows.filter((row) => {
    const progress = progressOf(row);
    return progress === "awaiting" || progress === "partial";
  }).length;
  const unassigned = rows.filter(
    (row) => progressOf(row) === "unassigned"
  ).length;
  const average = mean(
    rows.flatMap((row) =>
      row.average_score === null ? [] : [row.average_score]
    )
  );

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Participants</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {rows.length.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          In the current competition
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Fully scored</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fullyScored.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          {paper
            ? "Every assigned paper reviewer has submitted"
            : "Every assigned judge has submitted"}
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>In progress</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {inProgress.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          Assigned, marks still incomplete
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Average mark</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {average === null ? "—" : formatScore(average)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          {unassigned.toLocaleString()} with no active{" "}
          {paper ? "paper reviewer" : "judge"}
        </CardFooter>
      </Card>
    </div>
  );
}

function JudgeMarks({ judge }: { judge: ParticipantMarkJudge }) {
  const paper = useScoringAudience() === "PAPER_REVIEWER";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-medium">{judge.judge_name}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={statusVariant(judge.status)} className="px-1.5">
              {judge.status}
            </Badge>
          </div>
        </div>
        <span className="text-lg font-semibold tabular-nums">
          {markLabel(judge)}
        </span>
      </div>
      {judge.submitted && judge.scores.length > 0 ? (
        <div className="flex flex-col gap-3">
          {judge.scores.map((score) => (
            <div
              key={score.criteria_id}
              className="grid grid-cols-[1fr_auto] gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{score.criteria_name}</div>
              </div>
              <span className="text-sm tabular-nums">
                {formatScore(score.score)}
              </span>
            </div>
          ))}
          {judge.comments ? (
            <p className="text-xs whitespace-pre-line text-muted-foreground">
              {judge.comments}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {judge.status === "REJECTED"
            ? paper
              ? "This paper reviewer declined the assignment."
              : "This judge declined the assignment."
            : judge.submitted
              ? "No criterion marks were stored."
              : "Marks have not been submitted."}
        </p>
      )}
    </div>
  );
}

function ParticipantDrawer({ item }: { item: ParticipantMarkRow }) {
  const isMobile = useIsMobile();
  const paper = useScoringAudience() === "PAPER_REVIEWER";
  const scored = activeJudges(item).filter((judge) => judge.submitted).length;
  const active = activeJudges(item).length;

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button
          variant="link"
          className="h-auto w-fit max-w-72 flex-col items-start gap-0.5 px-0 text-left text-foreground"
        >
          <span>{item.registration_number}</span>
          <span className="w-full truncate text-xs font-normal text-muted-foreground">
            {item.project_title}
          </span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.project_title}</DrawerTitle>
          <DrawerDescription>
            {item.registration_number} · {item.participant_name}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Participant</span>
              <span className="font-medium break-words">
                {item.participant_name}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Institution</span>
              <span className="font-medium break-words">
                {item.institution_name}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Category</span>
              <span className="font-medium break-words">
                {item.category_name}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Track</span>
              <span className="font-medium">
                {educationLevelLabel(item.education_level)}
              </span>
            </div>
          </div>
          <div className="font-medium">
            {item.average_score === null
              ? "No submitted marks yet"
              : `Average ${formatScore(item.average_score)} from ${scored} of ${active} ${paper ? "paper reviewer" : "judge"}${active === 1 ? "" : "s"}`}
          </div>
          <Separator />
          {item.judges.length === 0 ? (
            <p className="text-muted-foreground">
              {paper ? "No paper reviewers assigned." : "No judges assigned."}
            </p>
          ) : (
            item.judges.map((judge, index) => (
              <React.Fragment key={judge.assignment_id}>
                {index > 0 ? <Separator /> : null}
                <JudgeMarks judge={judge} />
              </React.Fragment>
            ))
          )}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function createColumns(
  pageIndex: number,
  pageSize: number,
  showTrack: boolean,
  marksHeader: string,
  live: {
    pendingId: string | null;
    onToggle: (row: ParticipantMarkRow, nominated: boolean) => void;
  } | null
) {
  return columnHelper.columns([
    columnHelper.display({
      id: "index",
      header: "#",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row, table }) => {
        const position = table
          .getRowModel()
          .rows.findIndex((item) => item.id === row.id);
        return (
          <span className="tabular-nums text-muted-foreground">
            {pageIndex * pageSize + position + 1}
          </span>
        );
      },
    }),
    columnHelper.accessor("registration_number", {
      header: "Registration",
      enableHiding: false,
      cell: ({ row }) => <ParticipantDrawer item={row.original} />,
    }),
    columnHelper.accessor("participant_name", {
      id: "participant",
      header: "Participant",
      cell: ({ row }) => (
        <div className="flex max-w-56 flex-col gap-0.5">
          <span className="truncate" title={row.original.participant_name}>
            {row.original.participant_name}
          </span>
          <span
            className="truncate text-xs text-muted-foreground"
            title={row.original.institution_name}
          >
            {row.original.institution_name}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor("category_name", {
      id: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="max-w-48 px-1.5 text-muted-foreground"
          title={row.original.category_name}
        >
          <span className="truncate">{row.original.category_name}</span>
        </Badge>
      ),
    }),
    ...(showTrack
      ? [
          columnHelper.accessor(
            (row) => educationLevelLabel(row.education_level),
            {
              id: "track",
              header: "Track",
              cell: ({ row }) => (
                <span className="text-sm">
                  {educationLevelLabel(row.original.education_level)}
                </span>
              ),
            }
          ),
        ]
      : []),
    columnHelper.display({
      id: "marks",
      header: marksHeader,
      enableSorting: false,
      cell: ({ row }) => {
        const judges = row.original.judges;
        if (judges.length === 0) {
          return <span className="text-muted-foreground">Unassigned</span>;
        }
        return (
          <ul className="flex min-w-52 flex-col gap-1">
            {judges.map((judge) => (
              <li
                key={judge.assignment_id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate" title={judge.judge_name}>
                  {judge.judge_name}
                </span>
                <span className="shrink-0 tabular-nums">
                  {markLabel(judge)}
                </span>
              </li>
            ))}
          </ul>
        );
      },
    }),
    columnHelper.accessor((row) => row.average_score ?? -1, {
      id: "average",
      header: () => <div className="w-full text-right">Average</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {row.original.average_score === null
            ? "—"
            : formatScore(row.original.average_score)}
        </div>
      ),
    }),
    ...(live
      ? [
          columnHelper.display({
            id: "live presentation",
            header: "Live presentation",
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => {
              const item = row.original;
              if (item.education_level !== "POSTGRADUATE") {
                return <span className="text-muted-foreground">—</span>;
              }
              return (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={item.invited || item.nominated}
                    disabled={
                      item.invited || live.pendingId === item.registration_id
                    }
                    onCheckedChange={(checked) =>
                      live.onToggle(item, checked === true)
                    }
                    aria-label={`Nominate ${item.registration_number} for the live presentation`}
                  />
                  {item.invited ? (
                    <>
                      <Badge variant="secondary">Invited</Badge>
                      {item.live_presentation_order ? (
                        <span className="text-xs text-muted-foreground">
                          Order {item.live_presentation_order}
                        </span>
                      ) : null}
                    </>
                  ) : item.nominated ? (
                    <Badge variant="outline">Nominated</Badge>
                  ) : null}
                </div>
              );
            },
          }),
        ]
      : []),
  ]);
}

export function ParticipantMarksView({
  competitionName,
  rows,
  showTrack,
  canNominate,
  liveSession,
}: {
  competitionName: string | null;
  rows: ParticipantMarkRow[];
  showTrack: boolean;
  canNominate: boolean;
  liveSession: LivePresentationDraft;
}) {
  const router = useRouter();
  const [view, setView] = React.useState<View>("all");
  const [query, setQuery] = React.useState("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "average", desc: true },
  ]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [nominatedOverride, setNominatedOverride] = React.useState<
    Record<string, boolean>
  >({});
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [sessionForm, setSessionForm] =
    React.useState<LivePresentationDraft>(liveSession);

  const views = React.useMemo(
    () =>
      canNominate
        ? VIEWS
        : VIEWS.filter((item) => item.value !== "nominated"),
    [canNominate]
  );

  const resolved = React.useMemo(
    () =>
      rows.map((row) => {
        const override = nominatedOverride[row.registration_id];
        if (override === undefined || override === row.nominated) return row;
        return { ...row, nominated: override };
      }),
    [rows, nominatedOverride]
  );

  const waiting = resolved.filter(
    (row) =>
      row.education_level === "POSTGRADUATE" && row.nominated && !row.invited
  ).length;

  const toggleNomination = React.useCallback(
    async (row: ParticipantMarkRow, nominated: boolean) => {
      if (row.invited || row.education_level !== "POSTGRADUATE") return;
      setPendingId(row.registration_id);
      setNominatedOverride((prev) => ({
        ...prev,
        [row.registration_id]: nominated,
      }));
      try {
        const res = await fetch(
          `/api/registrations/${row.registration_id}/live-presentation`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nominated }),
          }
        );
        const data = (await res.json()) as { error?: unknown };
        if (!res.ok) {
          setNominatedOverride((prev) => {
            const next = { ...prev };
            delete next[row.registration_id];
            return next;
          });
          toast.error(
            typeof data.error === "string"
              ? data.error
              : "Could not update the nomination."
          );
          return;
        }
        router.refresh();
      } catch {
        setNominatedOverride((prev) => {
          const next = { ...prev };
          delete next[row.registration_id];
          return next;
        });
        toast.error("Could not update the nomination.");
      } finally {
        setPendingId(null);
      }
    },
    [router]
  );

  const sendInvitations = React.useCallback(async () => {
    const joinMinutes = Number(sessionForm.join_minutes);
    if (
      !sessionForm.date ||
      !sessionForm.time ||
      !sessionForm.platform.trim() ||
      !sessionForm.meeting_url.trim() ||
      !sessionForm.reply_by ||
      !Number.isInteger(joinMinutes) ||
      joinMinutes < 1
    ) {
      toast.error(
        "Enter the date, time, platform, meeting link, reply-by date, and how early to join."
      );
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/live-presentation/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: sessionForm.date,
          time: sessionForm.time.slice(0, 5),
          platform: sessionForm.platform.trim(),
          meeting_url: sessionForm.meeting_url.trim(),
          reply_by: sessionForm.reply_by,
          join_minutes: joinMinutes,
        }),
      });
      const data = (await res.json()) as {
        error?: unknown;
        sent?: number;
        failed?: number;
        total?: number;
        message?: string;
      };
      if (!res.ok) {
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "Could not send invitations."
        );
        return;
      }
      if (!data.sent) {
        toast.message(
          data.message ?? "No nominated participants are waiting for an invitation."
        );
        return;
      }
      toast.success(
        data.failed
          ? `Invitation sent to ${data.sent} of ${data.total} participants.`
          : `Invitation sent to ${data.sent} participant${data.sent === 1 ? "" : "s"}.`
      );
      setInviteOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not send invitations.");
    } finally {
      setSending(false);
    }
  }, [router, sessionForm]);

  const counts = React.useMemo(
    () =>
      Object.fromEntries(
        views.map((item) => [item.value, resolved.filter(item.match).length])
      ) as Record<View, number>,
    [resolved, views]
  );

  const filtered = React.useMemo(() => {
    const match = views.find((item) => item.value === view)?.match ?? (() => true);
    const needle = query.trim().toLowerCase();
    return resolved.filter(
      (row) =>
        match(row) &&
        (!needle ||
          [
            row.registration_number,
            row.project_title,
            row.participant_name,
            row.institution_name,
            row.category_name,
            ...row.judges.map((judge) => judge.judge_name),
          ].some((value) => value.toLowerCase().includes(needle)))
    );
  }, [resolved, view, query, views]);

  const audience = useScoringAudience();
  const columns = React.useMemo(
    () =>
      createColumns(
        pagination.pageIndex,
        pagination.pageSize,
        showTrack,
        audience === "PAPER_REVIEWER" ? "Paper reviewer marks" : "Judge marks",
        canNominate ? { pendingId, onToggle: toggleNomination } : null
      ),
    [
      pagination.pageIndex,
      pagination.pageSize,
      showTrack,
      audience,
      canNominate,
      pendingId,
      toggleNomination,
    ]
  );

  const table = useTable({
    features,
    data: filtered,
    columns,
    state: { sorting, columnVisibility, pagination },
    getRowId: (row) => row.registration_number,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  function changeView(next: string) {
    setView(next as View);
    table.setPageIndex(0);
  }

  if (!competitionName) {
    return (
      <div className="px-4 lg:px-6">
        <p className="text-sm text-muted-foreground">
          Publish a competition to view participant marks.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <MarksSummary rows={rows} />
      <Tabs
        value={view}
        onValueChange={changeView}
        className="w-full flex-col justify-start gap-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
          <Label htmlFor="marks-view" className="sr-only">
            View
          </Label>
          <Select value={view} onValueChange={changeView}>
            <SelectTrigger
              className="flex w-fit @4xl/main:hidden"
              size="sm"
              id="marks-view"
            >
              <SelectValue placeholder="Select a view" />
            </SelectTrigger>
            <SelectContent>
              {views.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label} ({counts[item.value]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
            {views.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
                {item.value !== "all" && counts[item.value] > 0 ? (
                  <Badge variant="secondary">{counts[item.value]}</Badge>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2">
            {canNominate ? (
              <Button
                size="sm"
                variant="outline"
                disabled={waiting === 0 || sending || pendingId !== null}
                onClick={() => {
                  setSessionForm(liveSession);
                  setInviteOpen(true);
                }}
              >
                {sending ? "Sending…" : "Send invitations"}
              </Button>
            ) : null}
            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  table.setPageIndex(0);
                }}
                placeholder="Search participants"
                aria-label="Search participants"
                className="h-8 w-48 pl-8 lg:w-64"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconLayoutColumns />
                  <span className="hidden lg:inline">Customize Columns</span>
                  <span className="lg:hidden">Columns</span>
                  <IconChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" &&
                      column.getCanHide()
                  )
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : (
                          <FlexRender header={header} />
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          <FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      {rows.length === 0
                        ? "No participants in this competition yet."
                        : "No participants match this view."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <PortalTableFooter
            id="marks-rows-per-page"
            filteredCount={filtered.length}
            totalCount={rows.length}
            noun="participant"
            pageIndex={table.state.pagination.pageIndex}
            pageSize={table.state.pagination.pageSize}
            pageCount={table.getPageCount()}
            canPrevious={table.getCanPreviousPage()}
            canNext={table.getCanNextPage()}
            onPageSize={(size) => table.setPageSize(size)}
            onFirst={() => table.setPageIndex(0)}
            onPrevious={() => table.previousPage()}
            onNext={() => table.nextPage()}
            onLast={() => table.setPageIndex(table.getPageCount() - 1)}
          />
        </div>
      </Tabs>
      {canNominate ? (
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Send live presentation invitations</DialogTitle>
              <DialogDescription>
                Emails go to {waiting} nominated postgraduate participant
                {waiting === 1 ? "" : "s"} who {waiting === 1 ? "has" : "have"}{" "}
                not been invited yet. Presentation order follows the current
                average, highest first.
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void sendInvitations();
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="live-date">Date</Label>
                  <Input
                    id="live-date"
                    type="date"
                    required
                    value={sessionForm.date}
                    onChange={(event) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        date: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="live-time">Time (Malaysia, GMT+8)</Label>
                  <Input
                    id="live-time"
                    type="time"
                    required
                    value={sessionForm.time}
                    onChange={(event) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        time: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="live-platform">Platform</Label>
                <Input
                  id="live-platform"
                  required
                  placeholder="Zoom or Microsoft Teams"
                  value={sessionForm.platform}
                  onChange={(event) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      platform: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="live-link">Meeting link</Label>
                <Input
                  id="live-link"
                  type="url"
                  required
                  placeholder="https://"
                  value={sessionForm.meeting_url}
                  onChange={(event) =>
                    setSessionForm((prev) => ({
                      ...prev,
                      meeting_url: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="live-reply">Reply by</Label>
                  <Input
                    id="live-reply"
                    type="date"
                    required
                    value={sessionForm.reply_by}
                    onChange={(event) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        reply_by: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="live-join">Join early (minutes)</Label>
                  <Input
                    id="live-join"
                    type="number"
                    required
                    min={1}
                    max={180}
                    value={sessionForm.join_minutes}
                    onChange={(event) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        join_minutes: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sending || waiting === 0}>
                  {sending ? "Sending…" : "Send invitations"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
