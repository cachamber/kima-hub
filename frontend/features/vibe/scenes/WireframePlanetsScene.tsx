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
} from "@react-three/drei";
import * as THREE from "three";
import type { MapTrack } from "../types";
import {
    getTrackHighlightColor,
    computeEdges,
} from "../universeUtils";
import { TrackTooltip } from "../TrackTooltip";

const WORLD_SCALE = 400;

export interface VibeSceneProps {
    tracks: MapTrack[];
    highlightedIds: Set<string>;
    selectedTrackId: string | null;
    onTrackClick: (trackId: string) => void;
    onBackgroundClick: () => void;
}

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

function TronGridBox({ worldCenter }: { worldCenter: readonly [number, number, number] }) {
    const material = useMemo(() => {
        const halfSize = WORLD_SCALE * 2.0;
        return new THREE.ShaderMaterial({
            uniforms: {
                uCenter: { value: new THREE.Vector3(worldCenter[0], worldCenter[1], worldCenter[2]) },
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
                    alpha *= 0.06;

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
            position={[worldCenter[0], worldCenter[1], worldCenter[2]]}
            material={material}
        >
            <boxGeometry args={[boxSize, boxSize, boxSize]} />
        </mesh>
    );
}

interface TrackRenderData {
    track: MapTrack;
    position: [number, number, number];
    baseScale: number;
    finalScale: number;
    wireColor: THREE.Color;
}

function ConnectionLines({
    tracks,
    trackPositions,
}: {
    tracks: MapTrack[];
    trackPositions: Float32Array;
}) {
    const { lineGeo, lineMat } = useMemo(() => {
        if (tracks.length === 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
            geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(0), 3));
            const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4 });
            return { lineGeo: geo, lineMat: mat };
        }

        const edges = computeEdges(tracks, 3);
        const linePositions = new Float32Array(edges.length * 6);
        const lineColors = new Float32Array(edges.length * 6);

        for (let e = 0; e < edges.length; e++) {
            const [i, j] = edges[e];
            linePositions[e * 6] = trackPositions[i * 3];
            linePositions[e * 6 + 1] = trackPositions[i * 3 + 1];
            linePositions[e * 6 + 2] = trackPositions[i * 3 + 2];
            linePositions[e * 6 + 3] = trackPositions[j * 3];
            linePositions[e * 6 + 4] = trackPositions[j * 3 + 1];
            linePositions[e * 6 + 5] = trackPositions[j * 3 + 2];

            const ci = getTrackHighlightColor(tracks[i]);
            const cj = getTrackHighlightColor(tracks[j]);
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
            opacity: 0.4,
            blending: THREE.NormalBlending,
        });

        return { lineGeo: geo, lineMat: mat };
    }, [tracks, trackPositions]);

    if (tracks.length === 0) return null;

    return <lineSegments geometry={lineGeo} material={lineMat} />;
}

