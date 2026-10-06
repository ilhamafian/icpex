"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState } from "react";
import { IconPhoto, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { LandingHero } from "@/components/LandingHero";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCompetitionDates } from "@/utils/competitionDates";
import { registrationLinks } from "@/utils/registrationLinks";
import type { SerializedBanner } from "@/utils/serializeBanner";
import type { SerializedCompetition } from "@/utils/serializeCatalog";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type BannerFormState = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  image_url: string;
};

function bannerToForm(
  banner: SerializedBanner | undefined,
  competition: SerializedCompetition | undefined
): BannerFormState {
  if (banner) {
    return {
      eyebrow: banner.eyebrow,
      headline: banner.headline,
      subheadline: banner.subheadline,
      image_url: banner.image_url,
    };
  }
  return {
    eyebrow: "",
    headline: competition?.name ?? "",
    subheadline: "",
    image_url: "",
  };
}

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

export function BannerManager({
  competitions,
  initialBanners,
  currentCompetitionId,
}: {
  competitions: SerializedCompetition[];
  initialBanners: SerializedBanner[];
  /** Published competition currently shown on the landing page. */
  currentCompetitionId: string | null;
}) {
  const [banners, setBanners] = useState(() =>
    Object.fromEntries(initialBanners.map((b) => [b.competition_id, b]))
  );
  const [competitionId, setCompetitionId] = useState(
    currentCompetitionId ?? competitions[0]?._id ?? ""
  );
  const competition = competitions.find((c) => c._id === competitionId);
  const banner = banners[competitionId];

  const [form, setForm] = useState(() => bannerToForm(banner, competition));
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!localPreview) return;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const dirty = useMemo(() => {
    const saved = bannerToForm(banner, competition);
    return (Object.keys(saved) as (keyof BannerFormState)[]).some(
      (key) => saved[key] !== form[key]
    );
  }, [banner, competition, form]);

  function selectCompetition(id: string) {
    setCompetitionId(id);
    setForm(
      bannerToForm(
        banners[id],
        competitions.find((c) => c._id === id)
      )
    );
    setLocalPreview(null);
  }

  function updateField<K extends keyof BannerFormState>(
    key: K,
    value: BannerFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleImageUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file (JPG, PNG, WebP or GIF).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be 10 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const blob = await upload(`banners/${file.name}`, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
      });
      updateField("image_url", blob.url);
      setLocalPreview(URL.createObjectURL(file));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed. Try again."
      );
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    updateField("image_url", "");
    setLocalPreview(null);
  }

  async function handleSave() {
    if (!competitionId) return;
    if (!form.headline.trim()) {
      toast.error("Headline is required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/banners/${competitionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "Could not save banner."
        );
        return;
      }

      const saved = data.banner as SerializedBanner;
      setBanners((current) => ({ ...current, [competitionId]: saved }));
      setForm(bannerToForm(saved, competition));
      toast.success(
        competitionId === currentCompetitionId
          ? "Banner saved — the landing page is updated."
          : "Banner saved. It will go live when this competition is current."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setConfirmReset(false);
    const response = await fetch(`/api/banners/${competitionId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("Could not reset banner.");
      return;
    }

    setBanners((current) => {
      const next = { ...current };
      delete next[competitionId];
      return next;
    });
    setForm(bannerToForm(undefined, competition));
    setLocalPreview(null);
    toast.success("Banner reset to the default hero.");
  }

  const previewImage =
    localPreview ??
    (form.image_url && form.image_url === banner?.image_url
      ? banner.image_src
      : null);

  if (competitions.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Landing page banner</CardTitle>
            <CardDescription>
              Create a competition first — each competition has its own banner.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Landing page banner</CardTitle>
          <CardDescription>
            Each competition has its own hero banner. The landing page shows the
            banner of the current published competition, so it switches
            automatically when a new competition goes live.
          </CardDescription>
          <CardAction className="flex items-center gap-2">
            {competitionId === currentCompetitionId ? (
              <Badge>Live on landing page</Badge>
            ) : (
              <Badge variant="outline">Not live</Badge>
            )}
          </CardAction>
        </CardHeader>

        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col gap-4">
            <Field label="Competition">
              <Select value={competitionId} onValueChange={selectCompetition}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select competition" />
                </SelectTrigger>
                <SelectContent>
                  {competitions.map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.name}
                      {item._id === currentCompetitionId ? " (current)" : ""}
                      {banners[item._id] ? "" : " · default"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Eyebrow" htmlFor="banner-eyebrow" hint="Optional small label above the headline.">
              <Input
                id="banner-eyebrow"
                value={form.eyebrow}
                maxLength={60}
                onChange={(e) => updateField("eyebrow", e.target.value)}
                placeholder="e.g. Registration now open"
              />
            </Field>

            <Field label="Headline" htmlFor="banner-headline">
              <Input
                id="banner-headline"
                value={form.headline}
                maxLength={120}
                onChange={(e) => updateField("headline", e.target.value)}
                placeholder="e.g. ICPEX 2026"
              />
            </Field>

            <Field label="Subheadline" htmlFor="banner-subheadline">
              <textarea
                id="banner-subheadline"
                value={form.subheadline}
                maxLength={300}
                rows={3}
                onChange={(e) => updateField("subheadline", e.target.value)}
                placeholder="A short description of this year's competition."
                className="w-full min-w-0 resize-y rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm"
              />
            </Field>

            <Field label="Background image" hint="JPG, PNG, WebP or GIF up to 10 MB. Wide images (e.g. 1920×800) work best.">
              <div className="flex items-center gap-2">
                <Button variant="outline" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    <IconPhoto />
                    {uploading
                      ? "Uploading…"
                      : form.image_url
                        ? "Replace image"
                        : "Upload image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={uploading}
                      onChange={(e) => {
                        void handleImageUpload(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                {form.image_url ? (
                  <Button
                    variant="ghost"
                    onClick={removeImage}
                    disabled={uploading}
                  >
                    <IconTrash />
                    Remove
                  </Button>
                ) : null}
              </div>
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Preview</Label>
            <div className="overflow-hidden rounded-xl border">
              <LandingHero
                eyebrow={form.eyebrow}
                headline={form.headline || "Headline"}
                subheadline={form.subheadline}
                actions={registrationLinks(competition?.eligibility)}
                imageSrc={previewImage}
                meta={
                  competition
                    ? formatCompetitionDates(
                        competition.start_date,
                        competition.end_date
                      )
                    : undefined
                }
                className="pointer-events-none min-h-80"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          {banner ? (
            <Button
              variant="outline"
              onClick={() => setConfirmReset(true)}
              disabled={saving || uploading}
            >
              Reset to default
            </Button>
          ) : null}
          <Button
            onClick={() => void handleSave()}
            disabled={saving || uploading || (!dirty && Boolean(banner))}
          >
            {saving ? "Saving…" : "Save banner"}
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset banner?</AlertDialogTitle>
            <AlertDialogDescription>
              The custom banner for{" "}
              <span className="font-medium text-foreground">
                {competition?.name}
              </span>{" "}
              will be removed and the landing page will fall back to the
              default hero with the competition name and dates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleReset()}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
