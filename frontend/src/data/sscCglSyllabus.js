// Official SSC CGL syllabus (Tier 1 + Tier 2 Paper I, plus the optional
// Tier 2 Paper II / Paper III papers), grouped by subject so it drops
// straight into the syllabus_topics table via POST /api/syllabus/bulk.
//
// Quantitative Aptitude, Reasoning, English and General Awareness cover
// both Tier 1 and Tier 2 (the topics largely overlap, Tier 2 just goes
// deeper). Computer Knowledge is Tier 2 only (qualifying). Statistics and
// Finance & Economics are optional — only relevant if targeting JSO or
// AAO/AAAO posts respectively — so they're kept as separate subjects
// rather than mixed in.

export const SSC_CGL_SYLLABUS = [
  {
    subject: "Quantitative Aptitude",
    topics: [
      "Number System (Whole Numbers, Decimals, Fractions)",
      "Percentage",
      "Ratio & Proportion",
      "Average",
      "Simple & Compound Interest",
      "Profit & Loss",
      "Discount",
      "Partnership Business",
      "Mixture & Alligation",
      "Time & Work",
      "Time & Distance",
      "Square Roots",
      "Algebra: Basic Identities & Elementary Surds",
      "Graphs of Linear Equations",
      "Triangles & Their Centres",
      "Congruence & Similarity of Triangles",
      "Circles: Chords, Tangents & Angles",
      "Quadrilaterals & Regular Polygons",
      "Mensuration: Triangle, Quadrilateral, Circle",
      "Mensuration: Prism, Cone, Cylinder, Sphere, Hemisphere",
      "Trigonometric Ratios & Standard Identities",
      "Heights & Distances",
      "Histogram, Frequency Polygon, Bar & Pie Chart",
      "Mean, Median, Mode, Standard Deviation",
      "Basic Probability"
    ]
  },
  {
    subject: "Reasoning & General Intelligence",
    topics: [
      "Analogy (Semantic, Symbolic, Number, Figural)",
      "Classification",
      "Series (Number, Semantic, Figural)",
      "Coding-Decoding",
      "Venn Diagrams",
      "Space & Spatial Orientation",
      "Pattern Folding & Embedded Figures",
      "Blood Relations",
      "Direction Sense",
      "Syllogism",
      "Statement & Conclusion",
      "Critical Thinking & Logical Reasoning",
      "Word Building",
      "Problem Solving",
      "Non-Verbal Series",
      "Emotional & Social Intelligence"
    ]
  },
  {
    subject: "English Language & Comprehension",
    topics: [
      "Vocabulary",
      "Grammar & Sentence Structure",
      "Spot the Error",
      "Fill in the Blanks",
      "Synonyms & Antonyms",
      "Spelling Correction",
      "Idioms & Phrases",
      "One Word Substitution",
      "Sentence Improvement",
      "Active & Passive Voice",
      "Direct & Indirect Speech",
      "Sentence & Paragraph Rearrangement",
      "Cloze Test",
      "Reading Comprehension"
    ]
  },
  {
    subject: "General Awareness",
    topics: [
      "History",
      "Culture",
      "Geography (India & World)",
      "Indian Polity & Economy",
      "Science & Technology",
      "Current Affairs",
      "Static GK",
      "Books & Authors",
      "Important Days & Events",
      "Sports",
      "Government Schemes & Policies",
      "People in News",
      "India & Neighbouring Countries"
    ]
  },
  {
    subject: "Computer Knowledge (Tier 2 - Qualifying)",
    topics: [
      "Computer Basics (CPU, I/O Devices, Memory)",
      "Windows & Keyboard Shortcuts",
      "MS Office (Word, Excel, PowerPoint)",
      "Internet & Browsing",
      "Email",
      "Networking Basics",
      "Cyber Security (Viruses, Hacking, Prevention)"
    ]
  },
  {
    subject: "Statistics (Optional - Paper II, JSO posts)",
    topics: [
      "Collection, Classification & Presentation of Data",
      "Measures of Central Tendency",
      "Measures of Dispersion",
      "Moments, Skewness & Kurtosis",
      "Correlation & Regression",
      "Probability Theory",
      "Random Variables & Probability Distribution",
      "Sampling Theory",
      "Statistical Inference (Z-Test, t-Test, Chi-square, F-Test)",
      "Analysis of Variance (ANOVA)",
      "Time Series Analysis",
      "Index Numbers"
    ]
  },
  {
    subject: "Finance & Economics (Optional - Paper III, AAO posts)",
    topics: [
      "Financial Accounting Basics",
      "Journal, Ledger, Trial Balance",
      "Trading, P&L Account & Balance Sheet",
      "Depreciation & Inventory Valuation",
      "Bank Reconciliation Statement",
      "Comptroller & Auditor General (CAG)",
      "Finance Commission",
      "Demand & Supply",
      "Production & Cost",
      "Market Structure",
      "Indian Economy Overview",
      "Money & Banking (RBI, Monetary Policy)",
      "Government Budget & Fiscal Deficit",
      "Economic Reforms (LPG, 1991)"
    ]
  }
];

// Flattened to [{ subject, topic, sortOrder }, ...] for the bulk API call.
export function flattenSscCglSyllabus() {
  const rows = [];
  SSC_CGL_SYLLABUS.forEach(group => {
    group.topics.forEach((topic, i) => {
      rows.push({ subject: group.subject, topic, sortOrder: i });
    });
  });
  return rows;
}
