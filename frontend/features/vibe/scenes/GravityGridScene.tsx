"use client";

import { useState, useCallback, useMemo, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
    OrthographicCamera,
    PerspectiveCamera,
    OrbitControls,
    PointerLockControls,
    Instances,
    Instance,
} from "@react-three/drei";
import * as THREE from "three";
import type { MapTrack } from "../types";
import { getTrackColor, getTrackHighlightColor, computeEdges } from "../universeUtils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VibeSceneProps {
    tracks: MapTrack[];
    highlightedIds: Set<string>;
    selectedTrackId: string | null;
    onTrackClick: (trackId: string) => void;
    onBackgroundClick: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORLD_SCALE = 400;
const GRID_SPACING = 24;
const GRID_SIZE = WORLD_SCALE * 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashToFloat(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return ((h & 0x7fffffff) / 0x7fffffff) * 2 - 1;
}

function useIsMobile(): boolean {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
}

// ---------------------------------------------------------------------------
// FlyMovement -- first-person flight in 3D mode
// ---------------------------------------------------------------------------

function FlyMovement({ speed = 30 }: { speed?: number }) {
    const { camera } = useThree();
    const keys = useRef<Set<string>>(new Set());

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keys.current.add(e.code);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keys.current.delete(e.code);
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    useFrame((_, delta) => {
        const velocity = new THREE.Vector3();
        const boost = keys.current.has("KeyR") ? 3 : 1;
        const actualSpeed = speed * boost;

        if (keys.current.has("KeyW") || keys.current.has("ArrowUp")) velocity.z -= 1;
        if (keys.current.has("KeyS") || keys.current.has("ArrowDown")) velocity.z += 1;
        if (keys.current.has("KeyA") || keys.current.has("ArrowLeft")) velocity.x -= 1;
        if (keys.current.has("KeyD") || keys.current.has("ArrowRight")) velocity.x += 1;
        if (keys.current.has("Space")) velocity.y += 1;
        if (keys.current.has("ShiftLeft") || keys.current.has("ShiftRight")) velocity.y -= 1;

        if (velocity.length() > 0) {
            velocity.normalize().multiplyScalar(actualSpeed * delta);
            velocity.applyQuaternion(camera.quaternion);
            camera.position.add(velocity);
        }
    });

    return null;
}

// ---------------------------------------------------------------------------
// Floor grid -- procedural shader on XZ plane
// ---------------------------------------------------------------------------

