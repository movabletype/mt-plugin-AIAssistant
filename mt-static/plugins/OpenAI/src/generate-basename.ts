async function generate(content, icon) {
  const entryFormData = window.DOM.getFormData(
    document.querySelector(`form[method="post"]`)!
  );

  const iconClassName = icon && icon.className;
  if (icon) {
    icon.className = "fas fa-spinner fa-pulse";
  }
  document.querySelector("span.basename-text")!.innerHTML =
    '<i class="fas fa-spinner fa-pulse"></i>';

  const submitData = {
    __mode: "open_ai_generate_basename",
    magic_token: entryFormData.magic_token,
    content,
  };
  const formData = new FormData();
  Object.keys(submitData).forEach((key) => {
    formData.append(key, submitData[key]);
  });
  const {
    result: { choices },
  } = await (
    await fetch(parent.CMSScriptURI, {
      method: "POST",
      body: formData,
    })
  ).json();

  const basename = JSON.parse(choices[0].message.content).basename;
  document.querySelector("span.basename-text")!.textContent = basename;
  document.querySelector<HTMLInputElement>("#basename")!.value = basename;

  if (icon) {
    icon.className = iconClassName;
  }
}

export function init() {
  const basename = document.querySelector<HTMLInputElement>("#basename")!;
  const basenameWrap = document.createElement("div");
  basenameWrap.classList.add("open-ai-input-wrap");

  let icon: HTMLSpanElement | undefined = undefined;

  document.querySelector("#mt-set-basename")?.addEventListener("click", () => {
    basename.parentNode?.insertBefore(basenameWrap, basename);
    const openHint = document
      .querySelector<HTMLTemplateElement>("#plugin-open-ai-open-hint")!
      .content.cloneNode(true) as HTMLElement;
    basenameWrap.appendChild(basename);
    basenameWrap.appendChild(openHint);

    icon = basenameWrap.querySelector("i")!;
    basenameWrap.querySelector("a")!.addEventListener("click", async (ev) => {
      ev.preventDefault();
      await generate(
        document.querySelector<HTMLInputElement>("#title")!.value,
        icon
      );
    });
  });

  if (!basename.value) {
    function gen() {
      generate(document.querySelector<HTMLInputElement>("#title")!.value, icon);
    }
    const title = document.querySelector<HTMLInputElement>("#title")!;
    title.addEventListener("change", gen);
    basename.addEventListener("input", () =>
      title.removeEventListener("change", gen)
    );
  }
}
