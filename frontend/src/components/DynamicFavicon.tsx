"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DynamicFavicon() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      let brandColor = "#2563eb"; // default blue

      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.brand_color) {
          brandColor = user.brand_color;
        }
      }

      // Generate SVG favicon with the brand color
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <rect width="100" height="100" rx="20" ry="20" fill="${brandColor}" />
          <text x="50" y="72" font-family="Arial, sans-serif" font-size="75" font-weight="bold" fill="white" text-anchor="middle">P</text>
        </svg>
      `.trim();

      const encodedSvg = btoa(svg);
      const dataUrl = `data:image/svg+xml;base64,${encodedSvg}`;

      // Update or create favicon link
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = dataUrl;
    } catch (error) {
      console.error("Erro ao gerar favicon dinâmico:", error);
    }
  }, [pathname]); // Update on route changes just in case it was reloaded or updated

  return null;
}
