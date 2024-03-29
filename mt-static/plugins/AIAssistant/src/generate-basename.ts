import { getTitleElement } from "./util";

let generating = false;

async function generate(content, icon) {
  if (generating) {
    return;
  }
  generating = true;

  const entryFormData = window.DOM.getFormData(
    document.querySelector(`form[method="post"]`)!
  );

  const iconClassName = icon && icon.className;
  if (icon) {
    icon.className = "fas fa-spinner fa-pulse";
  }
  const basenameText = document.querySelector("span.basename-text");
  if (basenameText) {
    basenameText.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
  }
  const submitData = {
    __mode: "ai_assistant_generate_basename",
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
  if (basenameText) {
    basenameText.textContent = basename;
  }
  document.querySelector<HTMLInputElement>("#basename")!.value = basename;

  if (icon) {
    icon.className = iconClassName;
  }

  generating = false;
}

export function init() {
  const basename = document.querySelector<HTMLInputElement>("#basename")!;
  const basenameWrap = document.createElement("div");
  basenameWrap.classList.add("open-ai-input-wrap");

  let icon: HTMLSpanElement | undefined = undefined;

  const initIner = () => {
    basename.parentNode?.insertBefore(basenameWrap, basename);
    const openHint = document
      .querySelector<HTMLTemplateElement>("#plugin-open-ai-open-hint")!
      .content.cloneNode(true) as HTMLElement;
    basenameWrap.appendChild(basename);
    basenameWrap.appendChild(openHint);

    icon = basenameWrap.querySelector("i")!;
    basenameWrap.querySelector("a")!.addEventListener("click", async (ev) => {
      ev.preventDefault();
      await generate(getTitleElement().value, icon);
    });
  };

  const setBasename = document.querySelector("#mt-set-basename");
  if (setBasename) {
    setBasename.addEventListener("click", initIner);
  } else {
    initIner();
  }

  if (!basename.value) {
    function gen() {
      generate(getTitleElement().value, icon);
    }
    const title = getTitleElement();
    title.addEventListener("change", gen);
    basename.addEventListener("input", () =>
      title.removeEventListener("change", gen)
    );
  }
}
