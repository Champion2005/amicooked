/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border:     "#30363d",
        input:      "#30363d",
        ring:       "#58a6ff",
        background: {
          DEFAULT: "#0d1117",
          dark:    "#020408",
        },
        foreground: "#f0f6fc",
        primary: {
          DEFAULT:    "#238636",
          hover:      "#2ea043",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT:    "#21262d",
          foreground: "#f0f6fc",
        },
        destructive: {
          DEFAULT:    "#da3633",
          foreground: "#f0f6fc",
        },
        muted: {
          DEFAULT:    "#21262d",
          foreground: "#8b949e",
        },
        accent: {
          DEFAULT:    "#58a6ff",
          hover:      "#79c0ff",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT:    "#161b22",
          foreground: "#f0f6fc",
        },
        card: {
          DEFAULT:    "#161b22",
          foreground: "#f0f6fc",
        },
        surface: "#1c2128",
        track:   "#21262d",
        cat: {
          activity: "#3b82f6",  /* blue-500   */
          skills:   "#a855f7",  /* purple-500 */
          growth:   "#22c55e",  /* green-500  */
          collab:   "#eab308",  /* yellow-500 */
        },
        status: {
          success:  "#22c55e",
          warning:  "#eab308",
          caution:  "#f97316",
          danger:   "#ef4444",
          critical: "#dc2626",
        },
        level: {
          cooking:  "#22c55e",  /* green-500  9-10 */
          toasted:  "#eab308",  /* yellow-500 7-8  */
          cooked:   "#f97316",  /* orange-500 5-6  */
          welldone: "#ef4444",  /* red-500    3-4  */
          burnt:    "#dc2626",  /* red-600    0-2  */
        },
        heatmap: {
          0: "#161b22",
          1: "#0e4429",
          2: "#006d32",
          3: "#26a641",
          4: "#39d353",
        },
        plan: {
          student: {
            bg:     "#1c2d4f",
            border: "#1f4070",
          },
          pro: {
            bg: "#12261e",
          },
          ultimate: {
            bg:     "#2d1e0f",
            accent: "#f97316",
          },
        },
        code: {
          inline: "#f0883e",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "toast-in": {
          from: { opacity: 0, transform: "translateX(100%)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        "toast-out": {
          from: { opacity: 1, transform: "translateX(0)" },
          to: { opacity: 0, transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "toast-in": "toast-in 0.25s ease-out forwards",
        "toast-out": "toast-out 0.25s ease-in forwards",
      },
    },
  },
  plugins: [],
  safelist: [
    // cat colors — applied dynamically via data objects (textColor field)
    "text-cat-activity", "bg-cat-activity",
    "text-cat-skills",   "bg-cat-skills", "bg-cat-skills/60",
    "text-cat-growth",   "bg-cat-growth",
    "text-cat-collab",   "bg-cat-collab",
    // level colors — returned dynamically by getCookedColor()
    "text-level-cooking",  "bg-level-cooking",
    "text-level-toasted",  "bg-level-toasted",
    "text-level-cooked",   "bg-level-cooked",
    "text-level-welldone", "bg-level-welldone",
    "text-level-burnt",    "bg-level-burnt",
    // heatmap
    "bg-heatmap-0", "bg-heatmap-1", "bg-heatmap-2", "bg-heatmap-3", "bg-heatmap-4",
  ],
}
