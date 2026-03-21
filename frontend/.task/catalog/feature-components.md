# Feature Components Catalog for SvelteKit Migration

**Generated:** 2026-03-20  
**Status:** Comprehensive inventory of all feature-specific components

---

## Album Features (`/features/album/components/`)

### TrackList
**Path:** `/features/album/components/TrackList.tsx` (297 lines)

**Props:**
```typescript
interface TrackListProps {
    tracks: Track[];
    album: Album;
    source: AlbumSource;           // "library" | "discover" | "browse"
    currentTrackId: string | undefined;
    colors: ColorPalette | null;
    onPlayTrack: (track: Track, index: number) => void;
    onAddToQueue: (track: Track) => void;
    onAddToPlaylist: (trackId: string) => void;
    previewTrack: string | null;
    previewPlaying: boolean;
    onPreview: (track: Track, e: React.MouseEvent) => void;
}
```

**Internal State:** None (pure presentational)

**Consumed Hooks/Contexts:** None (all logic passed via props)

**Child Components:** `TrackRow` (memoized with custom comparison)

**Event Handlers:**
- `handlePlayTrack`: Play local track
- `handleAddToQueue`: Add to playback queue
- `handleAddToPlaylist`: Open playlist selector
- `handlePreview`: Play preview for unowned tracks
- `handleRowClick`: Conditional play/preview based on ownership

**Features:**
- Dual-mode playback (local file vs preview)
- Missing track badges
- Preview-only badges for unowned albums
- Play count display (library only)
- Double-tap support via `useDoubleTap` hook
- TV navigation support (`data-tv-card`, `data-tv-card-index`)
- Custom memo comparison for performance

**Patterns:**
- `memo` with custom comparison function
- `useCallback` for all event handlers
- Conditional rendering based on `isOwned` prop
- Accessibility via `aria-label` and keyboard support

---

### AlbumActionBar
**Path:** `/features/album/components/AlbumActionBar.tsx` (103 lines)

**Props:**
```typescript
interface AlbumActionBarProps {
    album: Album;
    source: AlbumSource;
    colors: ColorPalette | null;
    onPlayAll: () => void;
    onShuffle: () => void;
    onDownloadAlbum: () => void;
    onAddToPlaylist: () => void;
    isPendingDownload: boolean;
    isPlaying?: boolean;
    isPlayingThisAlbum?: boolean;
    onPause?: () => void;
}
```

**Internal State:** None (derived)

**Consumed Hooks/Contexts:** None

**Event Handlers:**
- `handlePlayPauseClick`: Conditional play/pause based on state

**Features:**
- Play all button (owned albums only)
- Shuffle button (owned albums only)
- Add to playlist button (owned albums only)
- Download button (unowned albums with MBID)
- Pause button when playing this album
- Cooldown logic for download (via parent)

**Patterns:**
- Conditional rendering based on `isOwned` and `showDownload`
- Disabled state for pending downloads
- Icon-only buttons for secondary actions

---

### SimilarAlbums
**Path:** `/features/album/components/SimilarAlbums.tsx` (39 lines)

**Props:**
```typescript
interface SimilarAlbumsProps {
    similarAlbums: SimilarAlbum[];
    colors: ColorPalette | null;
    onNavigate: (albumId: string) => void;
}
```

**Internal State:** None

**Consumed Hooks/Contexts:** None

**Child Components:** `PlayableCard`, `SectionHeader`

**Features:**
- Grid layout (2-5 columns responsive)
- Navigation to album detail pages
- Owned badge for library albums
- TV navigation support

**Patterns:**
- Simple map/render pattern
- Reuses `SectionHeader` component

---

## Artist Features (`/features/artist/components/`)

### ArtistHero
**Path:** `/features/artist/components/ArtistHero.tsx` (177 lines)

**Props:**
```typescript
interface ArtistHeroProps {
    artist: Artist;
    source: ArtistSource;
    albums: Album[];
    heroImage: string | null;
    backgroundImage?: string | null;
    colors: ColorPalette | null;
    onReload: () => void;
    children?: ReactNode;
}
```

**Internal State:** None (derived)

