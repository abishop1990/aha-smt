import { defineConfig } from "@/lib/config";

export default defineConfig({
  points: {
    source: ["original_estimate", "score"],
    scale: [1, 2, 3, 5, 8, 13, 21],
    defaultPerDay: 1,
  },
  sprints: {
    mode: "both",
    defaultView: "iterations",
  },
  workflow: {
    completeMeanings: ["DONE", "SHIPPED"],
  },
  estimation: {
    matrix: {
      "L-L-L": 1,
      "L-L-M": 2,
      "L-M-L": 2,
      "M-L-L": 3,
      "L-L-H": 3,
      "L-M-M": 3,
      "L-H-L": 3,
      "M-L-M": 5,
      "M-M-L": 5,
      "L-M-H": 5,
      "L-H-M": 5,
      "M-L-H": 5,
      "M-M-M": 8,
      "H-L-L": 5,
      "H-L-M": 8,
      "H-M-L": 8,
      "M-H-L": 8,
      "M-M-H": 8,
      "H-L-H": 13,
      "H-M-M": 13,
      "M-H-M": 13,
      "L-H-H": 8,
      "H-M-H": 13,
      "M-H-H": 13,
      "H-H-L": 13,
      "H-H-M": 21,
      "H-H-H": 21,
    },
  },
});
