# Component Catalog for SvelteKit Migration

**Generated:** 2026-03-20  
**Total Components:** ~142 files across global and feature directories

---

## Global Components

### Layout Components

#### Sidebar
**Path:** `/components/layout/Sidebar.tsx` (512 lines)

**Props:** None (self-contained)

**Internal State:**
- `useState`: `isMobileMenuOpen`, `isSyncing`, `showCreatePlaylist`, `newPlaylistName`, `isCreating`
- `refs`: `syncTimeoutRef`, `createPopoverRef`

**Effects:**
- `useEffect`: Cleanup sync timeout on unmount
- `useEffect`: Close mobile menu on route change (depends: `pathname`)
- `useEffect`: Handle escape key for mobile menu (depends: `isMobileMenuOpen`)
- `useEffect`: Listen for `toggle-mobile-menu` custom event
- `useEffect`: Close create playlist popover on click outside (depends: `showCreatePlaylist`)

**Consumed Hooks/Contexts:**
- `usePathname`, `useRouter`: Next.js navigation
- `useAuth`: `isAuthenticated`
- `useToast`: `toast.error()`
- `useAudioState`: `currentTrack`, `currentAudiobook`, `currentPodcast`, `playbackType`
- `useIsMobile`, `useIsTablet`: Device detection
- `useQuery`: Fetch playlists from API

**API Calls:**
- `api.getPlaylists()`: Fetch user playlists
- `api.scanLibrary()`: Trigger library sync
- `api.createPlaylist(name)`: Create new playlist

**Child Components:**
- `MobileSidebar`: Props - `isOpen`, `onClose`

**Event Handlers:**
- `handleSync`: Triggers library scan, shows error toast on failure
- `handleCreatePlaylist`: Creates playlist, invalidates query, navigates to new playlist

**Next.js APIs:**
- `Link`: Navigation
- `usePathname`: Route detection
- `useRouter`: Programmatic navigation
- `Image`: Optimized image loading

---

#### TopBar
**Path:** `/components/layout/TopBar.tsx` (399 lines)

**Props:** None (self-contained)

**Internal State:**
- `useState`: `searchQuery`, `scanJobId`, `lastScanTime`
- `refs`: `searchTimeoutRef`, `searchInputRef`

**Effects:**
- `useEffect`: Handle scan completion/failure (depends: `scanStatus`, `scanJobId`)
- `useEffect`: Auto-search with debounce (depends: `searchQuery`, `router`, `pathname`)
- `useEffect`: Sync search query with URL on page change (depends: `pathname`)
- `useEffect`: Global "/" keyboard shortcut to focus search

**Consumed Hooks/Contexts:**
- `usePathname`, `useRouter`: Next.js navigation
- `useAuth`: `logout`
- `useToast`: `toast.success()`, `toast.error()`
- `useDownloadContext`: `pendingDownloads`, `downloadStatus`
- `useIsMobile`, `useIsTablet`: Device detection
- `useQuery`: Fetch scan status
- `useQueryClient`: Invalidate queries

**API Calls:**
- `api.scanLibrary()`: Trigger library scan

**Child Components:**
- `ActivityPanelToggle`: Standalone button component

**Event Handlers:**
- `handleSync`: Trigger library scan with 5s cooldown
- `handleLogout`: Logout user with toast feedback
- `handleSearch`: Navigate to search page

**Next.js APIs:**
- `Link`: Navigation
- `usePathname`: Route detection
- `useRouter`: Programmatic navigation
- `Image`: Logo display

---

#### BottomNavigation
**Path:** `/components/layout/BottomNavigation.tsx` (99 lines)

**Props:** None

**Internal State:** None (derived from props/hooks)

**Effects:** None

**Consumed Hooks/Contexts:**
- `usePathname`: Route matching
- `useIsMobile`, `useIsTablet`: Conditional rendering

**API Calls:** None

**Child Components:** None (renders `Link` directly)

**Event Handlers:** None (navigation via `Link`)

**Next.js APIs:**
- `Link`: Navigation with prefetch

---