**Consumed Hooks/Contexts:**
- `useArtistDisplayData`: Custom hook for metadata display with user overrides

**Child Components:**
- `MetadataEditor` (lazy-loaded via `Suspense`, library albums only)

**Features:**
- Dynamic background from hero image or gradient
- VibrantJS color extraction for overlays
- Circular artist image
- Edit badge for user-overridden metadata
- Listener count and album stats
- Conditional MetadataEditor modal (library only)

**Patterns:**
- Lazy loading with `Suspense`
- Conditional rendering based on source
- Background gradient from color palette

---

### ArtistActionBar
**Path:** `/features/artist/components/ArtistActionBar.tsx` (106 lines)

**Props:**
```typescript
interface ArtistActionBarProps {
    artist: Artist;
    albums: Album[];
    source: ArtistSource;
    colors: ColorPalette | null;
    onPlayAll: () => void;
    onShuffle: () => void;
    onDownloadAll: () => void;
    onStartRadio?: () => void;
    isPendingDownload: boolean;
    isPlaying?: boolean;
    isPlayingThisArtist?: boolean;
    onPause?: () => void;
}
```

**Internal State:** None (derived)

**Event Handlers:**
- `handlePlayPauseClick`: Conditional play/pause

**Features:**
- Play all button
- Shuffle button
- Radio button (library only)
- Download all button (discovery/unowned)
- Pause button when playing

**Patterns:**
- Similar to `AlbumActionBar`
- Conditional radio button for library artists

---

### PopularTracks
**Path:** `/features/artist/components/PopularTracks.tsx` (202 lines)

**Props:**
```typescript
interface PopularTracksProps {
    tracks: Track[];
    artist: Artist;
    currentTrackId: string | undefined;
    colors: ColorPalette | null;
    onPlayTrack: (track: Track) => void;
    previewTrack: string | null;
    previewPlaying: boolean;
    onPreview: (track: Track, e: React.MouseEvent) => void;
}
```

**Internal State:**
- `useRef`: `lastTapRef` for double-tap detection

**Consumed Hooks/Contexts:** None

**Features:**
- Top 10 tracks display
- Play count badges
- Preview mode for unowned tracks
- Double-tap support (touch and keyboard)
- Album art thumbnails
- TV navigation support

**Patterns:**
- Manual double-tap detection with `useRef`
- Inline event handlers with closure capture
- Conditional preview vs full playback

---

### AvailableAlbums
**Path:** `/features/artist/components/AvailableAlbums.tsx` (185 lines)

**Props:**
```typescript
interface AvailableAlbumsProps {
    albums: Album[];
    artistName: string;
    source: ArtistSource;
    colors: ColorPalette | null;
    onDownloadAlbum: (album: Album, e: React.MouseEvent) => void;
    isPendingDownload: (mbid: string) => boolean;
}
```

**Internal State:**
- `useState`: `coverArt` (lazy-loaded)
- `useState`: `fetchAttempted`
- `useEffect`: Lazy cover art fetch with staggered timing

**Child Components:** `LazyAlbumCard`, `AlbumGrid`, `SectionHeader`

**Features:**
- Lazy cover art loading for discovery albums
- Staggered fetch to avoid thundering herd
- Separation of studio albums vs EPs/singles
- Download tracking by MBID
- Year and type in subtitle

**Patterns:**
- Sub-component pattern (`LazyAlbumCard`, `AlbumGrid`)
- Effect-based lazy loading
- Staggered timing via `setTimeout` with index

---

### Discography
**Path:** `/features/artist/components/Discography.tsx` (84 lines)

**Props:**
```typescript
interface DiscographyProps {
    albums: Album[];
    colors: ColorPalette | null;
    onPlayAlbum: (albumId: string, albumTitle: string) => Promise<void>;
    sortBy: "year" | "dateAdded";
    onSortChange: (sortBy: "year" | "dateAdded") => void;
}
```

**Internal State:** None (controlled component)

**Features:**
- Sort dropdown (year/date added)
- Play album action
- Track count in subtitle
- TV navigation support

**Patterns:**
- Controlled sort state via props
- Reuses `SectionHeader` with custom `rightAction`

