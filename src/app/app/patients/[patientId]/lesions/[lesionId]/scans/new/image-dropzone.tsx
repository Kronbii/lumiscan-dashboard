"use client";

import { ScanLine } from "lucide-react";
import * as React from "react";
import { ReticleFrame, SpecimenBar } from "@/components/ui/instrument";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/*
  Instrument dropzone for the scan capture. The real form contract lives in
  the visually-hidden <input name="image"> — drag/drop assigns into it, so
  the multipart server action receives the file exactly as before.
*/
export function ImageDropzone({ site }: { site: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (!dropped || !ACCEPTED_TYPES.includes(dropped.type)) return;
    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(dropped);
      inputRef.current.files = transfer.files;
    }
    setFile(dropped);
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragging(false);
    }
  }

  return (
    <label
      className="grid cursor-pointer gap-1.5 rounded-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        className="sr-only"
        name="image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
      />

      {file && previewUrl ? (
        <span className="block overflow-hidden rounded-sm border border-border">
          <ReticleFrame className="block rounded-none">
            {/* Blob preview URL — next/image cannot optimize object URLs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selected dermoscopic capture"
              className="max-h-72 w-full object-contain"
            />
          </ReticleFrame>
          <SpecimenBar
            items={[site, file.name, formatSize(file.size), "MANUAL"]}
          />
        </span>
      ) : (
        <ReticleFrame
          className={cn(
            "flex min-h-44 items-center justify-center border border-dashed border-border-strong transition-colors",
            dragging && "border-primary bg-primary-soft",
          )}
        >
          <span className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <ScanLine size={24} strokeWidth={1.75} className="text-faint" />
            <span className="text-[0.8125rem] font-semibold text-foreground">
              Drop capture or browse
            </span>
            <span className="text-xs text-muted">
              JPEG, PNG or WebP · up to 15 MB
            </span>
          </span>
        </ReticleFrame>
      )}

      {file ? (
        <span className="text-xs text-muted">
          Click the frame to replace the capture.
        </span>
      ) : null}
    </label>
  );
}