#### MobileSidebar
**Path:** `/components/layout/MobileSidebar.tsx` (229 lines)

**Props:**
```typescript
interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}
```

**Internal State:**
- `useState`: `isSyncing`
- `refs`: `isFirstRender`, `syncTimeoutRef`

**Effects:**
- `useEffect`: Close on route change (skip initial mount)
- `useEffect`: Cleanup sync timeout

**Consumed Hooks/Contexts:**
- `usePathname`: Route detection
- `useAuth`: `logout`
- `useToast`: Toast feedback
- `useQueryClient`: Invalidate notifications

**API Calls:**
- `api.scanLibrary()`: Trigger library sync

**Event Handlers:**
- `handleSync`: Sync library, close menu on success
- `handleLogout`: Logout, close menu

---

#### AuthenticatedLayout
**Path:** `/components/layout/AuthenticatedLayout.tsx` (198 lines)

**Props:**
```typescript
interface AuthenticatedLayoutProps {
    children: ReactNode;
}
```

**Internal State:** None (derived)

**Effects:**
- `useEffect`: Listen for activity panel events (toggle/open/close/set-tab)

**Consumed Hooks/Contexts:**
- `useAuth`: `isAuthenticated`, `isLoading`
- `usePathname`: Route detection for public paths
- `useIsMobile`, `useIsTablet`: Device detection
- `useIsTV`: TV detection
- `useActivityPanel`: Panel state management
- `useImportToasts`: Import notification toasts

**API Calls:** None (delegates to child components)

**Child Components:**
- `Sidebar`: Conditional rendering
- `TopBar`: Always rendered
- `TVLayout`: When `isTV`
- `BottomNavigation`: When mobile/tablet
- `ActivityPanel`: Mobile overlay
- `UnifiedPanel`: Desktop side panel
- `UniversalPlayer`: Player wrapper
- `MediaControlsHandler`: Media session controls
- `PlayerModeWrapper`: Player mode state
- `GalaxyBackground`: Background gradient

**Layout Logic:**
- Public pages (`/login`, `/register`, `/onboarding`, `/sync`, `/share/*`): Render children only
- TV: `TVLayout` with full keyboard navigation
- Mobile/Tablet: `TopBar` + `Sidebar` (mobile drawer) + `BottomNavigation` + `ActivityPanel` overlay
- Desktop: `TopBar` + `Sidebar` + `UnifiedPanel` side panel

---

#### TVLayout
**Path:** `/components/layout/TVLayout.tsx` (328 lines)

**Props:**
```typescript
interface TVLayoutProps {
    children: React.ReactNode;
}
```

**Internal State:**
- `useState`: `focusedTabIndex`, `isNavFocused`, `isSyncing`
- `refs`: `navRef`, `currentTimeRef`, `durationRef`

**Effects:**
- `useEffect`: Add/remove `tv-mode` class on mount/unmount
- `useEffect`: Sync `currentTime` to ref
- `useEffect`: Sync `duration` to ref
- `useEffect`: Listen for keyboard events (global)
- `useEffect`: Focus correct nav tab when `isNavFocused` changes
- `useEffect`: Set correct focused tab on pathname change

**Consumed Hooks/Contexts:**
- `usePathname`, `useRouter`: Navigation
- `useAudio`: Full audio control (`currentTrack`, `isPlaying`, `pause`, `resumeWithGesture`, `next`, `previous`, `seek`, etc.)
- `useTVNavigation`: Content navigation hook

**API Calls:**
- `api.scanLibrary()`: Trigger sync
- `api.getCoverArtUrl()`: Generate cover art URLs

**Event Handlers:**
- `handleKeyDown`: Global keyboard handler (DPAD, media keys)
- `handleSync`: Library sync

**TV-Specific Features:**
- DPAD navigation for menu tabs
- Media key support (play/pause, next/previous, fast forward/rewind)
- Focus management with `data-tv-tab` attributes
- Content navigation via `useTVNavigation` hook

---

#### ActivityPanel
**Path:** `/components/layout/ActivityPanel.tsx` (301 lines)