function FloorGrid({ worldCenter }: { worldCenter: readonly [number, number, number] }) {
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uCenter: { value: new THREE.Vector3(worldCenter[0], 0, worldCenter[2]) },
                uGridSpacing: { value: GRID_SPACING },
                uHalfSize: { value: GRID_SIZE * 0.5 },
                uColorA: { value: new THREE.Color(168 / 255, 85 / 255, 247 / 255) },
                uColorB: { value: new THREE.Color(252 / 255, 162 / 255, 0) },
            },
            vertexShader: `
                varying vec3 vWorldPos;
                void main() {
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vWorldPos = worldPos.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uCenter;
                uniform float uGridSpacing;
                uniform float uHalfSize;
                uniform vec3 uColorA;
                uniform vec3 uColorB;
                varying vec3 vWorldPos;
                void main() {
                    vec2 coord = vWorldPos.xz / uGridSpacing;
                    vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
                    float line = min(grid.x, grid.y);
                    float alpha = 1.0 - min(line, 1.0);

                    float dist = length(vWorldPos.xz - uCenter.xz) / uHalfSize;
                    float t = clamp(dist, 0.0, 1.0);
                    vec3 color = mix(uColorA, uColorB, t);

                    // Fade out near edges
                    alpha *= smoothstep(1.0, 0.6, dist);
                    alpha *= 0.14;

                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending,
        });
    }, [worldCenter]);

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[worldCenter[0], 0, worldCenter[2]]}
            material={material}
        >
            <planeGeometry args={[GRID_SIZE, GRID_SIZE, 1, 1]} />
        </mesh>
    );
}

// ---------------------------------------------------------------------------
// Connection lines between nearby tracks
// ---------------------------------------------------------------------------

function ConnectionLines({ tracks, positions }: { tracks: MapTrack[]; positions: Float32Array }) {
    const { lineGeo, lineMat } = useMemo(() => {
        const edges = computeEdges(tracks, 3);
        const linePositions = new Float32Array(edges.length * 6);
        const lineColors = new Float32Array(edges.length * 6);

        for (let e = 0; e < edges.length; e++) {
            const [i, j] = edges[e];
            linePositions[e * 6] = positions[i * 3];
            linePositions[e * 6 + 1] = positions[i * 3 + 1];
            linePositions[e * 6 + 2] = positions[i * 3 + 2];
            linePositions[e * 6 + 3] = positions[j * 3];
            linePositions[e * 6 + 4] = positions[j * 3 + 1];
            linePositions[e * 6 + 5] = positions[j * 3 + 2];

            const ci = getTrackColor(tracks[i]);
            const cj = getTrackColor(tracks[j]);
            const lr = (ci.r + cj.r) * 0.5;
            const lg = (ci.g + cj.g) * 0.5;
            const lb = (ci.b + cj.b) * 0.5;
            lineColors[e * 6] = lr;
            lineColors[e * 6 + 1] = lg;
            lineColors[e * 6 + 2] = lb;
            lineColors[e * 6 + 3] = lr;
            lineColors[e * 6 + 4] = lg;
            lineColors[e * 6 + 5] = lb;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));

        const mat = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.3,
            blending: THREE.NormalBlending,
        });

        return { lineGeo: geo, lineMat: mat };
    }, [tracks, positions]);

    return <lineSegments geometry={lineGeo} material={lineMat} />;
}

// ---------------------------------------------------------------------------
// Track spheres -- instanced icosahedrons
// ---------------------------------------------------------------------------

function TrackSpheres({
    tracks,
    highlightedIds,
    selectedTrackId,
    positions,
    onTrackClick,
}: {
    tracks: MapTrack[];
    highlightedIds: Set<string>;
    selectedTrackId: string | null;
    positions: Float32Array;
    onTrackClick: (trackId: string) => void;
}) {
    const hasHighlights = highlightedIds.size > 0;

    const trackData = useMemo(() => {
        return tracks.map((track, i) => {
            const isSelected = track.id === selectedTrackId;
            const isHighlighted = !hasHighlights || highlightedIds.has(track.id);
            const isDimmed = hasHighlights && !isHighlighted && !isSelected;

            const energy = track.energy ?? 0.5;
            let scale = 1.5 + energy * 5;
            let color: THREE.Color;

            if (isSelected) {
                color = new THREE.Color(1, 1, 1);
                scale *= 1.5;
            } else if (isDimmed) {
                const base = getTrackColor(track);
                color = new THREE.Color(base.r * 0.3, base.g * 0.3, base.b * 0.3);
                scale *= 0.6;
            } else {
                color = getTrackHighlightColor(track);
            }

            return {
                position: [
                    positions[i * 3],
                    positions[i * 3 + 1],
                    positions[i * 3 + 2],
                ] as [number, number, number],
                scale,
                color,
                isDimmed,
                trackId: track.id,
            };
        });
    }, [tracks, highlightedIds, selectedTrackId, hasHighlights, positions]);

    const handleClick = useCallback(
        (trackId: string) => (e: THREE.Event) => {
            const ev = e as unknown as { stopPropagation?: () => void };
            if (ev.stopPropagation) ev.stopPropagation();
            onTrackClick(trackId);
        },
        [onTrackClick],
    );

    return (
        <Instances limit={Math.max(tracks.length, 1)}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial
                metalness={0.8}
                roughness={0.3}
                transparent
                blending={THREE.NormalBlending}
            />
            {trackData.map((td) => (
                <Instance
                    key={td.trackId}
                    position={td.position}
                    scale={td.scale}
                    color={td.color}
                    onClick={handleClick(td.trackId)}
                />
            ))}
        </Instances>
    );
}

// ---------------------------------------------------------------------------
// Scene content (cameras, lights, grid, tracks)
// ---------------------------------------------------------------------------

function SceneContent({
    tracks,
    highlightedIds,
    selectedTrackId,
    is3D,
    isLocked: _isLocked,
    onLockChange,
    onTrackClick,
}: VibeSceneProps & {
    is3D: boolean;
    isLocked: boolean;
    onLockChange: (locked: boolean) => void;
}) {
    const { center, span } = useMemo(() => {
        if (tracks.length === 0) {
            return { center: [0.5, 0.5] as const, span: 1 };
        }
        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        for (const t of tracks) {
            if (t.x < minX) minX = t.x;
            if (t.x > maxX) maxX = t.x;
            if (t.y < minY) minY = t.y;
            if (t.y > maxY) maxY = t.y;
        }
        return {
            center: [(minX + maxX) / 2, (minY + maxY) / 2] as const,
            span: Math.max(maxX - minX, maxY - minY) || 1,
        };
    }, [tracks]);

    const worldCenterX = center[0] * WORLD_SCALE;
    const worldCenterZ = center[1] * WORLD_SCALE;
    const worldCenter = useMemo(
        () => [worldCenterX, 0, worldCenterZ] as const,
        [worldCenterX, worldCenterZ],
    );

    // Compute world positions: UMAP x -> X, UMAP y -> Z, height above grid -> Y
    const positions = useMemo(() => {
        const pos = new Float32Array(tracks.length * 3);
        for (let i = 0; i < tracks.length; i++) {
            pos[i * 3] = tracks[i].x * WORLD_SCALE;
            pos[i * 3 + 1] = 2 + Math.abs(hashToFloat(tracks[i].id)) * WORLD_SCALE * 0.1;
            pos[i * 3 + 2] = tracks[i].y * WORLD_SCALE;
        }
        return pos;
    }, [tracks]);

    const handleLock = useCallback(() => onLockChange(true), [onLockChange]);
    const handleUnlock = useCallback(() => onLockChange(false), [onLockChange]);

    const orthoZoom = useMemo(() => {
        if (typeof window === "undefined") return 2;
        const viewportMin = Math.min(window.innerWidth, window.innerHeight);
        const worldSpan = span * WORLD_SCALE;
        return viewportMin / (worldSpan * 1.3);
    }, [span]);

    return (
        <>
            {is3D ? (
                <>
                    <PerspectiveCamera
                        makeDefault
                        position={[
                            worldCenterX,
                            WORLD_SCALE * 0.5,
                            worldCenterZ + WORLD_SCALE * 0.4,
                        ]}
                        fov={60}
                        near={0.1}
                        far={WORLD_SCALE * 10}
                    />
                    <PointerLockControls onLock={handleLock} onUnlock={handleUnlock} />
                    <FlyMovement speed={WORLD_SCALE * 0.08} />
                </>
            ) : (
                <>
                    <OrthographicCamera
                        makeDefault
                        position={[worldCenterX, WORLD_SCALE * 0.8, worldCenterZ]}
                        zoom={orthoZoom}
                        near={0.1}
                        far={WORLD_SCALE * 10}
                        rotation={[-Math.PI / 2, 0, 0]}
                    />
                    <OrbitControls
                        enableRotate={false}
                        enableDamping
                        dampingFactor={0.12}
                        target={[worldCenterX, 0, worldCenterZ]}
                    />
                </>
            )}

            {/* Lighting */}
            <ambientLight intensity={0.2} />
            <directionalLight position={[1, 2, 1]} intensity={0.8} color="#ffffff" />
            <pointLight
                position={[-WORLD_SCALE, -WORLD_SCALE * 0.5, 0]}
                color="#a855f7"
                intensity={0.4}
            />
            <pointLight
                position={[WORLD_SCALE, WORLD_SCALE * 0.5, 0]}
                color="#fca200"
                intensity={0.3}
            />

            {/* Floor grid */}
            <FloorGrid worldCenter={worldCenter} />

            {/* Connection lines */}
            {tracks.length > 1 && (
                <ConnectionLines tracks={tracks} positions={positions} />
            )}

            {/* Instanced track spheres */}
            {tracks.length > 0 && (
                <TrackSpheres
                    tracks={tracks}
                    highlightedIds={highlightedIds}
                    selectedTrackId={selectedTrackId}
                    positions={positions}
                    onTrackClick={onTrackClick}
                />
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function GravityGridScene({
    tracks,
    highlightedIds,
    selectedTrackId,
    onTrackClick,
    onBackgroundClick,
}: VibeSceneProps) {
    const [is3D, setIs3D] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const _isMobile = useIsMobile();

    return (
        <div className="w-full h-full relative">
            <Canvas
                dpr={[1, 1.5]}
                gl={{
                    antialias: true,
                    toneMapping: THREE.NoToneMapping,
                    outputColorSpace: THREE.SRGBColorSpace,
                    powerPreference: "high-performance",
                }}
                style={{ background: "#050508" }}
                onPointerMissed={onBackgroundClick}
            >
                <Suspense fallback={null}>
                    <SceneContent
                        tracks={tracks}
                        highlightedIds={highlightedIds}
                        selectedTrackId={selectedTrackId}
                        is3D={is3D}
                        isLocked={isLocked}
                        onLockChange={setIsLocked}
                        onTrackClick={onTrackClick}
                        onBackgroundClick={onBackgroundClick}
                    />
                </Suspense>
            </Canvas>

            {/* Scene label */}
            <div className="absolute top-3 left-3 z-10 text-white/20 text-[10px] tracking-wide font-medium">
                A: Gravity Grid
            </div>

            {/* 2D / 3D toggle */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                    onClick={() => setIs3D(!is3D)}
                    className="px-3 py-1.5 rounded-lg backdrop-blur-md border text-xs font-medium transition-colors bg-white/10 border-white/10 text-white/70 hover:text-white hover:bg-white/15"
                >
                    {is3D ? "2D" : "3D"}
                </button>
            </div>

            {/* 3D mode instructions */}
            {is3D && !isLocked && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className="text-center pointer-events-auto">
                        <p className="text-white/60 text-sm mb-1">Click anywhere to explore</p>
                        <p className="text-white/30 text-xs">
                            WASD to move -- Mouse to look -- R for boost -- ESC to exit
                        </p>
                    </div>
                </div>
            )}

            {/* Track count */}
            <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-10 text-white/15 text-[10px] tracking-widest uppercase font-medium">
                {tracks.length} tracks
            </div>
        </div>
    );
}
