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
  const flavor = modalWrap.querySelector<HTMLInputElement>(
    `select[name="flavor"]`
  )!;

  modalWrap
    .querySelectorAll(`[data-dismiss="modal"], .mt-close-dialog`)
    .forEach((e) => {
      e.addEventListener("click", () => {
        jQuery.fn.mtModal.close();
      });
    });
  const generateButton =
    modalWrap.querySelector<HTMLButtonElement>("#generate-title")!;
  const generateAgainButton = modalWrap.querySelector<HTMLButtonElement>(
    "#generate-title-again"
  )!;
  const applySuggestedTitleButton = modalWrap.querySelector<HTMLButtonElement>(
    "#apply-suggested-title"
  )!;
  applySuggestedTitleButton.addEventListener("click", () => {
    const value = [
      ...modalWrap.querySelectorAll<HTMLInputElement>(
        `input[name="generated-title"]`
      ),
    ].filter((input) => input.checked)[0].value;
    title.value = value;
    jQuery.fn.mtModal.close();
  });
  [generateButton, generateAgainButton].forEach((button) =>
    button.addEventListener("click", async (ev) => {
      ev.preventDefault();
      generateButton.disabled = true;
      generateAgainButton.disabled = true;
      applySuggestedTitleButton.disabled = true;
      applySuggestedTitleButton.classList.add("d-none");

      const result = document.querySelector<HTMLDivElement>(
        "#plugin-open-ai-result"
      )!;
      result.style.display = "";
      result.style.visibility = "hidden";

      const spinner = document.createElement("div");
      spinner.classList.add("plugin-open-ai-spinner");
      spinner.innerHTML = `<i class="fas fa-spinner fa-pulse"></i>`;
      result.parentNode?.insertBefore(spinner, result);

      const submitData = {
        __mode: "open_ai_generate_title",
        magic_token: entryFormData.magic_token,
        content: textarea.value,
        flavor: flavor.value,
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

      const list = result.querySelector(".list-group")!;
      list.innerHTML = "";
      choices[0].message.content
        .trim()
        .split("\n")
        .forEach((line) => {
          const item = document.createElement("label");
          item.className = "list-group-item border-0 pt-0 pb-0";
          line = line
            .replace(/\d\.\s*/, "")
            .replace(/^"(.*)"$/, "$1")
            .replace(/^「(.*)」$/, "$1");
          item.textContent = line;
          const input = document.createElement("input");
          input.type = "radio";
          input.name = "generated-title";
          input.value = line;
          input.addEventListener("click", () => {
            applySuggestedTitleButton.disabled = false;
          });
          input.classList.add("form-check-input");
          item.prepend(input);
          list.appendChild(item);
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

      generateAgainButton.disabled = false;
      applySuggestedTitleButton.classList.remove("d-none");
    })
  );
  jQuery(".mt-modal").one("hidden.bs.modal", () => {
    modalWrap.innerHTML = "";
    const iframe = modalWrap.querySelector("iframe");
    if (iframe) {
      iframe.style.display = "";
    }
  });
});