**Props:**
```typescript
interface ActivityPanelProps {
    isOpen: boolean;
    onToggle: () => void;
    activeTab?: ActivityTab; // "notifications" | "active" | "imports" | "history" | "settings"
    onTabChange?: (tab: ActivityTab) => void;
}
```

**Internal State:**
- `useState`: `internalActiveTab` (fallback if prop not provided)

**Effects:**
- `useEffect`: Auto-switch to notifications if settings tab has no content

**Consumed Hooks/Contexts:**
- `useNotifications`: `unreadCount`
- `useActiveDownloads`: `downloads`
- `useIsMobile`, `useIsTablet`: Device detection
- `useActivityPanelSettings`: `settingsContent`, `setSettingsContent`

**Child Components (Tabs):**
- `NotificationsTab`: Notification feed
- `ActiveDownloadsTab`: Download progress
- `ImportsTab`: Import history
- `HistoryTab`: Playback history

**Event Handlers:**
- `handleTabClick`: Switch tabs, clear settings content when leaving settings tab

**Layout:**
- Mobile/Tablet: Full-screen overlay with backdrop
- Desktop: Collapsible side panel (48px collapsed, 450px expanded)

---

#### UnifiedPanel
**Path:** `/components/layout/UnifiedPanel.tsx` (109 lines)

**Props:**
```typescript
interface UnifiedPanelProps {
    isOpen: boolean;
    onToggle: () => void;
}
```

**Internal State:**
- `useState`: `activeTab` (default: "now-playing"), `expandedActivity`

**Consumed Hooks/Contexts:**
- `useNotifications`, `useActiveDownloads`: Activity badges
- `ActivityIconBar`: Activity type selector
- `ActivityHeader`, `ActivityContent`: Expanded activity views
- `TabBar`, `TabContent`: Default tab system

**Child Components:**
- `ActivityIconBar`: Props - `expandedActivity`, `onToggleActivity`
- `ActivityHeader`: Props - `type`, `onClose`
- `TabBar`: Props - `activeTab`, `onTabClick`

**Event Handlers:**
- `handleToggleActivity`: Expand/collapse activity type

**Layout:** Desktop-only collapsible panel (380px expanded, 48px collapsed)

---

### Player Components

#### UniversalPlayer
**Path:** `/components/player/UniversalPlayer.tsx` (58 lines)

**Props:** None

**Internal State:**
- `useRef`: `lastMediaIdRef`, `hasAutoSwitchedRef`

**Effects:**
- `useEffect`: Auto-switch to overlay mode on mobile when media starts playing (fires once per mount)

**Consumed Hooks/Contexts:**
- `useAudio`: `playerMode`, `setPlayerMode`, `currentTrack`, `isPlaying`
- `useIsMobile`, `useIsTablet`: Device detection

**Child Components (Conditional):**
- `OverlayPlayer`: When `playerMode === "overlay"` and has media
- `MiniPlayer`: Mobile/tablet default
- `FullPlayer`: Desktop default

**Logic:**
- Auto-opens overlay on mobile when user initiates playback
- Prevents re-opening on auto-advances (skips, queue)

---

#### MiniPlayer
**Path:** `/components/player/MiniPlayer.tsx` (689 lines)

**Props:** None

**Internal State:**
- `useState`: `isMinimized`, `isDismissed`, `swipeOffset`, `lastMediaId`
- `refs`: `touchStartX`

**Effects:**
- Derived state: Reset dismissed/minimized on media change or resume

**Consumed Hooks/Contexts:**
- `useAudioState`: `currentTrack`, `playbackType`, `isShuffle`, `repeatMode`, `activeOperation`
- `useAudioPlayback`: `isPlaying`, `isBuffering`, `canSeek`, `downloadProgress`, `audioError`, `clearAudioError`
- `useAudioControls`: `pause`, `resumeWithGesture`, `next`, `previous`, `toggleShuffle`, `toggleRepeat`, `seek`, `skipForward`, `skipBackward`, `setPlayerMode`
- `usePlaybackProgress`: `duration`, `progress`
- `useMediaInfo`: `title`, `subtitle`, `coverUrl`, `mediaLink`, `hasMedia`
- `useFeatures`: `vibeEmbeddings`, `loading`
- `useVibeToggle`: `handleVibeToggle`, `isVibeLoading`

