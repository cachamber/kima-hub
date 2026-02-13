import { Disc3 } from "lucide-react";
import { api } from "@/lib/api";
import { MediaCard } from "@/components/cards/MediaCard";
import { Album } from "../types";

interface LibraryAlbumsGridProps {
    albums: Album[];
}

export function LibraryAlbumsGrid({ albums }: LibraryAlbumsGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4" data-tv-section="search-results-albums">
            {albums.slice(0, 6).map((album, index) => (
                <MediaCard
                    key={album.id}
                    href={`/album/${album.id}`}
                    title={album.title}
                    subtitle={album.artist?.name || ""}
                    imageUrl={
                        album.coverUrl || album.albumId
                            ? api.getCoverArtUrl(album.coverUrl || album.albumId, 200)
                            : null
                    }
                    fallbackIcon={Disc3}
                    accentColor={{
                        border: "hover:border-[#22c55e]/50",
                        gradient: "bg-gradient-to-r from-[#22c55e] to-[#16a34a]",
                        button: "bg-[#22c55e] text-black",
                        shadow: "hover:shadow-[#22c55e]/10",
                    }}
                    index={index}
                />
            ))}
        </div>
    );
}
