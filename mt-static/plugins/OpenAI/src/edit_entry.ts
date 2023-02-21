import "../css/edit_entry.scss";

const title = document.querySelector<HTMLInputElement>("#title")!;
const titleWrap = document.createElement("div");
titleWrap.classList.add("open-ai-title-wrap");
title.parentNode?.insertBefore(titleWrap, title);
const openHint = document
  .querySelector<HTMLTemplateElement>("#plugin-open-ai-open-hint")!
  .content.cloneNode(true) as HTMLElement;
titleWrap.appendChild(title);
titleWrap.appendChild(openHint);

titleWrap.querySelector("a")!.addEventListener("click", async (ev) => {
  ev.preventDefault();
  jQuery.fn.mtModal.open(window.StaticURI + "index.html?dialog=1", {
    large: true,
  });

  const modal = document
    .querySelector<HTMLTemplateElement>("#plugin-open-ai-hint-modal")!
    .content.cloneNode(true) as HTMLElement;
  const modalWrap = document.querySelector(".mt-modal .modal-content")!;
  modalWrap.appendChild(modal);
  modalWrap.querySelector("iframe")!.style.display = "none";
  modalWrap.appendChild(modalWrap.querySelector("iframe")!);

  jQuery(window).trigger("pre_autosave");
  await window.MTBlockEditor?.serialize();

  const entryFormData = window.DOM.getFormData(
    document.querySelector(`form[method="post"]`)!
  );
  const textarea = modalWrap.querySelector<HTMLInputElement>("textarea")!;
  textarea.value = (entryFormData.text + "\n" + entryFormData.text_more)
    .replace(/<.*?>/g, "")
    .trim()
    .substring(0, 250);

  modalWrap
    .querySelectorAll(`[data-dismiss="modal"], .mt-close-dialog`)
    .forEach((e) => {
      e.addEventListener("click", () => {
        jQuery.fn.mtModal.close();
      });
    });
  const generateButton =
    modalWrap.querySelector<HTMLButtonElement>(".btn-primary")!;
  generateButton.addEventListener("click", async (ev) => {
    ev.preventDefault();
    generateButton.disabled = true;
    generateButton.classList.add("disabled");

    const result = document.querySelector<HTMLDivElement>(
      "#plugin-open-ai-result"
    )!;
    result.style.display = "";

    const spinner = document.createElement("div");
    spinner.classList.add("plugin-open-ai-spinner");
    spinner.innerHTML = `<i class="fas fa-spinner fa-pulse"></i>`;
    result.parentNode?.insertBefore(spinner, result);

    const submitData = {
      __mode: "open_ai_generate_title",
      magic_token: entryFormData.magic_token,
      content: textarea.value,
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

    spinner.remove();

    const list = result.querySelector("ul")!;
    list.innerHTML = "";
    choices[0].text
      .trim()
      .split("\n")
      .forEach((line) => {
        const li = document.createElement("li");
        li.textContent = line.replace(/\d\.\s*/, "");
        list.appendChild(li);
      });

    result.style.visibility = "";
    modalWrap
      .querySelectorAll<HTMLElement>(`.plugin-open-ai-before-generate`)
      .forEach((e) => {
        e.style.display = "none";
      });
    modalWrap
      .querySelectorAll<HTMLElement>(`.plugin-open-ai-after-generate`)
      .forEach((e) => {
        e.style.display = "";
      });
  });
  jQuery(".mt-modal").one("hidden.bs.modal", () => {
    modalWrap.innerHTML = "";
    const iframe = modalWrap.querySelector("iframe");
    if (iframe) {
      iframe.style.display = "";
    }
  });
});
