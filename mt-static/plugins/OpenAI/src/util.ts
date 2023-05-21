export function getTitleElement(): HTMLInputElement {
  const dataLabelFieldName = document.querySelector<HTMLMetaElement>(
    "#plugin-open-ai-data-label-field-name"
  )?.content;
  return document.querySelector<HTMLInputElement>(
    `#title, #data_label, input[name="${dataLabelFieldName}"]`
  )!;
}