function WireframePlanets({
    tracks,
    highlightedIds,
    selectedTrackId,
    onTrackClick,
    onTrackHover,
}: {
    tracks: MapTrack[];
    highlightedIds: Set<string>;
    selectedTrackId: string | null;
    onTrackClick: (trackId: string) => void;
    onTrackHover: (track: MapTrack | null, point: THREE.Vector3 | null) => void;
}) {
    const hasHighlights = highlightedIds.size > 0;

    const trackPositions = useMemo(() => {
        const pos = new Float32Array(tracks.length * 3);
        for (let i = 0; i < tracks.length; i++) {
            pos[i * 3] = tracks[i].x * WORLD_SCALE;
            pos[i * 3 + 1] = tracks[i].y * WORLD_SCALE;
            pos[i * 3 + 2] = hashToFloat(tracks[i].id) * WORLD_SCALE * 0.2;
        }
        return pos;
    }, [tracks]);

    const renderData = useMemo((): TrackRenderData[] => {
        return tracks.map((track, _i) => {
            const position: [number, number, number] = [
                track.x * WORLD_SCALE,
                track.y * WORLD_SCALE,
                hashToFloat(track.id) * WORLD_SCALE * 0.2,
            ];
            const baseScale = 2 + (track.energy ?? 0.5) * 5;
            const isSelected = track.id === selectedTrackId;
            const isHighlighted = !hasHighlights || highlightedIds.has(track.id);

            let finalScale: number;
            let wireColor: THREE.Color;

            if (isSelected) {
                finalScale = baseScale * 1.5;
                wireColor = new THREE.Color(1, 1, 1);
            } else if (isHighlighted) {
                finalScale = baseScale;
                wireColor = getTrackHighlightColor(track);
            } else {
                finalScale = baseScale * 0.6;
                const c = getTrackHighlightColor(track);
                wireColor = new THREE.Color(c.r * 0.2, c.g * 0.2, c.b * 0.2);
            }

            return { track, position, baseScale, finalScale, wireColor };
        });
    }, [tracks, highlightedIds, selectedTrackId, hasHighlights]);

    const handleCoreClick = useCallback(
        (e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            if (e.instanceId !== undefined && e.instanceId < tracks.length) {
                onTrackClick(tracks[e.instanceId].id);
            }
        },
        [tracks, onTrackClick]
    );

    const handlePointerOver = useCallback(
        (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            if (e.instanceId !== undefined && e.instanceId < tracks.length) {
                const track = tracks[e.instanceId];
                const point = new THREE.Vector3(
                    track.x * WORLD_SCALE,
                    track.y * WORLD_SCALE,
                    hashToFloat(track.id) * WORLD_SCALE * 0.2
                );
                onTrackHover(track, point);
            }
        },
        [tracks, onTrackHover]
    );

    const handlePointerOut = useCallback(() => {
        onTrackHover(null, null);
    }, [onTrackHover]);

    if (tracks.length === 0) return null;

    return (
        <group>
            <ConnectionLines tracks={tracks} trackPositions={trackPositions} />

            {/* Solid dark cores -- interactive layer */}
            <Instances
                limit={Math.max(tracks.length, 1)}
                onClick={handleCoreClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <icosahedronGeometry args={[1, 1]} />
                <meshBasicMaterial
                    color="#0a0a12"
                    transparent
                    opacity={0.8}
                    depthWrite={false}
                />
                {renderData.map((rd) => (
                    <Instance
                        key={rd.track.id}
                        position={rd.position}
                        scale={rd.finalScale}
                    />
                ))}
            </Instances>

            {/* Wireframe shells -- visual layer */}
            <Instances
                limit={Math.max(tracks.length, 1)}
                raycast={null}
            >
                <icosahedronGeometry args={[1, 1]} />
                <meshBasicMaterial
                    wireframe
                    transparent
                    opacity={1}
                    depthWrite={false}
                />
                {renderData.map((rd) => (
                    <Instance
                        key={rd.track.id}
                        position={rd.position}
                        scale={rd.finalScale}
                        color={rd.wireColor}
                    />
                ))}
            </Instances>
        </group>
    );
}

function SceneContent({
    tracks,
    highlightedIds,
    selectedTrackId,
    is3D,
    isLocked,
    onLockChange,
    onTrackClick,
}: VibeSceneProps & {
    is3D: boolean;
    isLocked: boolean;
    onLockChange: (locked: boolean) => void;
}) {
    const [hoveredTrack, setHoveredTrack] = useState<MapTrack | null>(null);
    const [hoverPosition, setHoverPosition] = useState<THREE.Vector3 | null>(null);

    const handleTrackHover = useCallback(
        (track: MapTrack | null, point: THREE.Vector3 | null) => {
            setHoveredTrack(track);
            setHoverPosition(point);
        },
        []
    );

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
        () =>
            [
                center[0] * WORLD_SCALE,
                center[1] * WORLD_SCALE,
                0,
            ] as const,
        [center]
    );

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

            <TronGridBox worldCenter={worldCenter} />

            <WireframePlanets
                tracks={tracks}
                highlightedIds={highlightedIds}
                selectedTrackId={selectedTrackId}
                onTrackClick={onTrackClick}
                onTrackHover={handleTrackHover}
            />

            {hoveredTrack && hoverPosition && !isLocked && (
                <TrackTooltip track={hoveredTrack} position={hoverPosition} />
            )}
        </>
    );
}

export function WireframePlanetsScene(props: VibeSceneProps) {
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
                onPointerMissed={props.onBackgroundClick}
            >
                <Suspense fallback={null}>
                    <SceneContent
                        {...props}
                        is3D={is3D}
                        isLocked={isLocked}
                        onLockChange={setIsLocked}
                    />
                </Suspense>
            </Canvas>

            {/* Scene label */}
            <div className="absolute top-3 left-3 z-10 text-white/20 text-[10px] tracking-widest uppercase font-medium">
                B: Wireframe Planets
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
                {props.tracks.length} tracks
            </div>
        </div>
    );
}
