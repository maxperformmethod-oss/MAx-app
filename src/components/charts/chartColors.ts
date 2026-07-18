/**
 * Kategorická paleta pre porovnávanie viacerých cvikov v jednom grafe.
 * Poradie je pevné (fixed hue order) a overené nástrojom dataviz skillu
 * (node validate_palette.js) voči tmavému povrchu kariet #1C1B16:
 * lightness band aj chroma floor PASS, CVD adjacent ΔE 8.4 (deutan),
 * normal-vision floor 15.4 (nad hranicou 15), kontrast PASS.
 * Zámerne mimo modrej rodiny farieb (brand konštrukcia MPM).
 */
export const SERIES_COLORS = ['#BD75A7', '#CA4B2B', '#B98D27'] as const

/** Maximálny počet súčasne porovnávaných cvikov – limit daný čitateľnosťou aj paletou. */
export const MAX_COMPARE_EXERCISES = SERIES_COLORS.length
