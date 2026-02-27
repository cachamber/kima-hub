import JSZip from "jszip";
import { api } from "@/lib/api";

export interface DownloadedFile {
    filename: string;
    blob: Blob;
    zipPath?: string;
}

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/aac": "aac",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
};

export function sanitizeFilename(value: string): string {
    return value
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
}

function getFileExtension(contentType?: string): string {
    if (!contentType) {
        return "mp3";
    }

    const normalizedType = contentType.split(";")[0].trim().toLowerCase();
    return CONTENT_TYPE_EXTENSIONS[normalizedType] || "mp3";
}

export function triggerDownload(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
    }, 1500);
}

export async function fetchTrackForLocalSave(
    trackId: string,
    baseFilename: string
): Promise<DownloadedFile> {
    const streamUrl = api.getStreamUrl(trackId);
    const response = await fetch(streamUrl, {
        method: "GET",
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch track (${response.status})`);
    }

    const blob = await response.blob();
    const extension = getFileExtension(
        response.headers.get("content-type") || blob.type
    );

    return {
        filename: `${sanitizeFilename(baseFilename)}.${extension}`,
        blob,
    };
}

export async function saveFilesAsZip(
    files: DownloadedFile[],
    zipBaseName: string
): Promise<void> {
    const zip = new JSZip();
    const usedNames = new Map<string, number>();

    const sanitizeZipPath = (value: string): string => {
        return value
            .split("/")
            .map((segment) => sanitizeFilename(segment))
            .filter(Boolean)
            .join("/");
    };

    for (const file of files) {
        const sourceName = file.zipPath || file.filename;
        const safeName = sanitizeZipPath(sourceName);
        const count = usedNames.get(safeName) || 0;
        usedNames.set(safeName, count + 1);

        const finalName =
            count === 0
                ? safeName
                : safeName.replace(/(\.[^.]*)?$/, ` (${count + 1})$1`);

        zip.file(finalName, file.blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    triggerDownload(zipBlob, `${sanitizeFilename(zipBaseName)}.zip`);
}
