"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Prevents slide-up animations from flashing on page load.
 * Re-adds 'preload' class on route changes, then removes it after paint.
 */
export function DisableInitialAnimations() {
    const pathname = usePathname();

    useEffect(() => {
        // Add preload class on route change
        document.body.classList.add("preload");

        // Double RAF ensures removal happens after paint
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.body.classList.remove("preload");
            });
        });
    }, [pathname]);

    return null;
}