---

### ArtistBio
**Path:** `/features/artist/components/ArtistBio.tsx` (23 lines)

**Props:**
```typescript
interface ArtistBioProps {
    bio: string;
}
```

**Features:**
- HTML sanitization with `DOMPurify`
- Styled prose with Tailwind `prose` plugin
- Link styling overrides

**Patterns:**
- Minimal component, pure presentation
- `dangerouslySetInnerHTML` with sanitization

---

### SimilarArtists
**Path:** `/features/artist/components/SimilarArtists.tsx` (112 lines)

**Props:**
```typescript
interface SimilarArtistsProps {
    similarArtists: SimilarArtist[];
    onNavigate: (artistId: string) => void;
}
```

**Internal State:** None

**Features:**
- Circular artist cards
- Library indicator badge
- Match percentage display
- Owned album count
- Navigation to artist pages
- TV navigation support

**Patterns:**
- Manual keyboard handling (`onKeyDown`)
- Conditional library vs discovery navigation
- Image fallback with icon

---

## Home Features (`/features/home/components/`)

### SectionHeader
**Path:** `/features/home/components/SectionHeader.tsx` (56 lines)

**Props:**
```typescript
interface SectionHeaderProps {
    title: string;
    showAllHref?: string;
    rightAction?: React.ReactNode;
    badge?: string;
    color?: "featured" | "tracks" | "albums" | "podcasts" | "audiobooks" | "artists" | "discover";
}
```

**Internal State:** None

**Features:**
- Color-coded gradient accent
- Optional "Show all" link
- Custom right action slot
- Badge support (e.g., "AI-generated")

**Patterns:**
- Reusable across all features
- Gradient color mapping via constant object
- `memo` wrapper

---

### PopularArtistsGrid
**Path:** `/features/home/components/PopularArtistsGrid.tsx` (81 lines)

**Props:**
```typescript
interface PopularArtistsGridProps {
    artists: PopularArtist[];
}
```

**Internal State:** None

**Child Components:** `PopularArtistCard` (memoized), `HorizontalCarousel`

**Features:**
- Horizontal carousel layout
- Listener count display
- Search navigation on click
- Hover animations
- TV navigation support

**Patterns:**
- Sub-component pattern with memoization
- Reuses `HorizontalCarousel` component

---

### FeaturedPlaylistsGrid
**Path:** `/features/home/components/FeaturedPlaylistsGrid.tsx` (125 lines)

**Props:**
```typescript
interface FeaturedPlaylistsGridProps {
    playlists: PlaylistPreview[];
}
```

**Internal State:** None

**Child Components:** `PlaylistCard` (memoized), `HorizontalCarousel`, `FeaturedPlaylistsSkeleton`

**Features:**
- Deezer playlist integration
- Custom Deezer icon
- Play button on hover
- Navigation to playlist pages
- Skeleton loading state
- Limit to 20 playlists

**Patterns:**
- Skeleton component for loading state
- Memoized card component
- `useCallback` for handler memoization

---

### ContinueListening
**Path:** `/features/home/components/ContinueListening.tsx` (155 lines)

**Props:**
```typescript
interface ContinueListeningProps {
    items: ListenedItem[];
}
```

**Internal State:** None

**Child Components:** `ContinueListeningCard` (memoized), `HorizontalCarousel`

**Features:**
- Multi-type support (artist, podcast, audiobook)
- Progress bar for podcasts/audiobooks
- Type-specific icons and colors
- Navigation to respective detail pages
- Listener count in subtitle

**Patterns:**
- Type-based conditional rendering
- Color mapping by content type
- Reusable card pattern

---

### MixesGrid
**Path:** `/features/home/components/MixesGrid.tsx` (24 lines)

**Props:**
```typescript
interface MixesGridProps {
    mixes: Mix[];
}
```

**Internal State:** None

**Child Components:** `MixCard`, `HorizontalCarousel`

**Features:**
- AI-generated mix display
- Reuses `MixCard` component

**Patterns:**
- Minimal wrapper component
- Delegates to specialized `MixCard`

---

## Library Features (`/features/library/components/`)

