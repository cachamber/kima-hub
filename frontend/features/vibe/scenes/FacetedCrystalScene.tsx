"use client";

import { useState, useCallback, useMemo, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import {
    OrthographicCamera,
    PerspectiveCamera,
    OrbitControls,
    PointerLockControls,
    Instances,
    Instance,
    Html,
} from "@react-three/drei";
import * as THREE from "three";
import type { MapTrack } from "../types";
import { getTrackColor, getTrackHighlightColor, computeEdges } from "../universeUtils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VibeSceneProps {
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
// FlyMovement -- WASD/Space/Shift camera movement in 3D mode
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
// CrystalGrid -- surrounding box with tri-planar grid shader
// ---------------------------------------------------------------------------

function CrystalGrid({ worldCenter }: { worldCenter: readonly [number, number, number] }) {
    const material = useMemo(() => {
        const halfSize = WORLD_SCALE * 2.0;
        return new THREE.ShaderMaterial({
            uniforms: {
                uCenter: { value: new THREE.Vector3(worldCenter[0], worldCenter[1], 0) },
                uGridSpacing: { value: WORLD_SCALE * 0.06 },
                uHalfSize: { value: halfSize },
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
                    vec2 cXY = vWorldPos.xy / uGridSpacing;
                    vec2 gXY = abs(fract(cXY - 0.5) - 0.5) / fwidth(cXY);
                    float lXY = min(gXY.x, gXY.y);

                    vec2 cXZ = vWorldPos.xz / uGridSpacing;
                    vec2 gXZ = abs(fract(cXZ - 0.5) - 0.5) / fwidth(cXZ);
                    float lXZ = min(gXZ.x, gXZ.y);

                    vec2 cYZ = vWorldPos.yz / uGridSpacing;
                    vec2 gYZ = abs(fract(cYZ - 0.5) - 0.5) / fwidth(cYZ);
                    float lYZ = min(gYZ.x, gYZ.y);

                    float line = min(lXY, min(lXZ, lYZ));
                    float alpha = 1.0 - min(line, 1.0);

                    float t = smoothstep(-uHalfSize, uHalfSize, vWorldPos.y - uCenter.y);
                    vec3 color = mix(uColorA, uColorB, t);

                    float dist = length(vWorldPos - uCenter) / (uHalfSize * 1.2);
                    alpha *= smoothstep(1.0, 0.3, dist);
                    alpha *= 0.05;

                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.BackSide,
        });
    }, [worldCenter]);

    const boxSize = WORLD_SCALE * 4;

    return (
        <mesh
            position={[worldCenter[0], worldCenter[1], 0]}
            material={material}
        >
            <boxGeometry args={[boxSize, boxSize, boxSize]} />
        </mesh>
    );
}

// ---------------------------------------------------------------------------
// CrystalTooltip -- hover tooltip for crystals
// ---------------------------------------------------------------------------

function CrystalTooltip({ track, position }: { track: MapTrack; position: THREE.Vector3 }) {
    return (
        <Html
            position={position}
            center
            style={{ pointerEvents: "none" }}
            zIndexRange={[50, 0]}
        >
            <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 text-center whitespace-nowrap">
                <div className="text-white text-xs font-medium truncate max-w-48">
                    {track.title}
                </div>
                <div className="text-white/50 text-[10px] truncate max-w-48">
                    {track.artist}
                </div>
            </div>
        </Html>
    );
}

// ---------------------------------------------------------------------------
// ConnectionLines -- thin edges between nearby crystals
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
            opacity: 0.2,
            blending: THREE.NormalBlending,
        });

        return { lineGeo: geo, lineMat: mat };
    }, [tracks, positions]);

    return <lineSegments geometry={lineGeo} material={lineMat} />;
}

// ---------------------------------------------------------------------------
// CrystalCloud -- instanced icosahedron crystals
// ---------------------------------------------------------------------------

function CrystalCloud({
    tracks,
    highlightedIds,
    selectedTrackId,
    positions,
    onTrackClick,
    onTrackHover,
}: {
    tracks: MapTrack[];
    highlightedIds: Set<string>;
    selectedTrackId: string | null;
    positions: Float32Array;
    onTrackClick: (trackId: string) => void;
    onTrackHover: (track: MapTrack | null, point: THREE.Vector3 | null) => void;
}) {
    const hasHighlights = highlightedIds.size > 0;

    const crystalData = useMemo(() => {
        return tracks.map((track, i) => {
            const isSelected = track.id === selectedTrackId;
            const isHighlighted = !hasHighlights || highlightedIds.has(track.id);
            const isDimmed = hasHighlights && !isHighlighted && !isSelected;
            const energy = track.energy ?? 0.5;
            const baseScale = 2 + energy * 5;

            let color: THREE.Color;
            let scale: number;

            if (isSelected) {
                color = new THREE.Color(1, 1, 1);
                scale = baseScale * 1.5;
            } else if (isDimmed) {
                const c = getTrackColor(track);
                color = new THREE.Color(c.r * 0.3, c.g * 0.3, c.b * 0.3);
                scale = baseScale * 0.5;
            } else {
                color = getTrackHighlightColor(track);
                scale = baseScale;
            }

            return {
                position: [
                    positions[i * 3],
                    positions[i * 3 + 1],
                    positions[i * 3 + 2],
                ] as [number, number, number],
                scale,
                color,
                trackIndex: i,
            };
        });
    }, [tracks, highlightedIds, selectedTrackId, hasHighlights, positions]);

    const handleClick = useCallback(
        (e: ThreeEvent<MouseEvent>, trackIndex: number) => {
            e.stopPropagation();
            if (trackIndex < tracks.length) {
                onTrackClick(tracks[trackIndex].id);
            }
        },
        [tracks, onTrackClick]
    );

    const handlePointerOver = useCallback(
        (e: ThreeEvent<PointerEvent>, trackIndex: number) => {
            e.stopPropagation();
            if (trackIndex < tracks.length) {
                const track = tracks[trackIndex];
                const point = new THREE.Vector3(
                    positions[trackIndex * 3],
                    positions[trackIndex * 3 + 1],
                    positions[trackIndex * 3 + 2]
                );
                onTrackHover(track, point);
            }
        },
        [tracks, positions, onTrackHover]
    );

    const handlePointerOut = useCallback(() => {
        onTrackHover(null, null);
    }, [onTrackHover]);

    if (tracks.length === 0) return null;

    return (
        <Instances limit={Math.max(tracks.length, 1)}>
            <icosahedronGeometry args={[1, 0]} />
            <meshPhongMaterial
                flatShading
                specular={new THREE.Color(1, 1, 1)}
                shininess={80}
            />
            {crystalData.map((d) => (
                <Instance
                    key={tracks[d.trackIndex].id}
                    position={d.position}
                    scale={d.scale}
                    color={d.color}
                    onClick={(e: ThreeEvent<MouseEvent>) => handleClick(e, d.trackIndex)}
                    onPointerOver={(e: ThreeEvent<PointerEvent>) => handlePointerOver(e, d.trackIndex)}
                    onPointerOut={handlePointerOut}
                />
            ))}
        </Instances>
    );
}

