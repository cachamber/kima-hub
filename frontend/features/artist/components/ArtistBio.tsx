import DOMPurify from "dompurify";
import { SectionHeader } from "@/features/home/components/SectionHeader";

interface ArtistBioProps {
  bio: string;
}

export function ArtistBio({ bio }: ArtistBioProps) {
  if (!bio) return null;

  return (
    <section>
      <SectionHeader color="artists" title="About" />
      <div className="bg-[var(--bg-tertiary)] rounded-md p-4">
        <div
          className="prose prose-sm md:prose-base prose-invert max-w-none leading-relaxed [&_a]:text-brand [&_a]:no-underline [&_a:hover]:underline"
          style={{ color: '#b3b3b3' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bio || "") }}
        />
      </div>
    </section>
  );
}