### LibraryHeader
**Path:** `/features/library/components/LibraryHeader.tsx` (40 lines)

**Props:**
```typescript
interface LibraryHeaderProps {
    totalItems: number;
    activeTab: string;
}
```

**Internal State:** None

**Features:**
- System status indicator
- Large title display
- Live item counter
- Tab-specific label

**Patterns:**
- Pure presentation component
- No Next.js-specific APIs

---

### LibraryToolbar
**Path:** `/features/library/components/LibraryToolbar.tsx` (93 lines)

**Props:**
```typescript
interface LibraryToolbarProps {
    activeTab: Tab;
    filter: LibraryFilter;
    sortBy: SortOption;
    itemsPerPage: number;
    onFilterChange: (filter: LibraryFilter) => void;
    onSortChange: (sort: SortOption) => void;
    onItemsPerPageChange: (items: number) => void;
    onShuffleLibrary: () => void;
}
```

**Internal State:** None (controlled)

**Features:**
- Filter pills (Owned/Discovery/All)
- Sort dropdown (tab-specific options)
- Items per page selector
- Shuffle library button
- Conditional filter display (artists/albums only)

**Patterns:**
- Controlled component pattern
- Filter pill constant array
- Tab-specific sort options

---

### TracksList
**Path:** `/features/library/components/TracksList.tsx` (255 lines)

**Props:**
```typescript
interface TracksListProps {
    tracks: Track[];
    onPlay: (tracks: Track[], startIndex?: number) => void;
    onAddToQueue: (track: Track) => void;
    onAddToPlaylist: (playlistId: string, trackId: string) => void;
    onDelete: (trackId: string, trackTitle: string) => void;
    isLoading?: boolean;
}
```

**Internal State:**
- `useState`: `showPlaylistSelector`
- `useState`: `selectedTrackId`

**Consumed Hooks/Contexts:**
- `useAudioState`: `currentTrack`

**Child Components:** `TrackRow` (memoized), `PlaylistSelector`

**Event Handlers:**
- `handleShowAddToPlaylist`: Open playlist selector
- `handleAddToPlaylist`: Add track to playlist

**Features:**
- Terminal-style header row
- Album column (desktop only)
- Action buttons on hover
- Double-tap support
- Loading state with spinner
- Empty state fallback
- Playlist selector modal

**Patterns:**
- Memoized row with custom comparison
- `useCallback` for handlers
- Conditional modal rendering
- `useDoubleTap` hook integration

---

## Search Features (`/features/search/components/`)

### TopResult
**Path:** `/features/search/components/TopResult.tsx` (97 lines)

**Props:**
```typescript
interface TopResultProps {
    libraryArtist?: Artist;
    discoveryArtist?: DiscoverResult;
}
```

**Internal State:** None

**Features:**
- Large artist card display
- Library vs discovery detection
- Background image with overlay
- Gradient border on hover
- External link icon

**Patterns:**
- Conditional rendering based on source
- Large hero-style card
- Hover animations

---

### SoulseekBrowser
**Path:** `/features/search/components/SoulseekBrowser.tsx` (532 lines)

**Props:**
```typescript
interface SoulseekBrowserProps {
    results: SoulseekResult[];
    isSearching: boolean;
    isPolling: boolean;
    isComplete: boolean;
    uniqueUserCount: number;
    downloadingFiles: Set<string>;
    onDownload: (result: SoulseekResult) => void;
    onBulkDownload: (results: SoulseekResult[]) => void;
}
```

**Internal State:**
- `useState`: `formatFilters` (Set)
- `useState`: `sortField`
- `useState`: `viewMode` (flat/grouped)
- `useState`: `selectedKeys` (Set)
- `useState`: `displayLimit` (infinite scroll)
- `useState`: `expandedGroups` (Set)
- `useState`: `groupsInitialized`
- `useRef`: `sentinelRef` (IntersectionObserver)
- `useMemo`: `filtered`, `sorted`, `grouped`, `selectedResults`
- `useEffect`: IntersectionObserver for infinite scroll
- `useCallback`: All event handlers

**Child Components:** `FlatView`, `GroupedView`, `ResultRow`

