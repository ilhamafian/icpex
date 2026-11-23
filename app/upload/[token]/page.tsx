import Link from "next/link";

import { DocumentUploadForm } from "@/components/DocumentUploadForm";
import { mutedTextClassName } from "@/components/registrationFormUi";
import { loadDocumentUploadPage } from "@/utils/documentUpload";

type UploadPageProps = {
  params: Promise<{ token: string }>;
};

export default async function UploadPage({ params }: UploadPageProps) {
  const { token } = await params;
  const upload = await loadDocumentUploadPage(token);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex w-full items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
        >
          ← Home
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          {upload ? (
            <UploadDetails token={token} upload={upload} />
          ) : (
            <Unavailable />
          )}
        </div>
      </main>
    </div>
  );
}

function Unavailable() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Upload link unavailable
      </h1>
      <p className={`mt-2 ${mutedTextClassName}`}>
        This link is invalid. Use the upload link from the latest email, or
        contact the secretariat.
      </p>
    </>
  );
}

function UploadDetails({
  token,
  upload,
}: {
  token: string;
  upload: NonNullable<Awaited<ReturnType<typeof loadDocumentUploadPage>>>;
}) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Documents for {upload.registrationNumber}
      </h1>
      <p className={`mt-2 ${mutedTextClassName}`}>
        {upload.projectTitle}
        {upload.trackName ? ` · ${upload.trackName}` : ""}
        {upload.deadline ? `. Submit by ${upload.deadline}.` : "."}
      </p>
      {upload.submitted ? (
        <Submitted upload={upload} />
      ) : (
        <DocumentUploadForm token={token} requirements={upload.requirements} />
      )}
    </>
  );
}

function Submitted({
  upload,
}: {
  upload: NonNullable<Awaited<ReturnType<typeof loadDocumentUploadPage>>>;
}) {
  return (
    <div className="mt-8 border-t border-black/10 pt-6 dark:border-white/10">
      <p className={mutedTextClassName}>
        These documents have been submitted. To correct or replace a file,
        contact the secretariat.
      </p>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {upload.requirements.map((requirement) => (
          <li key={requirement.requirementId}>
            <span className="font-medium">{requirement.label}</span>
            <span className={`block ${mutedTextClassName}`}>
              {requirement.fileName
                ? requirement.fileName
                : requirement.required
                  ? "Missing"
                  : "Not submitted"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
