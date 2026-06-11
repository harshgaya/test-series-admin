/**
 * Normalizes LaTeX for duplicate comparison.
 * Includes option text to distinguish template questions with different numbers.
 * e.g. "$0.\overline{36}$" and "$0.\overline{63}$" look similar in question text
 * but their options are different - combining them gives correct low similarity.
 */
export function cleanLatexForComparison(questionText, options = []) {
  // Combine question + all options into one string
  const optionTexts = (options || []).map((o) => o.optionText || "").join(" ");
  const combined = (questionText || "") + " " + optionTexts;

  let r = combined;
  r = r.replace(/\$\$([^$]+)\$\$/g, " $1 "); // $$...$$ → keep content
  r = r.replace(/\$([^$]+)\$/g, " $1 "); // $...$ → keep content
  r = r.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, " $1 "); // \cmd{x} → x
  r = r.replace(/\\[a-zA-Z]+/g, " "); // \cmd → space
  r = r.replace(/[\\{}^_$]/g, " "); // remaining LaTeX chars
  r = r.replace(/\s+/g, " ").trim();
  return r.toLowerCase();
}
