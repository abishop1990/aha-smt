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
  backlog: {
    // How to filter features in the estimation/backlog views:
    // - "release": Filter by Aha! releases (default)
    // - "team_location": Filter by the team_location field (Aha! Develop)
    // - "epic": Filter by epic
    // - "tag": Filter by tag
    // - "custom_field": Filter by custom field
    filterType: "release",

    // If filterType is "team_location", specify your Develop product ID here.
    // You can find this in the URL when viewing your product in Aha!
    // Example: https://yourcompany.aha.io/develop/products/DEV → product ID is in the API response
    // teamProductId: "YOUR_DEVELOP_PRODUCT_ID",

    // Exclude certain workflow kinds from estimation (e.g., Bugs, Test Cases).
    // These will not appear in the estimation queue.
    // Example: excludeWorkflowKinds: ["Bug", "Test"],
    // excludeWorkflowKinds: [],
  },
  estimation: {
    // Scoring matrix: keys are "Scope-Complexity-Unknowns" using S/M/L/XL levels.
    // Values are story points. Customize to match your team's calibration.
    matrix: {
      // S scope
      "S-S-S": 1,
      "S-S-M": 2,
      "S-M-S": 2,
      "M-S-S": 3,
      "S-S-L": 3,
      "S-M-M": 3,
      "S-L-S": 3,
      "M-S-M": 5,
      "M-M-S": 5,
      "S-M-L": 5,
      "S-L-M": 5,
      "M-S-L": 5,
      "M-M-M": 8,
      "L-S-S": 5,
      "L-S-M": 8,
      "L-M-S": 8,
      "M-L-S": 8,
      "M-M-L": 8,
      "L-S-L": 13,
      "L-M-M": 13,
      "M-L-M": 13,
      "S-L-L": 8,
      "L-M-L": 13,
      "M-L-L": 13,
      "L-L-S": 13,
      "L-L-M": 21,
      "L-L-L": 21,
      // S scope with XL
      "S-S-XL": 5,
      "S-M-XL": 5,
      "S-L-XL": 8,
      "S-XL-S": 5,
      "S-XL-M": 5,
      "S-XL-L": 8,
      "S-XL-XL": 8,
      // M scope with XL
      "M-S-XL": 8,
      "M-M-XL": 13,
      "M-L-XL": 13,
      "M-XL-S": 8,
      "M-XL-M": 13,
      "M-XL-L": 13,
      "M-XL-XL": 21,
      // L scope with XL
      "L-S-XL": 13,
      "L-M-XL": 21,
      "L-L-XL": 21,
      "L-XL-S": 13,
      "L-XL-M": 21,
      "L-XL-L": 21,
      "L-XL-XL": 21,
      // XL scope
      "XL-S-S": 8,
      "XL-S-M": 13,
      "XL-S-L": 13,
      "XL-S-XL": 21,
      "XL-M-S": 13,
      "XL-M-M": 21,
      "XL-M-L": 21,
      "XL-M-XL": 21,
      "XL-L-S": 21,
      "XL-L-M": 21,
      "XL-L-L": 21,
      "XL-L-XL": 21,
      "XL-XL-S": 21,
      "XL-XL-M": 21,
      "XL-XL-L": 21,
      "XL-XL-XL": 21,
    },
  },
});
