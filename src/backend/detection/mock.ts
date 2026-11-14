// Placeholder predictions used while no API endpoint is configured.

import type { PostData, Prediction } from "../../shared/types";

export async function mockPredict(_post: PostData): Promise<Prediction[]> {
  return [
    {
      category: "PROPAGANDA",
      confidence: 0.89,
      reasons: [
        "Emotionally charged language",
        "Us-vs-them framing",
        "Matches known narrative pattern",
      ],
    },
    {
      category: "PHISHING",
      confidence: 0.74,
      reasons: ["Contains shortened link", "Urgent call to action"],
    },
    {
      category: "MISINFORMATION",
      confidence: 0.31,
      reasons: ["Unverified statistical claim"],
    },
  ];
}