// ---------------------------------------------------------------------------
// SceneContent -- assembles camera, lights, grid, crystals, lines
// ---------------------------------------------------------------------------

function SceneContent({
    tracks,
    highlightedIds,
    selectedTrackId,
    is3D,
    isMobile: _isMobile,
    isLocked,
    onLockChange,
    onTrackClick,
    onBackgroundClick: _onBackgroundClick,
}: VibeSceneProps & {
    is3D: boolean;
    isMobile: boolean;
    isLocked: boolean;
    onLockChange: (locked: boolean) => void;
}) {
    const [hoveredTrack, setHoveredTrack] = useState<MapTrack | null>(null);
    const [hoverPosition, setHoverPosition] = useState<THREE.Vector3 | null>(null);

    const handleTrackHover = useCallback((track: MapTrack | null, point: THREE.Vector3 | null) => {
        setHoveredTrack(track);
        setHoverPosition(point);
    }, []);

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

    const worldCenter = useMemo(
        () => [center[0] * WORLD_SCALE, center[1] * WORLD_SCALE, 0] as const,
        [center]
    );

    const positions = useMemo(() => {
        const pos = new Float32Array(tracks.length * 3);
        for (let i = 0; i < tracks.length; i++) {
            pos[i * 3] = tracks[i].x * WORLD_SCALE;
            pos[i * 3 + 1] = tracks[i].y * WORLD_SCALE;
            pos[i * 3 + 2] = hashToFloat(tracks[i].id) * WORLD_SCALE * 0.2;
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
                        position={[worldCenter[0], worldCenter[1], WORLD_SCALE * span * 0.6]}
                        fov={60}
                        near={0.1}
                        far={WORLD_SCALE * 5}
                    />
                    <PointerLockControls onLock={handleLock} onUnlock={handleUnlock} />
                    <FlyMovement speed={WORLD_SCALE * 0.08} />
                </>
            ) : (
                <>
                    <OrthographicCamera
                        makeDefault
                        position={[worldCenter[0], worldCenter[1], 100]}
                        zoom={orthoZoom}
                        near={0.1}
                        far={WORLD_SCALE * 5}
                    />
                    <OrbitControls
                        enableRotate={false}
                        enableDamping
                        dampingFactor={0.12}
                        target={[worldCenter[0], worldCenter[1], 0]}
                    />
                </>
            )}

            {/* Dramatic two-tone lighting */}
            <ambientLight intensity={0.1} />
            <directionalLight
                position={[0, -1, 0.3]}
                color="#a855f7"
                intensity={0.7}
            />
            <directionalLight
                position={[0, 1, -0.3]}
                color="#fca200"
                intensity={0.6}
            />
            <pointLight
                position={[worldCenter[0], worldCenter[1], WORLD_SCALE * span * 0.6]}
                color="#ffffff"
                intensity={0.15}
            />

            {/* Grid enclosure */}
            <CrystalGrid worldCenter={worldCenter} />

            {/* Connection lines */}
            <ConnectionLines tracks={tracks} positions={positions} />

            {/* Instanced crystal tracks */}
            <CrystalCloud
                tracks={tracks}
                highlightedIds={highlightedIds}
                selectedTrackId={selectedTrackId}
                positions={positions}
                onTrackClick={onTrackClick}
                onTrackHover={handleTrackHover}
            />

            {hoveredTrack && hoverPosition && !isLocked && (
                <CrystalTooltip track={hoveredTrack} position={hoverPosition} />
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// FacetedCrystalScene -- exported top-level component
// ---------------------------------------------------------------------------

export function FacetedCrystalScene({
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
                        isMobile={_isMobile}
                        isLocked={isLocked}
                        onLockChange={setIsLocked}
                        onTrackClick={onTrackClick}
                        onBackgroundClick={onBackgroundClick}
                    />
                </Suspense>
            </Canvas>

            {/* Scene label */}
            <div className="absolute top-3 left-3 z-10 text-white/20 text-[10px] tracking-widest uppercase font-medium">
                D: Faceted Crystal
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
                        <p className="text-white/30 text-xs">WASD to move -- Mouse to look -- R for boost -- ESC to exit</p>
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
