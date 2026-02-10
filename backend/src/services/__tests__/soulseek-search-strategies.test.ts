import { normalizeTrackTitle, normalizeArtistName } from "../soulseek-search-strategies";

describe("normalizeTrackTitle - Classical Music", () => {
    it("should strip movement numbers from classical music titles", () => {
        const input = "I. Allegro con brio";
        const result = normalizeTrackTitle(input, "aggressive");
        expect(result).not.toContain("I.");
        expect(result).toContain("Allegro con brio");
    });

    it("should strip opus and catalog numbers", () => {
        const input = "Piano Concerto No. 21 in C Major, K. 467: II. Andante";
        const result = normalizeTrackTitle(input, "aggressive");
        expect(result).not.toContain("K. 467");
        expect(result).not.toContain("in C Major");
        expect(result).toContain("Piano Concerto");
        expect(result).toContain("Andante");
    });

    it("should strip featuring artists from track titles", () => {
        const input = "Song Name (feat. Other Artist)";
        const result = normalizeTrackTitle(input, "aggressive");
        expect(result).not.toContain("feat.");
        expect(result).not.toContain("Other Artist");
        expect(result).toBe("Song Name");
    });

    it("should handle ft. and featuring variations", () => {
        const testCases = [
            { input: "Track Name ft. Someone", expected: "Track Name" },
            { input: "Track Name featuring Someone", expected: "Track Name" },
            { input: "Track Name (Ft. Someone)", expected: "Track Name" },
            { input: "Track Name [feat. Someone]", expected: "Track Name" },
        ];

        testCases.forEach(({ input, expected }) => {
            const result = normalizeTrackTitle(input, "aggressive");
            expect(result).toBe(expected);
        });
    });

    it("should keep minimal metadata at minimal level", () => {
        const input = "Song Name (feat. Artist) - Live Version";
        const result = normalizeTrackTitle(input, "minimal");
        // At minimal level, only unicode normalization happens
        expect(result).toContain("feat.");
        expect(result).toContain("Live");
    });
});

describe("normalizeArtistName", () => {
    it('should preserve "The The" band name', () => {
        expect(normalizeArtistName("The The")).toBe("The The");
    });

    it('should remove "The" prefix from normal artist names', () => {
        expect(normalizeArtistName("The Beatles")).toBe("Beatles");
        expect(normalizeArtistName("The Rolling Stones")).toBe("Rolling Stones");
    });

    it('should preserve single "The"', () => {
        expect(normalizeArtistName("The")).toBe("The");
    });

    it('should normalize ampersands to "and"', () => {
        expect(normalizeArtistName("Artist & Band")).toBe("Artist and Band");
    });

    it('should normalize unicode quotes', () => {
        expect(normalizeArtistName("Artist\u2019s Name")).toBe("Artist's Name");
        expect(normalizeArtistName("\u201CArtist\u201D")).toBe('"Artist"');
    });
});