**Event Handlers:**
- `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`: Swipe gestures (right=minimize, left=open overlay/dismiss)

**Child Components:**
- `KeyboardShortcutsTooltip`: Desktop hints
- `SeekSlider`: Progress bar with seek
- `SleepTimer`: Sleep timer popover
- `ChevronLeft`: Minimized tab indicator

**Mobile-Specific Features:**
- Swipe RIGHT → minimize to corner tab
- Swipe LEFT + playing → open overlay
- Swipe LEFT + not playing → dismiss completely
- Gradient border with animated background
- Touch gesture feedback with opacity/transform

**Desktop Features:**
- Full-width bottom player
- Volume slider
- Shuffle/repeat/vibe/lyrics/queue toggles
- 30s skip buttons
- Keyboard shortcuts tooltip

---

#### FullPlayer
**Path:** `/components/player/FullPlayer.tsx` (584 lines)

**Props:** None

**Internal State:**
- `useState`: `showPlaylistSelector`
- `useMemo`: `vibeMatchScore`

**Consumed Hooks/Contexts:**
- `useAudioState`: Full state access
- `useAudioPlayback`: Playback status
- `useAudioControls`: All controls
- `usePlaybackProgress`: Time display
- `useMediaInfo`: Track metadata
- `useVibeToggle`: Vibe match
- `useFeatures`: Embeddings availability
- `useToast`: Success/error toasts
- `useAddToPlaylistMutation`: Add to playlist
- `useLyricsToggle`: Lyrics visibility
- `router`, `pathname`: Navigation

**Child Components:**
- `SeekSlider`: Progress bar
- `SleepTimer`: Sleep timer
- `KeyboardShortcutsTooltip`: Hints
- `PlaylistSelector`: Modal (conditional)

**Event Handlers:**
- `handleVolumeChange`: Volume slider

**Features:**
- Full playback controls
- Volume slider with mute toggle
- Vibe match score display (when active)
- Lyrics toggle button
- Queue navigation
- Add to playlist modal
- 30s skip buttons
- Shuffle/repeat controls

---

#### OverlayPlayer
**Path:** `/components/player/OverlayPlayer.tsx` (467 lines)

**Props:** None

**Internal State:**
- `useState`: `swipeOffset`
- `refs`: `touchStartX`

**Consumed Hooks/Contexts:**
- `useAudioState`, `useAudioPlayback`, `useAudioControls`: Full audio control
- `usePlaybackProgress`: Time display
- `useMediaInfo`: Track metadata
- `useVibeToggle`: Vibe mode
- `useLyricsToggle`: Lyrics visibility (mobile only)
- `useIsMobile`, `useIsTablet`: Device detection

**Event Handlers:**
- `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`: Swipe for track skip (left=next, right=prev)

**Child Components:**
- `SeekSlider`: Progress bar
- `SleepTimer`: Sleep timer
- `MobileLyricsView`: Lyrics display (mobile, when active)

**Mobile-Specific Features:**
- Full-screen overlay (z-index 9999)
- Swipe LEFT/RIGHT on artwork to skip tracks
- Swipe feedback with transform/opacity
- Album art / lyrics swap (mobile only)
- Portrait vs landscape layout
- Safe area padding for iOS

---

#### SeekSlider
**Path:** `/components/player/SeekSlider.tsx` (273 lines)

**Props:**
```typescript
interface SeekSliderProps {
    progress: number;           // 0-100 percentage
    duration: number;           // seconds
    onSeek: (time: number) => void;
    canSeek: boolean;
    hasMedia: boolean;
    downloadProgress?: number | null;
    className?: string;
    showHandle?: boolean;       // default: true
    variant?: "default" | "minimal" | "overlay";
}
```