**Features:**
- Format filter pills (FLAC/320+/256+)
- Sort by quality/bitrate/size/filename
- Flat or grouped view (by username)
- Infinite scroll with IntersectionObserver
- Bulk selection and download
- Real-time search status
- File metadata parsing
- Quality badges
- Download progress tracking

**Patterns:**
- Complex state management with Sets
- Memoized filtered/sorted results
- Sub-component pattern (FlatView/GroupedView)
- Infinite scroll with sentinel
- Group expansion state
- Helper functions for filename parsing

**Third-party:**
- Custom helper functions from `soulseekHelpers.tsx`

---

## Podcast Features (`/features/podcast/components/`)

### PodcastHero
**Path:** `/features/podcast/components/PodcastHero.tsx` (176 lines)

**Props:**
```typescript
interface PodcastHeroProps {
    title: string;
    author: string;
    description?: string;
    genres?: string[];
    heroImage: string | null;
    colors: ColorPalette | null;
    episodeCount: number;
    inProgressCount: number;
    children?: ReactNode;
}
```

**Internal State:** None

**Consumed Hooks/Contexts:**
- `useRouter`: Navigation

**Features:**
- Back navigation button
- System status indicator
- Cover art display
- Episode count and progress
- Genre tags
- Description truncation (HTML stripped)

**Patterns:**
- Similar to `AlbumHero`/`ArtistHero`
- HTML sanitization for description
- Conditional genre display

---

### PodcastActionBar
**Path:** `/features/podcast/components/PodcastActionBar.tsx` (135 lines)

**Props:**
```typescript
interface PodcastActionBarProps {
    isSubscribed: boolean;
    feedUrl?: string;
    colors: ColorPalette | null;
    isSubscribing: boolean;
    showDeleteConfirm: boolean;
    onSubscribe: () => void;
    onRemove: () => void;
    onShowDeleteConfirm: (show: boolean) => void;
    onPlayLatest?: () => void;
    isPlayingPodcast?: boolean;
    onPause?: () => void;
    onRefresh?: () => Promise<unknown>;
    isRefreshing?: boolean;
}
```

**Internal State:** None (controlled)

**Features:**
- Subscribe/Unsubscribe toggle
- Play latest episode
- Refresh for new episodes
- RSS feed link
- Delete confirmation flow
- Loading states

**Patterns:**
- Confirmation dialog inline
- Spinner for async operations
- Conditional action buttons

---

### EpisodeList
**Path:** `/features/podcast/components/EpisodeList.tsx` (280 lines)

**Props:**
```typescript
interface EpisodeListProps {
    podcast: Podcast;
    episodes: Episode[];
    sortOrder: "newest" | "oldest";
    onSortOrderChange: (order: "newest" | "oldest") => void;
    isEpisodePlaying: (episodeId: string) => boolean;
    isPlaying: boolean;
    onPlayPause: (episode: Episode) => void;
    onPlay: (episode: Episode) => void;
    onMarkComplete?: (episodeId: string, duration: number) => void;
}
```

**Internal State:**
- `useState`: `expanded` (per episode description)
- `useRef`: `lastTapRef` (double-tap)

**Consumed Hooks/Contexts:** None

**Child Components:** `EpisodeRow`

**Features:**
- Sort toggle (newest/oldest)
- Progress bar per episode
- Season/episode number display
- Description expand/collapse
- HTML sanitization
- Double-tap support
- Mark as complete button
- Finished badge

**Patterns:**
- Sub-component pattern
- Inline description expansion
- Progress tracking
- Conditional complete button

---

## Audiobook Features (`/features/audiobook/components/`)

### AudiobookHero
**Path:** `/features/audiobook/components/AudiobookHero.tsx` (183 lines)

**Props:**
```typescript
interface AudiobookHeroProps {
    audiobook: Audiobook;
    heroImage: string | null;
    colors: ColorPalette | null;
    metadata: {
        narrator: string | null;
        genre: string | null;
        publishedYear: string | null;
        description: string | null;
    } | null;
    formatTime: (seconds: number) => string;
    children?: ReactNode;
}
```

**Internal State:** None (derived)

