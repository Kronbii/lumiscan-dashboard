"use client";

import { useState } from "react";
import Image from "next/image";
import { ReticleFrame } from "@/components/ui/instrument";
import {
  ScanLightbox,
  type LightboxScan,
} from "@/app/app/patients/[patientId]/lesions/[lesionId]/scan-lightbox";

export function ScanDetailImage({ scan, site }: { scan: LightboxScan; site: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View full image"
        className="block w-full cursor-zoom-in overflow-hidden rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ReticleFrame>
          <div className="relative aspect-square w-full overflow-hidden bg-surface-3">
            <Image
              src={scan.primaryImageUrl}
              alt="Lesion scan"
              fill
              sizes="(max-width: 1024px) 100vw, 460px"
              className="object-cover"
            />
          </div>
        </ReticleFrame>
      </button>
      {open ? (
        <ScanLightbox scans={[scan]} index={0} site={site} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
