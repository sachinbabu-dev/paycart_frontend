import { ImageResponse } from "next/og";

// Higher-res version served at /apple-icon.png — used by iOS home-screen
// bookmarks and some legacy tab UIs.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#14100b",
          borderRadius: 40,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 132,
          color: "#fff9ec",
          lineHeight: 1,
        }}
      >
        K
        <div
          style={{
            position: "absolute",
            top: 26,
            right: 26,
            width: 24,
            height: 24,
            borderRadius: 12,
            background: "#d94822",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