**Consumed Hooks/Contexts:**
- `useRouter`: Navigation

**Features:**
- Back navigation
- Cover art display
- Narrator and genre metadata
- Progress percentage
- Series information
- Duration formatting
- Description truncation

**Patterns:**
- Similar to `PodcastHero`/`AlbumHero`
- Type-specific color scheme (amber/orange)

---

### ChapterList
**Path:** `/features/audiobook/components/ChapterList.tsx` (54 lines)

**Props:**
```typescript
interface ChapterListProps {
    chapters: AudiobookChapter[];
    onSeekToChapter: (startTime: number) => void;
    formatTime: (seconds: number) => string;
}
```

**Internal State:** None

**Features:**
- Chapter list display
- Click to seek
- Start time display
- Hidden if > 50 chapters

**Patterns:**
- Minimal component
- Reuses `SectionHeader` pattern

---

## Discover Features (`/features/discover/components/`)

### DiscoverHero
**Path:** `/features/discover/components/DiscoverHero.tsx` (84 lines)

**Props:**
```typescript
interface DiscoverHeroProps {
    playlist: DiscoverPlaylist | null;
    config: DiscoverConfig | null;
    onOpenSettings: () => void;
}
```

**Internal State:** None

**Consumed Hooks/Contexts:**
- `date-fns`: Date formatting

**Features:**
- Settings button (top right)
- Week start date display
- Track count
- Total duration calculation
- Last generated timestamp

**Patterns:**
- Absolute positioning for settings button
- Duration formatting helper
- Date formatting with `date-fns`

---

### HowItWorks
**Path:** `/features/discover/components/HowItWorks.tsx` (56 lines)

**Props:** None

**Internal State:** None

**Features:**
- Feature explanation modal content
- Step-by-step guide
- Chevron icons for steps

**Patterns:**
- Pure presentation component
- Reuses `Card` component

---

## Key Observations

### Common Patterns Across Features

1. **Hero Components**: All features use similar hero layout:
   - Background image/gradient
   - System status indicator
   - Title and metadata
   - Action bar as children
   - Consistent spacing and typography

2. **ActionBar Components**: Standard action patterns:
   - Play/pause toggle
   - Secondary actions (shuffle, download, etc.)
   - Loading states
   - Conditional rendering based on ownership

3. **List Components**: Track/episode/chapter lists:
   - Memoized row components
   - Double-tap support
   - Progress indicators
   - Action buttons on hover
   - TV navigation support

4. **Grid Components**: Album/artist/podcast grids:
   - Responsive column counts (2-5)
   - Horizontal carousel for home
   - PlayableCard reuse
   - Badge system (owned, download, etc.)

5. **State Management**:
   - Controlled components (state in parent)
   - Local state for UI concerns (modals, expansion)
   - Refs for gesture handling (double-tap)
   - No component-level data fetching (via React Query in pages)

### Next.js APIs Used in Features

- `useRouter` / `usePathname`: Navigation
- `Link`: Client-side navigation
- `next/image`: Optimized images
- File-based routing for detail pages

### Third-Party Dependencies in Features

- `date-fns`: Date formatting
- `DOMPurify`: HTML sanitization
- `lucide-react`: Icons
- `clsx` / `tailwind-merge`: className merging
- VibrantJS (via hooks): Color extraction

### SvelteKit Migration Considerations

1. **Navigation**: Replace `useRouter` with `goto()` from `$app/navigation`
2. **Images**: Replace `next/image` with custom image component or SvelteKit's image optimization
3. **State**: Convert React hooks to Svelte stores or reactive declarations
4. **Events**: Replace `onClick` with Svelte's event handlers
5. **Conditional Rendering**: Replace `{condition && <Component />}` with `{#if condition}...{/if}`
6. **Lists**: Replace `.map()` with `{#each}` blocks
7. **Refs**: Replace `useRef` with Svelte bindings or `bind:this`
8. **Effects**: Replace `useEffect` with Svelte's reactive statements or `onMount`
9. **Memoization**: Replace `memo`/`useMemo` with Svelte's `$derived` or stores

---

*End of Feature Components Catalog*
