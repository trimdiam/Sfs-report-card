/**
 * config.js — St. Francis De Sales School Report Card System
 * Phase 1: Standalone Browser-Based
 *
 * Contains all class configurations (subjects, mark schemes, aggregates).
 * Kept separate from logic for future Firebase integration.
 */

const CONFIG = {
  // ─────────────────────────────────────────────────────────────────────────────
  // CLASS III
  // ─────────────────────────────────────────────────────────────────────────────
  3: {
    schoolName: "St. Francis De Sales School",
    grandTotalMax: 800,
    markScheme: "standard",
    note: null,
    subjects: [
      { key: "mathematics",      label: "Mathematics",      isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "science",          label: "Science",          isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "social_studies",   label: "Social Studies",   isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "hindi",            label: "Hindi",            isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "spelling",         label: "Spelling",         isAggregate: false, components: [], countInTotal: true,  singleTotal: true  },
      { key: "english_i",        label: "English I",        isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "english_ii",       label: "English II",       isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "khasi_alt_english",label: "Khasi/Alt. English",isAggregate: false, components: [], countInTotal: true,  singleTotal: false }
    ],
    coScholastic: [
      { key: "pe",               label: "P.E." },
      { key: "singing",          label: "Singing" },
      { key: "discipline",       label: "Discipline" },
      { key: "gk",               label: "G.K." },
      { key: "arts_craft",       label: "Arts & Craft" },
      { key: "neatness",         label: "Neatness" },
      { key: "val_edu_catechism",label: "Val. Edu./Catechism" }
    ],
    aggregates: []
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASS IV
  // ─────────────────────────────────────────────────────────────────────────────
  4: {
    schoolName: "St. Francis De Sales School",
    grandTotalMax: 900,
    markScheme: "standard",
    note: null,
    subjects: [
      { key: "mathematics",      label: "Mathematics",      isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "science",          label: "Science",          isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "computer",         label: "Computer",         isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "hindi",            label: "Hindi",            isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "spelling",         label: "Spelling",         isAggregate: false, components: [], countInTotal: true,  singleTotal: true  },
      { key: "english_i",        label: "English I",        isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "english_ii",       label: "English II",       isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "social_studies",   label: "Social Studies",   isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "khasi_alt_english",label: "Khasi/Alt. English",isAggregate: false, components: [], countInTotal: true,  singleTotal: false }
    ],
    coScholastic: [
      { key: "pe",               label: "P.E." },
      { key: "singing",          label: "Singing" },
      { key: "discipline",       label: "Discipline" },
      { key: "gk",               label: "G.K." },
      { key: "arts_craft",       label: "Arts & Craft" },
      { key: "neatness",         label: "Neatness" },
      { key: "val_edu_catechism",label: "Val. Edu./Catechism" }
    ],
    aggregates: []
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASS V
  // ─────────────────────────────────────────────────────────────────────────────
  5: {
    schoolName: "St. Francis De Sales School",
    grandTotalMax: 900,
    markScheme: "standard",
    note: "Computer Practical included in Unit Test column",
    subjects: [
      { key: "mathematics",      label: "Mathematics",      isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "science",          label: "Science",          isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "computer",         label: "Computer",         isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "hindi",            label: "Hindi",            isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "spelling",         label: "Spelling",         isAggregate: false, components: [], countInTotal: true,  singleTotal: true  },
      { key: "english_i",        label: "English I",        isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "english_ii",       label: "English II",       isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "social_studies",   label: "Social Studies",   isAggregate: false, components: [], countInTotal: true,  singleTotal: false },
      { key: "khasi_alt_english",label: "Khasi/Alt. English",isAggregate: false, components: [], countInTotal: true,  singleTotal: false }
    ],
    coScholastic: [
      { key: "pe",               label: "P.E." },
      { key: "singing",          label: "Singing" },
      { key: "discipline",       label: "Discipline" },
      { key: "gk",               label: "G.K." },
      { key: "arts_craft",       label: "Arts & Craft" },
      { key: "neatness",         label: "Neatness" },
      { key: "val_edu_catechism",label: "Val. Edu./Catechism" }
    ],
    aggregates: []
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASS VI
  // ─────────────────────────────────────────────────────────────────────────────
  6: {
    schoolName: "St. Francis De Sales School",
    grandTotalMax: 800,
    markScheme: "standard",
    note: "Computer Practical included in Unit Test column",
    subjects: [
      { key: "mathematics",      label: "Mathematics",           isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "science",          label: "Science",               isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "computer",         label: "Computer",              isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "hindi",            label: "Hindi",                 isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "geography",        label: "Geography",             isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "civics",           label: "Civics",                isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "history",          label: "History",               isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "s_science",        label: "S.Science (G+C+H)",     isAggregate: true,  components: ["geography", "civics", "history"], countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "english_i",        label: "English I",             isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "english_ii",       label: "English II",            isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "english_i_ii",     label: "English (I+II)",        isAggregate: true,  components: ["english_i", "english_ii"],        countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "health_education", label: "Health Education",      isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "khasi_alt_english",label: "Khasi/Alt. English",    isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false }
    ],
    coScholastic: [
      { key: "pe",               label: "P.E." },
      { key: "singing",          label: "Singing" },
      { key: "discipline",       label: "Discipline" },
      { key: "gk",               label: "G.K." },
      { key: "arts_craft",       label: "Arts & Craft" },
      { key: "neatness",         label: "Neatness" },
      { key: "val_edu_catechism",label: "Val. Edu./Catechism" }
    ],
    aggregates: [
      { key: "s_science",    components: ["geography", "civics", "history"] },
      { key: "english_i_ii", components: ["english_i", "english_ii"] }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASS VII
  // ─────────────────────────────────────────────────────────────────────────────
  7: {
    schoolName: "St. Francis De Sales School",
    grandTotalMax: 700,
    markScheme: "standard",
    note: "Computer Practical included in Unit Test column",
    subjects: [
      { key: "mathematics",      label: "Mathematics",           isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "science",          label: "Science",               isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "computer",         label: "Computer",              isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "geography",        label: "Geography",             isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "civics",           label: "Civics",                isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "history",          label: "History",               isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "s_science",        label: "S.Science (G+C+H+E)",   isAggregate: true,  components: ["geography", "civics", "history"], countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "english_i",        label: "English I",             isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "english_ii",       label: "English II",            isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "english_i_ii",     label: "English (I+II)",        isAggregate: true,  components: ["english_i", "english_ii"],        countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "h_education",      label: "H.Education",           isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "khasi_alt_english",label: "Khasi/Alt. English",    isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false }
    ],
    coScholastic: [
      { key: "pe",               label: "P.E." },
      { key: "singing_music",    label: "Singing/Music" },
      { key: "discipline",       label: "Discipline" },
      { key: "gk",               label: "G.K." },
      { key: "arts_craft",       label: "Arts & Craft" },
      { key: "val_edu_catechism",label: "Val. Edu./Catechism" }
    ],
    aggregates: [
      { key: "s_science",    components: ["geography", "civics", "history"] },
      { key: "english_i_ii", components: ["english_i", "english_ii"] }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASS VIII
  // ─────────────────────────────────────────────────────────────────────────────
  8: {
    schoolName: "St. Francis De Sales Sec. School",
    grandTotalMax: 700,
    markScheme: "standard",
    note: "Computer Practical included in Unit Test column",
    subjects: [
      { key: "mathematics",      label: "Mathematics",           isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "science",          label: "Science",               isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "computer",         label: "Computer",              isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "geography",        label: "Geography",             isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "civics",           label: "Civics",                isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "history",          label: "History",               isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "s_science",        label: "S.Science (G+C+H+E)",   isAggregate: true,  components: ["geography", "civics", "history"], countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "english_i",        label: "English I",             isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "english_ii",       label: "English II",            isAggregate: false, components: [],                                 countInTotal: false, singleTotal: false },
      { key: "english_i_ii",     label: "English (I+II)",        isAggregate: true,  components: ["english_i", "english_ii"],        countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "h_education",      label: "H.Education",           isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false },
      { key: "khasi_alt_english",label: "Khasi/Alt. English",    isAggregate: false, components: [],                                 countInTotal: true,  singleTotal: false }
    ],
    coScholastic: [
      { key: "pe",               label: "P.E." },
      { key: "singing_music",    label: "Singing/Music" },
      { key: "discipline",       label: "Discipline" },
      { key: "gk",               label: "G.K." },
      { key: "arts_craft",       label: "Arts & Craft" },
      { key: "val_edu_catechism",label: "Val. Edu./Catechism" }
    ],
    aggregates: [
      { key: "s_science",    components: ["geography", "civics", "history"] },
      { key: "english_i_ii", components: ["english_i", "english_ii"] }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASS IX
  // ─────────────────────────────────────────────────────────────────────────────
  9: {
    schoolName: "St. Francis De Sales School",
    grandTotalMax: 600,
    markScheme: "senior",
    passmark: 30,
    note: null,
    subjects: [
      { key: "mathematics",      label: "Mathematics",           isAggregate: false, components: [],                                                   countInTotal: true,  singleTotal: false },
      { key: "physics",          label: "Physics",               isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "chemistry",        label: "Chemistry",             isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "biology",          label: "Biology",               isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "science_pcb",      label: "Science (P+C+B)",       isAggregate: true,  components: ["physics", "chemistry", "biology"],                  countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "geography",        label: "Geography",             isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "civics",           label: "Civics",                isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "history",          label: "History",               isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "economics",        label: "Economics",             isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "s_science",        label: "S.Science (G+C+H+E)",   isAggregate: true,  components: ["geography", "civics", "history", "economics"],      countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "english_i",        label: "English I",             isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "english_ii",       label: "English II",            isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "english_i_ii",     label: "English (I+II)",        isAggregate: true,  components: ["english_i", "english_ii"],                          countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "h_education",      label: "H.Education",           isAggregate: false, components: [],                                                   countInTotal: true,  singleTotal: false },
      { key: "khasi_alt_english",label: "Khasi/Alt. English",    isAggregate: false, components: [],                                                   countInTotal: true,  singleTotal: false }
    ],
    coScholastic: [
      { key: "val_edu_catechism",label: "Value Edu./Catechism" },
      { key: "handwriting",      label: "Handwriting" },
      { key: "singing",          label: "Singing" },
      { key: "pe",               label: "P.E." },
      { key: "discipline",       label: "Discipline" },
      { key: "supw",             label: "SUPW" }
    ],
    aggregates: [
      { key: "science_pcb",  components: ["physics", "chemistry", "biology"] },
      { key: "s_science",    components: ["geography", "civics", "history", "economics"] },
      { key: "english_i_ii", components: ["english_i", "english_ii"] }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CLASS X
  // ─────────────────────────────────────────────────────────────────────────────
  10: {
    schoolName: "St. Francis De Sales School",
    grandTotalMax: 600,
    markScheme: "senior",
    passmark: 30,
    note: null,
    subjects: [
      { key: "mathematics",      label: "Mathematics",           isAggregate: false, components: [],                                                   countInTotal: true,  singleTotal: false },
      { key: "physics",          label: "Physics",               isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "chemistry",        label: "Chemistry",             isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "biology",          label: "Biology",               isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "science_pcb",      label: "Science (P+C+B)",       isAggregate: true,  components: ["physics", "chemistry", "biology"],                  countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "geography",        label: "Geography",             isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "civics",           label: "Civics",                isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "history",          label: "History",               isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "economics",        label: "Economics",             isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "s_science",        label: "S.Science (G+C+H+E)",   isAggregate: true,  components: ["geography", "civics", "history", "economics"],      countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "english_i",        label: "English I",             isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "english_ii",       label: "English II",            isAggregate: false, components: [],                                                   countInTotal: false, singleTotal: false },
      { key: "english_i_ii",     label: "English (I+II)",        isAggregate: true,  components: ["english_i", "english_ii"],                          countInTotal: true,  singleTotal: false, aggregateMethod: "average" },
      { key: "h_education",      label: "H.Education",           isAggregate: false, components: [],                                                   countInTotal: true,  singleTotal: false },
      { key: "khasi_alt_english",label: "Khasi/Alt. English",    isAggregate: false, components: [],                                                   countInTotal: true,  singleTotal: false }
    ],
    coScholastic: [
      { key: "val_edu_catechism",label: "Value Edu./Catechism" },
      { key: "handwriting",      label: "Handwriting" },
      { key: "singing",          label: "Singing" },
      { key: "pe",               label: "P.E." },
      { key: "discipline",       label: "Discipline" },
      { key: "supw",             label: "SUPW" }
    ],
    aggregates: [
      { key: "science_pcb",  components: ["physics", "chemistry", "biology"] },
      { key: "s_science",    components: ["geography", "civics", "history", "economics"] },
      { key: "english_i_ii", components: ["english_i", "english_ii"] }
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: retrieve configuration for a given class number
// ─────────────────────────────────────────────────────────────────────────────
function getClassConfig(classNum) {
  return CONFIG[classNum] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Development validation — console.log each class config and verify
// subject counts / grandTotalMax values match master-prompt requirements.
// Call validateConfig() in browser console to run.
// ─────────────────────────────────────────────────────────────────────────────
function validateConfig() {
  const expected = {
    3:  { subjects: 8,  grandTotalMax: 800, markScheme: "standard" },
    4:  { subjects: 9,  grandTotalMax: 900, markScheme: "standard" },
    5:  { subjects: 9,  grandTotalMax: 900, markScheme: "standard" },
    6:  { subjects: 13, grandTotalMax: 800, markScheme: "standard" },
    7:  { subjects: 12, grandTotalMax: 700, markScheme: "standard" },
    8:  { subjects: 12, grandTotalMax: 700, markScheme: "standard" },
    9:  { subjects: 15, grandTotalMax: 600, markScheme: "senior"   },
    10: { subjects: 15, grandTotalMax: 600, markScheme: "senior"   }
  };

  console.log("=== CONFIG VALIDATION ===");
  let allPassed = true;

  for (const [cls, exp] of Object.entries(expected)) {
    const cfg = CONFIG[cls];
    if (!cfg) {
      console.error(`Class ${cls}: MISSING config`);
      allPassed = false;
      continue;
    }

    const subjectCount = cfg.subjects.length;
    const countInTotal = cfg.subjects.filter(s => s.countInTotal).length;
    const calculatedMax = countInTotal * 100;

    console.log(`\nClass ${cls} — ${cfg.schoolName}:`);
    console.log(`  Subjects: ${subjectCount} (expected ${exp.subjects})`);
    console.log(`  countInTotal subjects: ${countInTotal} => calc max: ${calculatedMax}`);
    console.log(`  grandTotalMax: ${cfg.grandTotalMax} (expected ${exp.grandTotalMax})`);
    console.log(`  markScheme: ${cfg.markScheme} (expected ${exp.markScheme})`);

    if (subjectCount !== exp.subjects) {
      console.error(`  ❌ Subject count mismatch!`);
      allPassed = false;
    }
    if (cfg.grandTotalMax !== exp.grandTotalMax) {
      console.error(`  ❌ grandTotalMax mismatch!`);
      allPassed = false;
    }
    if (cfg.markScheme !== exp.markScheme) {
      console.error(`  ❌ markScheme mismatch!`);
      allPassed = false;
    }
    if (calculatedMax !== exp.grandTotalMax) {
      console.error(`  ❌ Calculated max (${calculatedMax}) ≠ grandTotalMax (${cfg.grandTotalMax})!`);
      allPassed = false;
    }

    // Validate aggregate definitions
    for (const agg of cfg.aggregates) {
      const aggSubj = cfg.subjects.find(s => s.key === agg.key);
      if (!aggSubj) {
        console.error(`  ❌ Aggregate '${agg.key}' not found in subjects!`);
        allPassed = false;
      } else if (!aggSubj.isAggregate) {
        console.error(`  ❌ Subject '${agg.key}' not marked isAggregate!`);
        allPassed = false;
      }
      for (const comp of agg.components) {
        if (!cfg.subjects.find(s => s.key === comp)) {
          console.error(`  ❌ Component '${comp}' of aggregate '${agg.key}' missing!`);
          allPassed = false;
        }
      }
    }
  }

  console.log(`\n=== VALIDATION ${allPassed ? "PASSED ✅" : "FAILED ❌"} ===`);
  return allPassed;
}

console.log("config.js loaded. Call validateConfig() to verify.");
