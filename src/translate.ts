import translations from "./assets/translations.json"

const lang =
  navigator.languages && navigator.languages.length > 0
    ? navigator.languages[0].substring(0, 2)
    : navigator.language.substring(0, 2)

const translateElements = [
  "tableLabel",
  "greenValue",
  "blueValue",
  "redValue",
  "ballsLabel",
  "spotsAndStripesValue",
  "redAndYellowValue",
  "difficultyLabel",
  "normalValue",
  "hardValue",
]

for (const id of translateElements) {
  const element = document.getElementById(id)
  if (element) {
    element.innerHTML = tr(element.innerHTML)
  } else {
    console.log("Element not found for translation: " + id)
  }
}
export function tr(text: string): string {
  const data = translations as Record<string, Record<string, string>>
  const match = data[text]
  if (match) {
    const result = match[lang]
    if (!result) {
      return text
    }

    return result
  } else {
    console.log("Translation for text '" + text + "' not found")
  }

  return text
}
