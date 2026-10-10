import { ImageResponse } from "next/og";
import { DEFAULT_OG_ALT } from "@/lib/seo-config";

export const alt = DEFAULT_OG_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Plain brand card shared by every page. No provider logos or marks. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#1d2127",
        color: "#ffffff",
        padding: 72,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34 }}>
        <div style={{ width: 20, height: 56, background: "#c80530", display: "flex" }} />
        <span style={{ fontWeight: 700 }}>bookyourielts.com</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>IELTS booking in Nepal</div>
        <div style={{ fontSize: 36, color: "#cfd4da" }}>
          Open test dates, fees and seats, in one place
        </div>
      </div>
      <div style={{ fontSize: 24, color: "#9aa3ad" }}>
        Independent booking help. Not affiliated with the British Council or IDP.
      </div>
    </div>,
    size,
  );
}