**Internal State:**
- `useState`: `isDragging`, `previewProgress`
- `refs`: `sliderRef`, `touchIdentifierRef`

**Effects:**
- `useEffect`: Add/remove global mouse listeners when dragging

**Event Handlers:**
- `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`: Touch seeking with identifier tracking
- `handleMouseDown`, `handleMouseMove`, `handleMouseUp`: Mouse seeking
- `handleClick`: Click-to-seek

**Features:**
- Drag handle shows on hover/drag (configurable)
- Preview progress while dragging
- Tooltip text based on state (downloading, seeking disabled, etc.)
- Variant-specific styling (minimal for mini player, overlay for full screen)
- Prevents scroll/parent swipe during touch drag

---

#### SleepTimer
**Path:** `/components/player/SleepTimer.tsx` (151 lines)

**Props:**
```typescript
interface SleepTimerProps {
    size?: "sm" | "md";         // default: "md"
}
```

**Internal State:**
- `useState`: `isOpen`, `customMinutes`
- `refs`: `popoverRef`, `buttonRef`

**Effects:**
- `useEffect`: Close popover on outside click or Escape key

**Consumed Hooks/Contexts:**
- `useSleepTimer`: `isActive`, `remainingSeconds`, `displayRemaining`, `setTimer`, `clearTimer`

**Event Handlers:**
- `handlePreset`: Set timer from preset (15, 30, 45, 60, 90, 120 mins)
- `handleCustom`: Set custom timer (1-480 mins)

**Features:**
- Preset buttons for common durations
- Custom input field
- Cancel button when active
- Popover closes on outside click or Escape

---

#### PlayerModeWrapper
**Path:** `/components/player/PlayerModeWrapper.tsx` (11 lines)

**Props:**
```typescript
interface PlayerModeWrapperProps {
    children: ReactNode;
}
```

**Purpose:** Wrapper component that initializes `usePlayerMode` hook (must be client component)

**Consumed Hooks/Contexts:**
- `usePlayerMode`: Manages player mode state (mini/full/overlay)

---

### UI Components

#### Button
**Path:** `/components/ui/Button.tsx` (59 lines)

**Props:**
```typescript
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger" | "ai" | "icon";
    isLoading?: boolean;
}
```

**Pattern:** `forwardRef` + `memo` with `displayName`

