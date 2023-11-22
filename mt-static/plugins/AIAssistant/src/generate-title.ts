import { getTitleElement } from "./util";

export function init() {
  const title = getTitleElement();
  const titleWrap = document.createElement("div");
  titleWrap.classList.add("open-ai-input-wrap");
  title.parentNode?.insertBefore(titleWrap, title);
  const openHint = document
    .querySelector<HTMLTemplateElement>("#plugin-open-ai-open-hint")!
    .content.cloneNode(true) as HTMLElement;
  titleWrap.appendChild(title);
  titleWrap.appendChild(openHint);

  let hasRatioClass = false;

  titleWrap.querySelector("a")!.addEventListener("click", async (ev) => {
    ev.preventDefault();
    jQuery.fn.mtModal.open(window.StaticURI + "index.html?dialog=1", {
      large: true,
    });

    const modal = document
      .querySelector<HTMLTemplateElement>("#plugin-open-ai-hint-modal")!
      .content.cloneNode(true) as HTMLElement;
    const modalWrap = document.querySelector<HTMLElement>(
      ".mt-modal .modal-content"
    )!;
    modalWrap.appendChild(modal);
    modalWrap.querySelector("iframe")!.style.display = "none";
    modalWrap.appendChild(modalWrap.querySelector("iframe")!);
    if (modalWrap.classList.contains("ratio")) {
      hasRatioClass = true;
      modalWrap.classList.remove("ratio");
    }
    modalWrap.style.paddingBottom = "";

    jQuery(window).trigger("pre_autosave");
    await window.MTBlockEditor?.serialize();

    const entryFormData = window.DOM.getFormData(
      document.querySelector(`form[method="post"]`)!
    );
    const textarea = modalWrap.querySelector<HTMLInputElement>("textarea")!;
    textarea.value = Object.keys(entryFormData)
      .map((key) => {
        if (key.match(/^(?:text|text_more)$/)) {
          return entryFormData[key];
        } else if (key.match(/^content-field-\d+_convert_breaks$/)) {
          const m = key.match(/^(content-field-(\d+))_convert_breaks$/) || [];
          const cb = entryFormData[key];
          if (cb === "blockeditor") {
            const be = JSON.parse(entryFormData["block_editor_data"])[
              `editor-input-content-field-${m[2]}-blockeditor`
            ] as Record<string, { order: number; html: string }>;
            return Object.values(be)
              .sort((a, b) => a.order - b.order)
              .map((v) => v.html)
              .join("\n");
          } else if (cb === "block_editor") {
            return document.querySelector<HTMLInputElement>(
              `#editor-input-content-field-${m[2]}-mt-be`
            )!.value;
          } else {
            return entryFormData[m[1]];
          }
        } else {
          return undefined;
        }
      })
      .filter((v) => v)
      .join("\n")
      .replace(/<.*?>/g, "")
      .trim()
      .substring(0, textarea.maxLength);
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
    const applySuggestedTitleButton =
      modalWrap.querySelector<HTMLButtonElement>("#apply-suggested-title")!;
    applySuggestedTitleButton.addEventListener("click", () => {
      const value = [
        ...modalWrap.querySelectorAll<HTMLInputElement>(
          `input[name="generated-title"]`
        ),
      ].filter((input) => input.checked)[0].value;
      title.value = value;
      title.dispatchEvent(new Event("change"));
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
          __mode: "ai_assistant_generate_title",
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
        let lines;
        try {
          lines = JSON.parse(choices[0].message.content);
        } catch (e) {
          lines = choices[0].message.content.trim().split("\n");
        }
        lines.forEach((line) => {
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
      if (hasRatioClass) {
        modalWrap.classList.add("ratio");
      }
      const iframe = modalWrap.querySelector("iframe");
      if (iframe) {
        iframe.style.display = "";
      }
    });
  });
}