**Variants:**
- `primary`: Brand color (#fca200), black text, shadow
- `secondary`: Dark bg (#1a1a1a), white text, border
- `ghost`: Transparent, gray text, hover bg
- `danger`: Red text, red border
- `ai`: Dark bg, brand text, brand hover
- `icon`: Fixed size (32x32), icon button

**Features:**
- Loading state with `GradientSpinner`
- Disabled state handling
- Focus ring accessibility

---

#### CachedImage
**Path:** `/components/ui/CachedImage.tsx` (34 lines)

**Props:**
```typescript
interface CachedImageProps extends Omit<ImageProps, "src"> {
    src: string | null | undefined;
    fill?: boolean;
}
```

**Pattern:** `memo` wrapper around Next.js `Image`

**Features:**
- Null src handling (returns null)
- Lazy loading by default
- Unoptimized (covers served via API, not static)
- Service Worker caching for `/api/library/cover-art/*`

---

#### EmptyState
**Path:** `/components/ui/EmptyState.tsx` (47 lines)

**Props:**
```typescript
interface EmptyStateProps {
    icon: ReactNode;
    title: string;
    description: string;
    children?: ReactNode;
    action?: {
        label: string;
        onClick: () => void;
        variant?: "primary" | "secondary" | "ghost";
    };
}
```

**Pattern:** `memo`

**Usage:** Generic empty state for lists, searches, etc.

---

#### HomeHero
**Path:** `/features/home/components/HomeHero.tsx` (40 lines)

**Props:** None

**Features:**
- Time-based greeting (morning/afternoon/evening)
- System status indicator
- Two-line title with brand color accent
- Subtitle with page description

---

#### AlbumHero
**Path:** `/features/album/components/AlbumHero.tsx` (181 lines)

**Props:**
```typescript
interface AlbumHeroProps {
    album: Album;
    source: AlbumSource;        // "library" | "discover" | "browse"
    coverUrl: string | null;
    colors: ColorPalette | null; // From VibrantJS
    onReload: () => void;
    children?: ReactNode;       // Action bar
}
```

**Consumed Hooks/Contexts:**
- `useAlbumDisplayData`: Title/artist/year with user overrides
- `lazy` + `Suspense`: MetadataEditor (library albums only)

**Features:**
- Dynamic background gradient from album art colors
- Album cover with fallback icon
- Edit badge for user-overridden metadata
- MetadataEditor modal (lazy-loaded, library albums only)
- Duration formatting (hours/minutes)
- Genre tag display

---

## Feature Components Summary

### Album Features
- **TrackList**: Renders album tracks with play/download actions
- **AlbumActionBar**: Play all, shuffle, download, add to playlist buttons
- **SimilarAlbums**: Carousel of similar albums based on genre/year

### Artist Features
- **AvailableAlbums**: Grid of artist's albums
- **SimilarArtists**: Carousel of similar artists
- **ArtistHero**: Artist info with cover art and bio
- **PopularTracks**: Top tracks list
- **Discography**: Album grid by year
- **ArtistBio**: Artist biography (if available)
- **ArtistActionBar**: Follow, download, shuffle actions

### Audiobook Features
- **ChapterList**: Chapter list with progress tracking
- **AudiobookActionBar**: Play, download, add to library actions
- **AudiobookHero**: Book info with cover and author

### Discover Features
- **TrackList**: Discover tracks with preview player
- **HowItWorks**: Feature explanation modal
- **DiscoverActionBar**: Search, filter actions
- **UnavailableAlbums**: Shows albums not yet in library
- **DiscoverHero**: Discover page header

### Home Features
- **SectionHeader**: Reusable section title with "See all" link
- **HomeHero**: Greeting and status
- **PopularArtistsGrid**: Artist cards grid
- **FeaturedPlaylistsGrid**: Playlist cards
- **PodcastsGrid**: Podcast cards
- **AudiobooksGrid**: Audiobook cards
- **ContinueListening**: Recently played items
- **LibraryRadioStations**: Genre-based radio stations
- **MixesGrid**: AI-generated mix cards
- **ArtistsGrid**: Generic artist grid component
- **LibraryRadioStations**: Radio station generator

### Library Features
- **TracksList**: Library track list with delete/move actions
- **LibraryHeader**: Library stats and filters
- **LibraryToolbar**: View toggle (grid/list), sort dropdown
- **LibraryTabs**: Tab switcher (tracks/albums/artists)
- **AlbumsGrid**: Album grid with cover art
- **ArtistsGrid**: Artist grid with portraits

### Podcast Features
- **PodcastActionBar**: Subscribe, download actions
- **SimilarPodcasts**: Recommendations
- **PodcastHero**: Podcast info with cover
- **PreviewEpisodes**: Latest episodes (not in library)
- **ContinueListening**: In-progress episodes
- **EpisodeList**: Full episode list with progress

### Search Features
- **TopResult**: Featured result (album/artist/podcast)
- **UnifiedSongsList**: Combined search results
- **LibraryTracksList**: Library-only track results
- **LibraryAlbumsGrid**: Library album results
- **LibraryPodcastsGrid**: Library podcast results
- **LibraryAudiobooksGrid**: Library audiobook results
- **SoulseekBrowser**: External Soulseek search
- **SearchFilters**: Filter dropdown (type, source, quality)
- **AliasResolutionBanner**: Shows resolved artist aliases
- **SimilarArtistsGrid**: Artist recommendations
- **EmptyState**: No results message
- **TVSearchInput**: Search bar with TV navigation support

### Settings Features
**Sections:**
- **StoragePathsSection**: Library path configuration
- **SoulseekSection**: Soulseek client settings
- **SubsonicSection**: Subsonic API configuration
- **AccountSection**: User profile and password
- **CacheSection**: Cache size and cleanup
- **UserManagementSection**: Admin user management
- **CorruptTracksSection**: Track repair tools
- **PlaybackSection**: Audio playback settings
- **DownloadPreferencesSection**: Download quality/format
- **LidarrSection**: Lidarr integration
- **AIServicesSection**: CLAP/embedding service config
- **AudiobookshelfSection**: Audiobookshelf integration

**UI Components:**
- **SettingsLayout**: Main settings container with sidebar
- **SettingsSidebar**: Navigation sidebar
- **SettingsSection**: Section wrapper with title/description
- **SettingsRow**: Key-value row for settings
- **SettingsToggle**: Boolean toggle switch
- **SettingsSelect**: Dropdown selector
- **SettingsInput**: Text/number input

### Vibe Features
- **VibeMap**: Main 3D visualization component
- **VibeToolbar**: Control toolbar
- **VibePanelSheet**: Side panel with tabs
- **VibeSongPath**: Song path visualization
- **ActivityIconBar**: Activity type selector
- **GravityGridScene**: Three.js gravity simulation scene
- **LyricsTab**: Lyrics display in panel
- **NowPlayingTab**: Current track info
- **QueueTab**: Play queue in panel
- **panel-shared.tsx**: Shared panel components

---

## Third-Party Dependencies

### React Libraries
- **next**: Next.js 15 (App Router, Server Components)
- **react**: React 19 (hooks, memo, forwardRef, Suspense, lazy)
- **@tanstack/react-query**: Data fetching and caching
- **lucide-react**: Icon library

### UI/Styling
- **tailwindcss**: Utility-first CSS
- **clsx**: Conditional className merging
- **tailwind-merge**: Smart className merging

### Audio/Media
- **three**: 3D visualization (Vibe mode)
- **@react-three/fiber**: Three.js React renderer
- **@react-three/drei**: Three.js helpers

### Utilities
- **vibrant-js**: Image color extraction
- **howler**: Audio playback (via custom wrapper)

---

## Next.js-Specific APIs Used

### Routing
- `usePathname`: Active route detection
- `useRouter`: Programmatic navigation
- `Link`: Client-side navigation with prefetch
- File-based routing in `/app` directory

### Image Optimization
- `next/image`: Optimized image loading with lazy loading
- `unoptimized` prop used for API-served images

### Server Components
- Default: All components are Server Components unless marked `"use client"`
- Client components used for:
  - Hooks (`useState`, `useEffect`, etc.)
  - Browser APIs
  - Event handlers
  - Context providers/consumers

### API Routes
- `/app/api/events/route.ts`: SSE endpoint
- `/app/api/events/ticket/route.ts`: SSE ticket generation

---

## Component Patterns

### 1. forwardRef + memo Wrapper
All UI components use this pattern for performance and debugging:
```typescript
const Component = memo(forwardRef<HTMLDivElement, ComponentProps>(
    ({ className, ...props }, ref) => {
        return <div ref={ref} className={cn(baseStyles, className)} {...props} />;
    }
));
Component.displayName = "ComponentName";
```

### 2. cn() Utility
Class name merging using `clsx` + `tailwind-merge`:
```typescript
className={cn("base-styles", conditional && "conditional-styles", props.className)}
```

### 3. Split Context Pattern
Audio state split into 4 contexts to avoid re-renders:
- `AudioStateProvider`: Core state (current track, queue, shuffle, repeat)
- `AudioPlaybackProvider`: Playback status (playing, buffering, error)
- `AudioControlsProvider`: Control functions (play, pause, seek, skip)
- `AudioController`: Low-level audio element management

### 4. Query Key Factory
Type-safe query keys in `/hooks/useQueries.ts`:
```typescript
export const queryKeys = {
    albums: (artistId?: string) => ["albums", artistId] as const,
    tracks: (albumId?: string) => ["tracks", albumId] as const,
};
```

### 5. Lazy Loading
Modal components lazy-loaded to reduce initial bundle:
```typescript
const MetadataEditor = lazy(() => import("./MetadataEditor"));
// Usage with Suspense
<Suspense fallback={null}>
    <MetadataEditor ... />
</Suspense>
```

### 6. Custom Event Bus
Cross-component communication via custom events:
```typescript
window.dispatchEvent(new CustomEvent("toggle-activity-panel"));
window.addEventListener("toggle-activity-panel", handler);
```

---

## Migration Considerations

### Next.js → SvelteKit Mapping

| Next.js | SvelteKit | Notes |
|---------|-----------|-------|
| `usePathname` | `$page.url.pathname` | Reactive in Svelte |
| `useRouter` | `goto()` from `$app/navigation` | Client-side navigation |
| `Link` | `a` tag with `data-sveltekit-preload-data` | Native SvelteKit prefetch |
| `next/image` | `svelte/image` or custom | Need caching strategy |
| Server Components | SSR + `{#if browser}` | Client-only code in `{@render}` or components |
| API Routes | Endpoint routes (`+server.ts`) | Similar pattern |
| `useEffect` | `onMount` | Lifecycle hook |
| `useState` | `let` with reactivity | Native Svelte reactivity |
| Context | Svelte `setContext`/`getContext` | Built-in |
| React Query | Svelte stores + custom hooks | Need to reimplement caching |

### Component Conversion Priority

**High Priority (Core UI):**
1. Button, EmptyState, CachedImage (UI primitives)
2. Sidebar, TopBar, BottomNavigation (layout)
3. MiniPlayer, FullPlayer, OverlayPlayer (player)
4. SeekSlider, SleepTimer (player controls)

**Medium Priority (Feature Pages):**
5. HomeHero, AlbumHero, ArtistHero (page headers)
6. Grid components (AlbumsGrid, ArtistsGrid, etc.)
7. List components (TrackList, EpisodeList, etc.)

**Low Priority (Advanced Features):**
8. VibeMap (Three.js integration - complex)
9. Settings sections (form-heavy)
10. Search features (Soulseek browser)

### State Management Migration

| React Pattern | Svelte Equivalent |
|---------------|-------------------|
| `useState` | `let` variable |
| `useReducer` | `writable` store |
| `useContext` | `setContext`/`getContext` |
| React Query | Custom stores + `derived` |
| `useMemo` | `derived` store or computed property |
| `useCallback` | Function in store or memoized with `derived` |

### Audio System Migration

The split audio context pattern should be preserved:
- Svelte stores for each concern (`audioState.svelte`, `audioPlayback.svelte`, etc.)
- Use `$state` runes in Svelte 5 for fine-grained reactivity
- Keep `AudioController` as a singleton service

---

## Summary Statistics

- **Total Components:** ~142 files
- **Layout Components:** 8 files
- **Player Components:** 9 files
- **UI Components:** 18 files
- **Feature Components:** ~90+ files across 10 features
- **Activity Tabs:** 5 files
- **Settings Sections:** 11 files
- **Settings UI:** 6 files
- **Vibe Components:** ~10 files (including scenes/tabs)

**Lines of Code (approximate):**
- Layout: ~2,000 lines
- Player: ~1,600 lines
- UI: ~500 lines
- Features: ~8,000+ lines
- **Total:** ~12,000+ lines of component code

**Most Complex Components:**
1. `MiniPlayer` (689 lines) - Gesture handling, multiple modes
2. `Sidebar` (512 lines) - Playlist management, responsive
3. `FullPlayer` (584 lines) - Full playback controls
4. `OverlayPlayer` (467 lines) - Full-screen mobile player
5. `TopBar` (399 lines) - Search, sync, notifications
6. `TVLayout` (328 lines) - Keyboard navigation
7. `ActivityPanel` (301 lines) - Multi-tab panel
8. `SeekSlider` (273 lines) - Touch/mouse seeking

**Components with Direct API Calls:**
- Sidebar, TopBar, MobileSidebar (sync, playlists)
- All feature action bar components
- Settings sections (save/load settings)

**Components Using Contexts:**
- All player components (audio contexts)
- Layout components (auth, toast, activity panel)
- Feature components (audio, features, query)

---

*End of Component Catalog*
